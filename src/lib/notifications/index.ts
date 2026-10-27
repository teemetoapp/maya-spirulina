import prisma from "@/lib/prisma";
import { isModuleEnabled } from "@/lib/modules/server";
import { deliver } from "./channels";
import type { NotificationEvent } from "./events";
import type { NotificationChannel, User } from "@prisma/client";

// ==============================================================
// Central notification service.
//
//   await notify("order.shipped", { userId, data: { orderNumber, trackingCode } });
//
// 1. Active rules of the event decide audience + channel.
// 2. Recipients are resolved (customer, ambassador, role members or a
//    Telegram group) and filtered by each user's channel preferences.
// 3. Each message is written to NotificationLog (QUEUED) and delivered
//    in the background; failed messages are retried by the cron job
//    (/api/cron/notifications) up to MAX_ATTEMPTS times.
// ==============================================================

const MAX_ATTEMPTS = 3;

// پیام‌های تبلیغاتی: فقط به دارندگان رضایت پیامک، از خط تبلیغاتی و همیشه با «لغو۱۱»
export const OPT_OUT_FOOTER = "لغو۱۱";
export const isMarketingEvent = (event: string) => event === "winback.offer" || event.startsWith("campaign");
export function withOptOut(body: string): string {
  return body.includes(OPT_OUT_FOOTER) ? body : `${body}\n${OPT_OUT_FOOTER}`;
}

export interface NotifyContext {
  userId?: string | null; // صاحب رویداد (مشتری)
  ambassadorId?: string | null; // سفیر مرتبط
  data: Record<string, string | number | null | undefined>;
}

export function renderTemplate(template: string, data: NotifyContext["data"]): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key: string) => {
    const value = data[key];
    if (value === null || value === undefined) return "";
    return typeof value === "number" ? value.toLocaleString("fa-IR") : String(value);
  });
}

type Recipient = { address: string; userId: string | null; name: string | null };

function addressFor(
  user: Pick<User, "phone" | "email" | "telegramChatId" | "notifySms" | "notifyEmail" | "notifyTelegram" | "smsConsent" | "smsOptOutAt">,
  channel: NotificationChannel,
  marketing: boolean
): string | null {
  if (channel === "SMS") return user.notifySms && (!marketing || (user.smsConsent && !user.smsOptOutAt)) ? user.phone : null;
  if (channel === "EMAIL") return user.notifyEmail ? user.email : null;
  return user.notifyTelegram ? user.telegramChatId : null;
}

async function resolveRecipients(
  rule: { audience: string; roleKey: string | null; target: string | null; channel: NotificationChannel },
  ctx: NotifyContext,
  marketing: boolean
): Promise<Recipient[]> {
  if (rule.audience === "TELEGRAM_GROUP") {
    const chatId = rule.target || process.env.TELEGRAM_ADMIN_CHAT_ID;
    return rule.channel === "TELEGRAM" && chatId ? [{ address: chatId, userId: null, name: null }] : [];
  }

  let users: User[] = [];
  if (rule.audience === "CUSTOMER" && ctx.userId) {
    users = await prisma.user.findMany({ where: { id: ctx.userId, isActive: true } });
  } else if (rule.audience === "AMBASSADOR" && ctx.ambassadorId) {
    users = await prisma.user.findMany({ where: { id: ctx.ambassadorId, isActive: true } });
  } else if (rule.audience === "ROLE" && rule.roleKey) {
    users = await prisma.user.findMany({
      where: { isActive: true, roles: { some: { role: { key: rule.roleKey } } } },
    });
  }

  return users.flatMap((u) => {
    const address = addressFor(u, rule.channel, marketing);
    return address ? [{ address, userId: u.id, name: u.name }] : [];
  });
}

export async function notify(event: NotificationEvent, ctx: NotifyContext): Promise<void> {
  try {
    // ماژول اعلان‌ها خاموش است: هیچ پیامی صف نمی‌شود
    if (!(await isModuleEnabled("notifications"))) return;
    const rules = await prisma.notificationRule.findMany({ where: { event, isActive: true } });
    if (rules.length === 0) return;

    const templates = await prisma.notificationTemplate.findMany({ where: { event, isActive: true } });
    const queuedIds: string[] = [];

    for (const rule of rules) {
      const template = templates.find((t) => t.channel === rule.channel);
      if (!template) continue;

      for (const r of await resolveRecipients(rule, ctx, isMarketingEvent(event))) {
        const data = { ...ctx.data, name: ctx.data.name ?? r.name ?? "" };
        const log = await prisma.notificationLog.create({
          data: {
            event,
            channel: rule.channel,
            recipient: r.address,
            userId: r.userId,
            subject: template.subject ? renderTemplate(template.subject, data) : null,
            body: isMarketingEvent(event) && rule.channel === "SMS" ? withOptOut(renderTemplate(template.body, data)) : renderTemplate(template.body, data),
          },
        });
        queuedIds.push(log.id);
      }
    }

    // ارسال در پس‌زمینه تا کندی سرویس پیامک روند سفارش را کند نکند
    if (queuedIds.length > 0) void processQueue(queuedIds);
  } catch (err) {
    console.error(`[notify] failed to queue ${event}`, err);
  }
}

/**
 * Sends queued (or previously failed) messages. Called right after notify()
 * and by the cron endpoint for retries.
 */
export async function processQueue(ids?: string[]): Promise<{ sent: number; failed: number }> {
  const logs = await prisma.notificationLog.findMany({
    where: ids
      ? { id: { in: ids }, status: "QUEUED" }
      : { status: { in: ["QUEUED", "FAILED"] }, attempts: { lt: MAX_ATTEMPTS } },
    take: 100,
    orderBy: { createdAt: "asc" },
  });

  let sent = 0;
  let failed = 0;
  for (const log of logs) {
    // دریافت انحصاری پیام تا ارسال هم‌زمان (cron و ارسال فوری) تکراری نشود
    const claimed = await prisma.notificationLog.updateMany({
      where: { id: log.id, status: log.status },
      data: { status: "SENDING" },
    });
    if (claimed.count === 0) continue;

    const result = await deliver(log.channel, log.recipient, log.body, log.subject, isMarketingEvent(log.event));
    await prisma.notificationLog.update({
      where: { id: log.id },
      data: {
        status: result.ok ? "SENT" : "FAILED",
        error: result.ok ? null : result.error?.slice(0, 500),
        attempts: { increment: 1 },
        sentAt: result.ok ? new Date() : null,
      },
    });
    if (result.ok) sent++;
    else failed++;
  }
  return { sent, failed };
}
