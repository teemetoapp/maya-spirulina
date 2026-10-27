import prisma from "@/lib/prisma";
import { formatJalaliDateTime } from "@/lib/jalali";
import { loadInsights, CHANNEL_LABELS, TOPIC_LABELS, type SegmentKey } from "./insight";

// ==============================================================
// «پیگیری‌ها» — every follow-up reminder set while logging a contact,
// plus system suggestions: dissatisfied and at-risk people that nobody
// is following up yet.
// ==============================================================

export interface FollowUpRow {
  id: string;
  contactId: string;
  contact: string;
  phone: string;
  channel: string;
  topic: string | null;
  summary: string;
  author: string;
  owner: string | null;
  mine: boolean;
  dueAt: string;
  dueMs: number;
  overdue: boolean;
}

export interface Suggestion {
  contactId: string;
  name: string;
  phone: string;
  segment: SegmentKey;
  reason: string;
  owner: string | null;
}

export async function loadFollowUps(meId: string) {
  const now = Date.now();
  const rows = await prisma.contactInteraction.findMany({
    where: { followUpAt: { not: null }, followUpDone: false },
    orderBy: { followUpAt: "asc" },
    take: 500,
    include: {
      contact: { select: { id: true, name: true, phone: true, ownerId: true, owner: { select: { name: true, phone: true } } } },
      author: { select: { name: true, phone: true } },
    },
  });
  const list: FollowUpRow[] = rows.map((r) => ({
    id: r.id,
    contactId: r.contactId,
    contact: r.contact.name ?? "بدون نام",
    phone: r.contact.phone,
    channel: CHANNEL_LABELS[r.channel],
    topic: r.topic ? TOPIC_LABELS[r.topic] : null,
    summary: r.summary,
    author: r.author ? r.author.name ?? r.author.phone : "—",
    owner: r.contact.owner ? r.contact.owner.name ?? r.contact.owner.phone : null,
    mine: r.authorId === meId || r.contact.ownerId === meId,
    dueAt: formatJalaliDateTime(r.followUpAt!),
    dueMs: r.followUpAt!.getTime(),
    overdue: r.followUpAt!.getTime() < now,
  }));

  // پیشنهاد سیستم: ناراضی‌ها و در خطر ریزش‌هایی که پیگیری بازی ندارند
  const followed = new Set(rows.map((r) => r.contactId));
  const candidates = await prisma.user.findMany({
    where: { isActive: true, orders: { some: {} }, id: { notIn: [...followed] } },
    select: { id: true, name: true, phone: true, owner: { select: { name: true, phone: true } } },
    take: 2000,
  });
  const insights = await loadInsights(candidates.map((c) => c.id));
  const suggestions: Suggestion[] = candidates
    .map((c) => ({ c, i: insights.get(c.id)! }))
    .filter(({ i }) => i.segment === "dissatisfied" || i.segment === "at_risk")
    .sort((a, b) => (a.i.segment === b.i.segment ? b.i.totalSpent - a.i.totalSpent : a.i.segment === "dissatisfied" ? -1 : 1))
    .slice(0, 30)
    .map(({ c, i }) => ({
      contactId: c.id,
      name: c.name ?? "بدون نام",
      phone: c.phone,
      segment: i.segment,
      reason:
        i.segment === "dissatisfied"
          ? `نارضایتی: ${i.complaints.map((x) => x.label).join("، ") || "امتیاز پایین"}`
          : `${i.daysSinceOrder} روز بدون خرید · ${i.orders} سفارش قبلی`,
      owner: c.owner ? c.owner.name ?? c.owner.phone : null,
    }));

  return {
    rows: list,
    suggestions,
    stats: {
      overdue: list.filter((r) => r.overdue).length,
      today: list.filter((r) => !r.overdue && r.dueMs < now + 86_400_000).length,
      mine: list.filter((r) => r.mine).length,
    },
  };
}
export type FollowUpsData = Awaited<ReturnType<typeof loadFollowUps>>;
