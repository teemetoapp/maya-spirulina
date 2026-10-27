import prisma from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { formatJalaliShort } from "@/lib/jalali";

// ==============================================================
// CRM insight — one place that turns a person's orders, tickets,
// live chats and logged interactions into a segment and a
// satisfaction picture. Used by the contacts list, the 360° contact
// page and the card beside every live chat, so whoever contacts the
// person sees the same thing.
// ==============================================================

export const SEGMENT_LABELS = {
  lead: "سرنخ (بدون خرید)",
  new: "مشتری تازه",
  active: "مشتری فعال",
  loyal: "وفادار",
  promoter: "مروج و راضی",
  at_risk: "در خطر ریزش",
  dissatisfied: "ناراضی",
} as const;
export type SegmentKey = keyof typeof SEGMENT_LABELS;

export const SEGMENT_BADGE: Record<SegmentKey, string> = {
  lead: "badge-status-neutral",
  new: "badge-status-info",
  active: "badge-status-info",
  loyal: "badge-status-success",
  promoter: "badge-status-success",
  at_risk: "badge-status-warning",
  dissatisfied: "badge-status-danger",
};

export const TOPIC_LABELS = {
  PRODUCT: "کیفیت محصول",
  SHIPPING: "ارسال و تحویل",
  SETTLEMENT: "تسویه و پورسانت",
  PRICE: "قیمت",
  SUPPORT: "پشتیبانی",
  CONSULTATION: "مشاوره",
  WEBSITE: "سایت و پرداخت",
  OTHER: "سایر",
} as const;
export type TopicKey = keyof typeof TOPIC_LABELS;

export const SENTIMENT_LABELS = { POSITIVE: "راضی", NEUTRAL: "خنثی", NEGATIVE: "ناراضی" } as const;
export const CHANNEL_LABELS = {
  CALL: "تماس تلفنی",
  SMS: "پیامک",
  WHATSAPP: "واتساپ",
  TELEGRAM: "تلگرام",
  EMAIL: "ایمیل",
  VISIT: "حضوری",
  NOTE: "یادداشت داخلی",
} as const;
export const STAGE_LABELS = {
  NEW: "جدید",
  CONTACTED: "تماس گرفته شد",
  INTERESTED: "علاقه‌مند",
  CUSTOMER: "مشتری",
  LOYAL: "عضو وفادار",
  AT_RISK: "در خطر",
  LOST: "از دست رفته",
} as const;
export type StageKey = keyof typeof STAGE_LABELS;

export interface Insight {
  segment: SegmentKey;
  orders: number;
  totalSpent: number;
  lastOrderAt: string | null;
  daysSinceOrder: number | null;
  openTickets: number;
  avgRating: number | null;
  ratings: number;
  // موضوعات نارضایتی ۹۰ روز اخیر (از تماس‌های ثبت‌شده و امتیازهای پایین)
  complaints: { topic: TopicKey; label: string; count: number; last: string }[];
  praises: number;
  negatives: number;
  dueFollowUps: number;
}

const PAID = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] as const;
const DAY = 86_400_000;

function emptyInsight(): Insight {
  return {
    segment: "lead",
    orders: 0,
    totalSpent: 0,
    lastOrderAt: null,
    daysSinceOrder: null,
    openTickets: 0,
    avgRating: null,
    ratings: 0,
    complaints: [],
    praises: 0,
    negatives: 0,
    dueFollowUps: 0,
  };
}

