import { requireApi, logAudit } from "@/lib/rbac/server";
import { ok, fail, readJson, str } from "@/lib/api/respond";
import prisma from "@/lib/prisma";
import { NOTIFICATION_EVENTS } from "@/lib/notifications/events";
import { deliver } from "@/lib/notifications/channels";
import { processQueue } from "@/lib/notifications";
import type { NotificationAudience, NotificationChannel } from "@prisma/client";

const CHANNELS: NotificationChannel[] = ["SMS", "TELEGRAM", "EMAIL"];
const AUDIENCES: NotificationAudience[] = ["CUSTOMER", "AMBASSADOR", "ROLE", "TELEGRAM_GROUP"];
const isEvent = (e: string) => NOTIFICATION_EVENTS.some((x) => x.key === e);

export async function POST(req: Request) {
  const auth = await requireApi("notifications.manage");
  if (auth instanceof Response) return auth;
  const b = await readJson(req);
  const channel = str(b.channel, 10) as NotificationChannel;

  switch (b.kind) {
    case "template": {
      const event = str(b.event, 60);
      const body = str(b.body, 2000);
      if (!isEvent(event) || !CHANNELS.includes(channel)) return fail("رویداد یا کانال نامعتبر است.");
      if (!body) return fail("متن قالب خالی است.");
      await prisma.notificationTemplate.upsert({
        where: { event_channel: { event, channel } },
        update: { body, subject: str(b.subject, 200) || null, isActive: true },
        create: { event, channel, body, subject: str(b.subject, 200) || null },
      });
      await logAudit(auth.userId, "notification.template", `${event}/${channel}`);
      return ok({}, "قالب ذخیره شد.");
    }
    case "rule": {
      const event = str(b.event, 60);
      const audience = str(b.audience, 20) as NotificationAudience;
      if (!isEvent(event) || !CHANNELS.includes(channel) || !AUDIENCES.includes(audience)) return fail("قانون نامعتبر است.");
      if (audience === "ROLE" && !(await prisma.role.findUnique({ where: { key: str(b.roleKey, 30) } }))) return fail("نقش انتخاب نشده است.");
      if (audience === "TELEGRAM_GROUP" && channel !== "TELEGRAM") return fail("گروه تلگرام فقط با کانال تلگرام کار می‌کند.");
      await prisma.notificationRule.create({
        data: {
          event,
          channel,
          audience,
          roleKey: audience === "ROLE" ? str(b.roleKey, 30) : null,
          target: audience === "TELEGRAM_GROUP" ? str(b.target, 40) || null : null,
        },
      });
      await logAudit(auth.userId, "notification.rule.create", event, { channel, audience });
      return ok({}, "قانون اعلان اضافه شد.");
    }
    case "test": {
      const recipient = str(b.recipient, 120);
      if (!CHANNELS.includes(channel) || !recipient) return fail("کانال و گیرنده را وارد کنید.");
      const result = await deliver(channel, recipient, "پیام آزمایشی سامانه اعلان اسپیرولینا مایا ✅", "پیام آزمایشی مایا");
      return result.ok ? ok({}, "پیام آزمایشی ارسال شد.") : fail(result.error || "ارسال ناموفق بود.");
    }
    case "retry": {
      const r = await processQueue();
      return ok({}, `${r.sent} پیام ارسال شد، ${r.failed} پیام ناموفق ماند.`);
    }
  }
  return fail("درخواست نامعتبر است.");
}

export async function PATCH(req: Request) {
  const auth = await requireApi("notifications.manage");
  if (auth instanceof Response) return auth;
  const b = await readJson(req);
  const id = str(b.id, 40);
  if (b.kind === "template") {
    await prisma.notificationTemplate.update({
      where: { id },
      data: {
        ...(typeof b.body === "string" ? { body: str(b.body, 2000) } : {}),
        ...(typeof b.subject === "string" ? { subject: str(b.subject, 200) || null } : {}),
        ...(typeof b.isActive === "boolean" ? { isActive: b.isActive } : {}),
      },
    });
  } else if (b.kind === "rule") {
    await prisma.notificationRule.update({ where: { id }, data: { isActive: b.isActive === true } });
  } else {
    return fail("درخواست نامعتبر است.");
  }
  await logAudit(auth.userId, `notification.${b.kind}.update`, id);
  return ok({}, "ذخیره شد.");
}

export async function DELETE(req: Request) {
  const auth = await requireApi("notifications.manage");
  if (auth instanceof Response) return auth;
  const id = str((await readJson(req)).id, 40);
  await prisma.notificationRule.delete({ where: { id } });
  await logAudit(auth.userId, "notification.rule.delete", id);
  return ok({}, "قانون حذف شد.");
}
