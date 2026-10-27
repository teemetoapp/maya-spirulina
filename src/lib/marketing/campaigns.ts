import { randomBytes } from "crypto";
import prisma from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { getModuleStates } from "@/lib/modules/server";
import { notify, processQueue, renderTemplate, withOptOut } from "@/lib/notifications";
import { loadInsights, SEGMENT_LABELS, type SegmentKey } from "@/lib/crm/insight";
import { toJalali } from "@/lib/jalali";
import { toPersianDigits } from "@/lib/currency";
import type { Prisma } from "@prisma/client";

// ==============================================================
// Marketing SMS. Only people who opted in (smsConsent, not opted out,
// SMS notifications on) are ever targeted; every message ends with
// «لغو۱۱» and goes out on the marketing line (see notifications).
// ==============================================================

const DAY = 86_400_000;
const MAX_RECIPIENTS = 5000;

export const AUDIENCES: Record<string, string> = {
  all: "همه مشتریان دارای رضایت",
  ...Object.fromEntries(Object.entries(SEGMENT_LABELS).map(([k, v]) => [`seg:${k}`, `بخش CRM: ${v}`])),
  ambassadors: "سفیران برند",
  coaches: "مربیان (برچسب یا شغل «مربی»)",
  birthday: "متولدین ماه جاری",
};

const consented: Prisma.UserWhereInput = { isActive: true, smsConsent: true, smsOptOutAt: null, notifySms: true };

export async function audienceUsers(audience: string): Promise<{ id: string; phone: string; name: string | null }[]> {
  const select = { id: true, phone: true, name: true, birthDate: true } as const;
  let where: Prisma.UserWhereInput = consented;
  if (audience === "ambassadors") where = { ...consented, roles: { some: { role: { permissions: { has: "portal.ambassador" } } } } };
  else if (audience === "coaches") where = { ...consented, OR: [{ tags: { has: "مربی" } }, { occupation: { contains: "مربی" } }] };
  else if (audience !== "all" && audience !== "birthday" && !audience.startsWith("seg:")) return [];

  let users = await prisma.user.findMany({ where, select, take: MAX_RECIPIENTS * 2 });
  if (audience === "birthday") {
    const month = String(toJalali(new Date()).jm).padStart(2, "0");
    users = users.filter((u) => u.birthDate?.replace(/[-.]/g, "/").split("/")[1]?.padStart(2, "0") === month);
  }
  if (audience.startsWith("seg:")) {
    const seg = audience.slice(4) as SegmentKey;
    const insights = await loadInsights(users.map((u) => u.id));
    users = users.filter((u) => insights.get(u.id)?.segment === seg);
  }
  return users.slice(0, MAX_RECIPIENTS);
}

export async function sendCampaign(input: { title: string; body: string; audience: string; actorId: string }) {
  const users = await audienceUsers(input.audience);
  const campaign = await prisma.smsCampaign.create({
    data: { title: input.title, body: input.body, segment: AUDIENCES[input.audience] ?? input.audience, recipients: users.length, createdById: input.actorId },
  });
  if (users.length) {
    await prisma.notificationLog.createMany({
      data: users.map((u) => ({
        event: `campaign:${campaign.id}`,
        channel: "SMS" as const,
        recipient: u.phone,
        userId: u.id,
        body: withOptOut(renderTemplate(input.body, { name: u.name ?? "" })),
      })),
    });
    // ارسال در پس‌زمینه؛ باقی‌مانده را cron هر چند دقیقه ادامه می‌دهد
    void processQueue();
  }
  return campaign;
}

/**
 * Win-back: customers whose last paid order is older than CRM_AT_RISK_DAYS
 * get one SMS with a single-use discount code, at most every WINBACK_REPEAT_DAYS.
 */