export async function loadInsights(userIds: string[]): Promise<Map<string, Insight>> {
  const out = new Map<string, Insight>();
  if (!userIds.length) return out;
  const ids = [...new Set(userIds)];
  const now = Date.now();
  const since90 = new Date(now - 90 * DAY);
  const settings = await getSettings();
  const atRiskDays = Math.max(7, Number(settings.CRM_AT_RISK_DAYS) || 90);

  const [orders, openTickets, ratedTickets, ratedChats, interactions, followUps, reviews] = await Promise.all([
    prisma.order.groupBy({
      by: ["userId"],
      where: { userId: { in: ids }, status: { in: [...PAID] } },
      _count: { _all: true },
      _sum: { totalProductAmount: true, discountAmount: true },
      _max: { createdAt: true },
    }),
    prisma.supportTicket.groupBy({ by: ["userId"], where: { userId: { in: ids }, status: { in: ["OPEN", "IN_PROGRESS"] } }, _count: { _all: true } }),
    prisma.supportTicket.findMany({
      where: { userId: { in: ids }, rating: { not: null } },
      select: { userId: true, rating: true, kind: true, closedAt: true, updatedAt: true },
    }),
    prisma.liveChat.findMany({
      where: { userId: { in: ids }, rating: { not: null } },
      select: { userId: true, rating: true, topic: true, closedAt: true, lastMessageAt: true },
    }),
    prisma.contactInteraction.findMany({
      where: { contactId: { in: ids }, createdAt: { gte: since90 }, sentiment: { not: "NEUTRAL" } },
      select: { contactId: true, sentiment: true, topic: true, createdAt: true },
    }),
    prisma.contactInteraction.groupBy({
      by: ["contactId"],
      where: { contactId: { in: ids }, followUpDone: false, followUpAt: { lte: new Date(now + DAY) } },
      _count: { _all: true },
    }),
    prisma.review.findMany({ where: { userId: { in: ids } }, select: { userId: true, rating: true, createdAt: true } }),
  ]);

  for (const id of ids) out.set(id, emptyInsight());

  for (const o of orders) {
    const i = out.get(o.userId)!;
    i.orders = o._count._all;
    i.totalSpent = (o._sum.totalProductAmount ?? 0) - (o._sum.discountAmount ?? 0);
    if (o._max.createdAt) {
      i.lastOrderAt = formatJalaliShort(o._max.createdAt);
      i.daysSinceOrder = Math.floor((now - o._max.createdAt.getTime()) / DAY);
    }
  }
  for (const t of openTickets) out.get(t.userId)!.openTickets = t._count._all;
  for (const f of followUps) out.get(f.contactId)!.dueFollowUps = f._count._all;

  // امتیازها: تیکت‌ها و چت‌ها
  const complaintMap = new Map<string, Map<TopicKey, { count: number; at: Date }>>();
  const addComplaint = (uid: string, topic: TopicKey, at: Date) => {
    const m = complaintMap.get(uid) ?? new Map();
    const c = m.get(topic) ?? { count: 0, at };
    c.count++;
    if (at > c.at) c.at = at;
    m.set(topic, c);
    complaintMap.set(uid, m);
  };
  // آخرین نشانه رضایت/نارضایتی هر شخص (تازه‌ترین بازخورد مهم‌تر است)
  const lastSignal = new Map<string, { at: Date; negative: boolean }>();
  const signal = (uid: string, at: Date, negative: boolean) => {
    const cur = lastSignal.get(uid);
    if (!cur || at > cur.at) lastSignal.set(uid, { at, negative });
  };
  const ratingSum = new Map<string, { sum: number; n: number; fives: number }>();
  const rate = (uid: string, r: number) => {
    const s = ratingSum.get(uid) ?? { sum: 0, n: 0, fives: 0 };
    s.sum += r;
    s.n++;
    if (r === 5) s.fives++;
    ratingSum.set(uid, s);
  };
  for (const t of ratedTickets) {
    rate(t.userId, t.rating!);
    const at = t.closedAt ?? t.updatedAt;
    if (t.rating! <= 2 || t.rating! >= 4) signal(t.userId, at, t.rating! <= 2);
    if (t.rating! <= 2 && at >= since90) {
      addComplaint(t.userId, t.kind === "CONSULTATION" ? "CONSULTATION" : "SUPPORT", at);
      out.get(t.userId)!.negatives++;
    }
  }
  for (const c of ratedChats) {
    if (!c.userId) continue;
    rate(c.userId, c.rating!);
    const at = c.closedAt ?? c.lastMessageAt;
    if (c.rating! <= 2 || c.rating! >= 4) signal(c.userId, at, c.rating! <= 2);
    if (c.rating! <= 2 && at >= since90) {
      addComplaint(c.userId, c.topic === "CONSULTATION" ? "CONSULTATION" : "SUPPORT", at);
      out.get(c.userId)!.negatives++;
    }
  }
  // نظرسنجی بعد از تحویل
  for (const r of reviews) {
    rate(r.userId, r.rating);
    if (r.rating <= 2 || r.rating >= 4) signal(r.userId, r.createdAt, r.rating <= 2);
    if (r.rating <= 2 && r.createdAt >= since90) {
      addComplaint(r.userId, "PRODUCT", r.createdAt);
      out.get(r.userId)!.negatives++;
    }
  }
  for (const x of interactions) {
    const i = out.get(x.contactId)!;
    signal(x.contactId, x.createdAt, x.sentiment === "NEGATIVE");
    if (x.sentiment === "NEGATIVE") {
      i.negatives++;
      addComplaint(x.contactId, (x.topic ?? "OTHER") as TopicKey, x.createdAt);
    } else i.praises++;
  }

  for (const [uid, i] of out) {
    const r = ratingSum.get(uid);
    if (r) {
      i.ratings = r.n;
      i.avgRating = Math.round((r.sum / r.n) * 10) / 10;
      i.praises += r.fives;
    }
    const cm = complaintMap.get(uid);
    if (cm)
      i.complaints = [...cm.entries()]
        .map(([topic, c]) => ({ topic, label: TOPIC_LABELS[topic], count: c.count, last: formatJalaliShort(c.at) }))
        .sort((a, b) => b.count - a.count);

    // ترتیب اولویت: ناراضی > در خطر ریزش > مروج/وفادار > فعال/تازه > سرنخ
    const last = lastSignal.get(uid);
    const recentNegative = !!last && last.negative && last.at.getTime() >= since90.getTime();
    if (i.negatives > 0 && (recentNegative || i.negatives > i.praises)) i.segment = "dissatisfied";
    else if (i.orders > 0 && (i.daysSinceOrder ?? 0) > atRiskDays) i.segment = "at_risk";
    else if (i.orders >= 2 && i.praises > 0 && (i.avgRating ?? 5) >= 4.5) i.segment = "promoter";
    else if (i.orders >= 3) i.segment = "loyal";
    else if (i.orders === 2) i.segment = "active";
    else if (i.orders === 1) i.segment = "new";
    else i.segment = "lead";
  }
  return out;
}

export async function loadInsight(userId: string): Promise<Insight> {
  return (await loadInsights([userId])).get(userId) ?? emptyInsight();
}
