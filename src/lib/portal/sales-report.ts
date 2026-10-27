import prisma from "@/lib/prisma";
import { STAGE_LABELS, type StageKey } from "@/lib/crm/insight";

// ==============================================================
// «فروش از کجا آمد» و قیف فروش — همه از سفارش‌ها و کاربران واقعی.
// فروش = جمع کالا منهای تخفیف سفارش‌های پرداخت‌شده (بدون لغو و مرجوعی).
// ==============================================================

const DAY = 86_400_000;
const PAID = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] as const;

export interface SalesRow {
  key: string;
  label: string;
  orders: number;
  revenue: number;
}

export interface SalesReport {
  days: number;
  totals: { orders: number; revenue: number };
  byChannel: SalesRow[];
  byUtm: SalesRow[];
  byAmbassador: SalesRow[];
  byCoupon: SalesRow[];
  funnel: { label: string; count: number }[];
  stages: { label: string; count: number }[];
  satisfaction: { avg: number | null; count: number; low: number };
  campaigns: { id: string; title: string; segment: string; recipients: number; at: string }[];
}

const net = (s: { _sum: { totalProductAmount: number | null; discountAmount: number | null } }) =>
  (s._sum.totalProductAmount ?? 0) - (s._sum.discountAmount ?? 0);

export async function loadSalesReport(days: number): Promise<SalesReport> {
  const since = new Date(Date.now() - days * DAY);
  const paidWhere = { status: { in: [...PAID] }, createdAt: { gte: since } };
  const sum = { totalProductAmount: true, discountAmount: true } as const;

  const [total, channels, utms, ambassadors, coupons, users, stages, rating, low, campaigns] = await Promise.all([
    prisma.order.aggregate({ where: paidWhere, _count: { _all: true }, _sum: sum }),
    prisma.order.groupBy({ by: ["salesChannel"], where: paidWhere, _count: { _all: true }, _sum: sum }),
    prisma.order.groupBy({ by: ["utmSource", "utmCampaign"], where: { ...paidWhere, utmSource: { not: null } }, _count: { _all: true }, _sum: sum }),
    prisma.order.groupBy({ by: ["referrerId"], where: { ...paidWhere, referrerId: { not: null } }, _count: { _all: true }, _sum: sum }),
    prisma.order.groupBy({ by: ["couponCode"], where: { ...paidWhere, couponCode: { not: null } }, _count: { _all: true }, _sum: sum }),
    prisma.user.findMany({
      where: { createdAt: { gte: since }, roles: { some: { role: { key: "customer" } } } },
      select: { orders: { select: { status: true } } },
    }),
    prisma.user.groupBy({ by: ["leadStage"], where: { leadStage: { not: null } }, _count: { _all: true } }),
    prisma.review.aggregate({ where: { createdAt: { gte: since } }, _avg: { rating: true }, _count: { _all: true } }),
    prisma.review.count({ where: { createdAt: { gte: since }, rating: { lte: 2 } } }),
    prisma.smsCampaign.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
  ]);

  const names = new Map(
    (await prisma.user.findMany({ where: { id: { in: ambassadors.map((a) => a.referrerId!) } }, select: { id: true, name: true, phone: true } })).map((u) => [
      u.id,
      u.name ?? u.phone,
    ])
  );
  const CHANNELS: Record<string, string> = {
    WHOLESALE: "همکاران عمده",
    AMBASSADOR: "سفیران",
    REFILL: "یادآوری تمدید",
    WINBACK: "پیامک بازگشت مشتری",
    COUPON: "کد تخفیف",
    UTM: "تبلیغات (لینک utm)",
    DIRECT: "مستقیم",
  };
  const rows = <T,>(list: T[], key: (r: T) => string, label: (r: T) => string, s: (r: T) => { _count: { _all: number }; _sum: { totalProductAmount: number | null; discountAmount: number | null } }) =>
    list
      .map((r) => ({ key: key(r), label: label(r), orders: s(r)._count._all, revenue: net(s(r)) }))
      .sort((a, b) => b.revenue - a.revenue);

  const paidStatuses = new Set<string>(PAID);
  const funnel = [
    { label: "ثبت‌نام", count: users.length },
    { label: "شروع خرید (هر سفارش)", count: users.filter((u) => u.orders.length > 0).length },
    { label: "پرداخت", count: users.filter((u) => u.orders.some((o) => paidStatuses.has(o.status))).length },
    { label: "تحویل", count: users.filter((u) => u.orders.some((o) => o.status === "DELIVERED")).length },
    { label: "خرید دوباره", count: users.filter((u) => u.orders.filter((o) => paidStatuses.has(o.status)).length >= 2).length },
  ];

  return {
    days,
    totals: { orders: total._count._all, revenue: net(total) },
    byChannel: rows(channels, (r) => r.salesChannel ?? "OLD", (r) => (r.salesChannel ? (CHANNELS[r.salesChannel] ?? r.salesChannel) : "ثبت‌نشده (سفارش‌های قدیمی)"), (r) => r),
    byUtm: rows(utms, (r) => `${r.utmSource}|${r.utmCampaign}`, (r) => `${r.utmSource}${r.utmCampaign ? ` / ${r.utmCampaign}` : ""}`, (r) => r).slice(0, 15),
    byAmbassador: rows(ambassadors, (r) => r.referrerId!, (r) => names.get(r.referrerId!) ?? "—", (r) => r).slice(0, 10),
    byCoupon: rows(coupons, (r) => r.couponCode!, (r) => r.couponCode!, (r) => r).slice(0, 10),
    funnel,
    stages: (Object.keys(STAGE_LABELS) as StageKey[]).map((k) => ({ label: STAGE_LABELS[k], count: stages.find((s) => s.leadStage === k)?._count._all ?? 0 })),
    satisfaction: { avg: rating._avg.rating ? Math.round(rating._avg.rating * 10) / 10 : null, count: rating._count._all, low },
    campaigns: campaigns.map((c) => ({ id: c.id, title: c.title, segment: c.segment, recipients: c.recipients, at: c.createdAt.toISOString() })),
  };
}