export async function sendWinbacks(): Promise<number> {
  const modules = await getModuleStates();
  if (!modules.campaigns || !modules.notifications) return 0;
  const s = await getSettings();
  if (s.WINBACK_ENABLED !== "1") return 0;
  const riskDays = Math.max(7, Number(s.CRM_AT_RISK_DAYS) || 90);
  const discount = modules.coupons ? Number(s.WINBACK_DISCOUNT_PERCENT) || 0 : 0;
  const validDays = Number(s.WINBACK_COUPON_DAYS) || 14;
  const repeat = Number(s.WINBACK_REPEAT_DAYS) || 90;
  // بدون کد تخفیف (ماژول کوپن خاموش یا درصد صفر) پیامکی فرستاده نمی‌شود
  if (discount <= 0) return 0;
  const now = Date.now();
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

  const candidates = await prisma.user.findMany({
    where: {
      ...consented,
      OR: [{ winbackSentAt: null }, { winbackSentAt: { lt: new Date(now - repeat * DAY) } }],
      orders: {
        some: { status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] } },
        none: { createdAt: { gte: new Date(now - riskDays * DAY) }, status: { notIn: ["CANCELLED"] } },
      },
    },
    select: { id: true },
    take: 100,
  });

  let sent = 0;
  for (const u of candidates) {
    const claimed = await prisma.user.updateMany({
      where: { id: u.id, OR: [{ winbackSentAt: null }, { winbackSentAt: { lt: new Date(now - repeat * DAY) } }] },
      data: { winbackSentAt: new Date() },
    });
    if (!claimed.count) continue;
    const code = `WINBACK-${randomBytes(3).toString("hex").toUpperCase()}`;
    await prisma.coupon.create({
      data: { code, description: "بازگشت مشتری غیرفعال", type: "PERCENT", value: discount, maxUses: 1, expiresAt: new Date(now + validDays * DAY) },
    });
    await notify("winback.offer", {
      userId: u.id,
      data: { discount: toPersianDigits(discount), coupon: code, days: toPersianDigits(validDays), link: `${appUrl}/checkout?coupon=${code}` },
    });
    sent++;
  }
  return sent;
}

// نظرسنجی بعد از تحویل (پیامک خدماتی درباره سفارش خود مشتری)
export async function sendReviewRequests(): Promise<number> {
  const modules = await getModuleStates();
  if (!modules.reviews) return 0;
  const days = Number((await getSettings()).REVIEW_REQUEST_DAYS) || 5;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const due = await prisma.order.findMany({
    where: {
      status: "DELIVERED",
      reviewRequestedAt: null,
      review: { is: null },
      deliveredAt: { lte: new Date(Date.now() - days * DAY), gte: new Date(Date.now() - (days + 30) * DAY) },
    },
    select: { id: true, userId: true, orderNumber: true },
    take: 200,
  });
  for (const o of due) {
    const claimed = await prisma.order.updateMany({ where: { id: o.id, reviewRequestedAt: null }, data: { reviewRequestedAt: new Date() } });
    if (!claimed.count) continue;
    await notify("review.request", {
      userId: o.userId,
      data: { orderNumber: o.orderNumber, link: `${appUrl}/portal/my-orders?review=${encodeURIComponent(o.orderNumber)}` },
    });
  }
  return due.length;
}

// ---------------------------------------------------------------- views

export interface CampaignsData {
  audiences: { key: string; label: string }[];
  consent: { consented: number; optedOut: number; customers: number };
  winback: { enabled: boolean; sent30: number; used: number };
  campaigns: { id: string; title: string; body: string; segment: string; recipients: number; sent: number; failed: number; at: string }[];
}

export async function loadCampaigns(): Promise<CampaignsData> {
  const s = await getSettings();
  const since30 = new Date(Date.now() - 30 * DAY);
  const [consentedCount, optedOut, customers, sent30, used, list] = await Promise.all([
    prisma.user.count({ where: consented }),
    prisma.user.count({ where: { smsOptOutAt: { not: null } } }),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { winbackSentAt: { gte: since30 } } }),
    prisma.order.count({ where: { couponCode: { startsWith: "WINBACK-" }, status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] } } }),
    prisma.smsCampaign.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
  ]);
  const stats = list.length
    ? await prisma.notificationLog.groupBy({ by: ["event", "status"], where: { event: { in: list.map((c) => `campaign:${c.id}`) } }, _count: { _all: true } })
    : [];
  const count = (id: string, st: string[]) => stats.filter((r) => r.event === `campaign:${id}` && st.includes(r.status)).reduce((t, r) => t + r._count._all, 0);
  return {
    audiences: Object.entries(AUDIENCES).map(([key, label]) => ({ key, label })),
    consent: { consented: consentedCount, optedOut, customers },
    winback: { enabled: s.WINBACK_ENABLED === "1", sent30, used },
    campaigns: list.map((c) => ({
      id: c.id,
      title: c.title,
      body: c.body,
      segment: c.segment,
      recipients: c.recipients,
      sent: count(c.id, ["SENT"]),
      failed: count(c.id, ["FAILED"]),
      at: c.createdAt.toISOString(),
    })),
  };
}
