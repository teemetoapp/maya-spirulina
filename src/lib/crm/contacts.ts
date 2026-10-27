import prisma from "@/lib/prisma";
import { formatJalaliShort, formatJalaliDateTime } from "@/lib/jalali";
import { ORDER_STATUS_LABELS } from "@/lib/commerce/dto";
import { ALL_PERMISSIONS, isPermission, SUPER_ADMIN_ROLE, AMBASSADOR_ROLE } from "@/lib/rbac/permissions";
import { PROFILE_FIELDS, profileCompleteness } from "./profile-fields";
import { loadInsights, loadInsight, TOPIC_LABELS, CHANNEL_LABELS, SENTIMENT_LABELS, type SegmentKey, type StageKey } from "./insight";

// ==============================================================
// Contacts (CRM). Every person — customer, ambassador or staff — is one
// User row. What they fill in their own profile shows up here directly;
// staff add tags and notes, and the super admin grants or removes
// individual permissions on top of the person's roles.
// ==============================================================

export type ContactKind = "staff" | "ambassador" | "customer" | "lead";

export interface ContactRow {
  id: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  occupation: string;
  kind: ContactKind;
  roleKeys: string[];
  tags: string[];
  orders: number;
  totalSpent: number;
  lastOrderAt: string | null;
  openTickets: number;
  joinedAt: string;
  isActive: boolean;
  chatBlocked: boolean;
  completeness: number;
  segment: SegmentKey;
  leadStage: StageKey | null;
  ownerId: string | null;
  dueFollowUps: number;
  complaints: number;
}

const PAID = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] as const;

function kindOf(roleKeys: string[], orders: number): ContactKind {
  if (roleKeys.some((k) => k !== "customer" && k !== AMBASSADOR_ROLE)) return "staff";
  if (roleKeys.includes(AMBASSADOR_ROLE)) return "ambassador";
  return orders > 0 ? "customer" : "lead";
}

export async function loadContacts(): Promise<{ rows: ContactRow[]; tags: string[] }> {
  const [users, stats, tickets] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 3000,
      include: { roles: { include: { role: { select: { key: true } } } } },
    }),
    prisma.order.groupBy({
      by: ["userId"],
      where: { status: { in: [...PAID] } },
      _count: { _all: true },
      _sum: { totalProductAmount: true, discountAmount: true },
      _max: { createdAt: true },
    }),
    prisma.supportTicket.groupBy({ by: ["userId"], where: { status: { in: ["OPEN", "IN_PROGRESS"] } }, _count: { _all: true } }),
  ]);
  const insights = await loadInsights(users.map((u) => u.id));
  const statMap = new Map(stats.map((s) => [s.userId, s]));
  const ticketMap = new Map(tickets.map((t) => [t.userId, t._count._all]));

  const rows = users.map((u) => {
    const s = statMap.get(u.id);
    const roleKeys = u.roles.map((r) => r.role.key);
    const orders = s?._count._all ?? 0;
    return {
      id: u.id,
      name: u.name ?? "",
      phone: u.phone,
      email: u.email ?? "",
      city: u.city ?? "",
      occupation: u.occupation ?? "",
      kind: kindOf(roleKeys, orders),
      roleKeys,
      tags: u.tags,
      orders,
      totalSpent: (s?._sum.totalProductAmount ?? 0) - (s?._sum.discountAmount ?? 0),
      lastOrderAt: s?._max.createdAt ? formatJalaliShort(s._max.createdAt) : null,
      openTickets: ticketMap.get(u.id) ?? 0,
      joinedAt: formatJalaliShort(u.createdAt),
      isActive: u.isActive,
      chatBlocked: u.chatBlocked,
      completeness: profileCompleteness(u as unknown as Record<string, unknown>),
      segment: insights.get(u.id)!.segment,
      leadStage: u.leadStage,
      ownerId: u.ownerId,
      dueFollowUps: insights.get(u.id)!.dueFollowUps,
      complaints: insights.get(u.id)!.negatives,
    };
  });
  return { rows, tags: [...new Set(users.flatMap((u) => u.tags))].sort() };
}

export async function loadContactDetail(id: string) {
  const u = await prisma.user.findUnique({
    where: { id },
    include: {
      roles: { include: { role: true } },
      wallet: true,
      addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] },
      referredBy: { select: { id: true, name: true, phone: true } },
      owner: { select: { id: true, name: true, phone: true } },
      _count: { select: { referrals: true, referredOrders: true, sampleKits: true } },
    },
  });
  if (!u) return null;

  const [orders, tickets, points, audit, referredSales, interactions, chats, insight] = await Promise.all([
    prisma.order.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, take: 50, include: { items: { select: { productTitle: true, quantity: true } } } }),
    prisma.supportTicket.findMany({
      where: { userId: id },
      orderBy: { updatedAt: "desc" },
      take: 40,
      include: {
        _count: { select: { messages: true } },
        messages: { orderBy: { createdAt: "asc" }, take: 30, include: { author: { select: { name: true } } } },
      },
    }),
    prisma.pointTransaction.aggregate({ where: { userId: id, status: "RELEASED" }, _sum: { points: true } }),
    prisma.auditLog.findMany({
      where: { OR: [{ target: id }, { target: u.phone }, { actorId: id }] },
      orderBy: { createdAt: "desc" },
      take: 15,
      include: { actor: { select: { name: true, phone: true } } },
    }),
    prisma.order.aggregate({ where: { referrerId: id, status: "DELIVERED" }, _sum: { totalProductAmount: true, discountAmount: true, commissionAmount: true } }),
    prisma.contactInteraction.findMany({ where: { contactId: id }, orderBy: { createdAt: "desc" }, take: 80, include: { author: { select: { name: true, phone: true } } } }),
    prisma.liveChat.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { messages: { orderBy: { createdAt: "asc" }, take: 40, include: { author: { select: { name: true } } } } },
    }),
    loadInsight(id),
  ]);

  const roleKeys = u.roles.map((r) => r.role.key);
  const rolePermissions = [...new Set(u.roles.flatMap((r) => r.role.permissions))].filter(isPermission);
  const isSuper = roleKeys.includes(SUPER_ADMIN_ROLE);
  const effective = isSuper
    ? ALL_PERMISSIONS
    : [...new Set([...rolePermissions, ...u.extraPermissions.filter(isPermission)])].filter((p) => !u.revokedPermissions.includes(p));
  const paid = orders.filter((o) => (PAID as readonly string[]).includes(o.status));

  return {
    id: u.id,
    name: u.name ?? "",
    phone: u.phone,
    email: u.email ?? "",
    nationalCode: u.nationalCode ?? "",
    birthDate: u.birthDate ?? "",
    gender: u.gender,
    extra: Object.fromEntries(PROFILE_FIELDS.map((f) => [f.key, (u[f.key] as string | null) ?? ""])) as Record<string, string>,
    profileUpdatedAt: u.profileUpdatedAt ? formatJalaliDateTime(u.profileUpdatedAt) : null,
    completeness: profileCompleteness(u as unknown as Record<string, unknown>),
    joinedAt: formatJalaliDateTime(u.createdAt),
    isActive: u.isActive,
    telegramLinked: !!u.telegramChatId,
    notify: { sms: u.notifySms, telegram: u.notifyTelegram, email: u.notifyEmail },
    kind: kindOf(roleKeys, paid.length),
    roleKeys,
    isSuper,
    rolePermissions,
    extraPermissions: u.extraPermissions,
    revokedPermissions: u.revokedPermissions,
    effectivePermissions: effective,
    tags: u.tags,
    crmNotes: u.crmNotes ?? "",
    chatBlocked: u.chatBlocked,
    chatBlockedAt: u.chatBlockedAt ? formatJalaliDateTime(u.chatBlockedAt) : null,
    referralCode: u.referralCode,
    referredBy: u.referredBy ? { id: u.referredBy.id, name: u.referredBy.name ?? u.referredBy.phone } : null,
    walletBalance: u.wallet?.balance ?? 0,
    points: points._sum.points ?? 0,
    ambassador: roleKeys.includes(AMBASSADOR_ROLE)
      ? {
          tier: u.ambassadorTier ?? "SILVER",
          slug: u.ambassadorSlug,
          referrals: u._count.referrals,
          referredOrders: u._count.referredOrders,
          deliveredSales: (referredSales._sum.totalProductAmount ?? 0) - (referredSales._sum.discountAmount ?? 0),
          commissionEarned: u.wallet?.totalEarned ?? 0,
          sampleKits: u._count.sampleKits,
          sheba: u.shebaNumber ?? "",
        }
      : null,
    stats: {
      orders: paid.length,
      totalSpent: paid.reduce((s, o) => s + o.totalProductAmount - o.discountAmount, 0),
      avgOrder: paid.length ? Math.round(paid.reduce((s, o) => s + o.totalProductAmount - o.discountAmount, 0) / paid.length) : 0,
      lastOrderAt: paid[0] ? formatJalaliShort(paid[0].createdAt) : null,
      openTickets: tickets.filter((t) => t.status === "OPEN" || t.status === "IN_PROGRESS").length,
      avgRating: (() => {
        const r = tickets.filter((t) => t.rating).map((t) => t.rating!);
        return r.length ? Math.round((r.reduce((a, b) => a + b, 0) / r.length) * 10) / 10 : null;
      })(),
    },
    addresses: u.addresses.map((a) => ({ id: a.id, title: a.title, text: `${a.province}، ${a.city}، ${a.address}`, postalCode: a.postalCode, isDefault: a.isDefault })),
    orders: orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      date: formatJalaliShort(o.createdAt),
      status: o.status,
      statusLabel: ORDER_STATUS_LABELS[o.status],
      amount: o.totalProductAmount - o.discountAmount + o.shippingFee,
      items: o.items.map((i) => `${i.productTitle} × ${i.quantity}`).join("، "),
    })),
    tickets: tickets.map((t) => ({
      id: t.id,
      subject: t.subject,
      status: t.status,
      priority: t.priority,
      date: formatJalaliShort(t.createdAt),
      messages: t._count.messages,
      rating: t.rating,
    })),
    insight,
    leadStage: u.leadStage,
    owner: u.owner ? { id: u.owner.id, name: u.owner.name ?? u.owner.phone } : null,
    interactions: interactions.map((x) => ({
      id: x.id,
      channel: x.channel,
      summary: x.summary,
      sentiment: x.sentiment,
      topic: x.topic,
      author: x.author ? x.author.name ?? x.author.phone : "سیستم",
      date: formatJalaliDateTime(x.createdAt),
      followUpAt: x.followUpAt ? formatJalaliDateTime(x.followUpAt) : null,
      followUpOverdue: !!x.followUpAt && !x.followUpDone && x.followUpAt.getTime() < Date.now(),
      followUpDone: x.followUpDone,
    })),
    timeline: buildTimeline(orders, tickets, chats, interactions),
    activity: audit.map((a) => ({
      id: a.id,
      action: a.action,
      actor: a.actor ? a.actor.name ?? a.actor.phone : "سیستم",
      date: formatJalaliDateTime(a.createdAt),
    })),
  };
}
// ---------------------------------------------------------------- unified timeline

export interface TimelineEntry {
  id: string;
  kind: "order" | "ticket" | "consult" | "livechat" | "interaction";
  title: string;
  meta: string;
  date: string;
  atMs: number;
  tone: "neutral" | "positive" | "negative" | "info";
  // گفت‌وگوها: متن پیام‌ها برای خواندن در همان صفحه
  thread?: { staff: boolean; author: string; body: string; at: string }[];
  href?: string;
}

type OrderRow = Awaited<ReturnType<typeof prisma.order.findMany<{ include: { items: { select: { productTitle: true; quantity: true } } } }>>>[number];
type TicketRow = Awaited<
  ReturnType<typeof prisma.supportTicket.findMany<{ include: { _count: { select: { messages: true } }; messages: { include: { author: { select: { name: true } } } } } }>>
>[number];
type ChatRow = Awaited<ReturnType<typeof prisma.liveChat.findMany<{ include: { messages: { include: { author: { select: { name: true } } } } } }>>>[number];
type InteractionRow = Awaited<ReturnType<typeof prisma.contactInteraction.findMany<{ include: { author: { select: { name: true; phone: true } } } }>>>[number];

const rateTone = (r: number | null) => (r === null ? null : r >= 4 ? "positive" : r <= 2 ? "negative" : "neutral");

function buildTimeline(orders: OrderRow[], tickets: TicketRow[], chats: ChatRow[], interactions: InteractionRow[]): TimelineEntry[] {
  const out: TimelineEntry[] = [];
  for (const o of orders)
    out.push({
      id: `o-${o.id}`,
      kind: "order",
      title: `سفارش ${o.orderNumber} · ${ORDER_STATUS_LABELS[o.status]}`,
      meta: o.items.map((i) => `${i.productTitle} × ${i.quantity}`).join("، "),
      date: formatJalaliDateTime(o.createdAt),
      atMs: o.createdAt.getTime(),
      tone: o.status === "CANCELLED" || o.status === "REFUNDED" ? "negative" : "info",
      href: `/portal/orders?q=${o.orderNumber}`,
    });
  for (const t of tickets) {
    const consult = t.kind === "CONSULTATION";
    out.push({
      id: `t-${t.id}`,
      kind: consult ? "consult" : "ticket",
      title: `${consult ? "مشاوره" : "تیکت"}: ${t.subject}`,
      meta: [t.rating ? `رضایت ${t.rating} از ۵` : null, t.ratingComment ? `«${t.ratingComment}»` : null, `${t._count.messages} پیام`].filter(Boolean).join(" · "),
      date: formatJalaliDateTime(t.createdAt),
      atMs: t.createdAt.getTime(),
      tone: rateTone(t.rating) ?? (t.status === "CLOSED" ? "neutral" : "info"),
      thread: t.messages.map((m) => ({ staff: m.isStaff, author: m.author.name ?? (m.isStaff ? "پشتیبان" : "مشتری"), body: m.body, at: formatJalaliDateTime(m.createdAt) })),
      href: consult ? "/portal/consultations" : "/portal/tickets",
    });
  }
  for (const c of chats)
    out.push({
      id: `c-${c.id}`,
      kind: "livechat",
      title: `گفت‌وگوی آنلاین${c.status !== "CLOSED" ? " (باز)" : ""}`,
      meta: [c.rating ? `رضایت ${c.rating} از ۵` : null, c.ratingComment ? `«${c.ratingComment}»` : null, c.guestPhone ? "با شماره واردشده (تأییدنشده)" : null]
        .filter(Boolean)
        .join(" · "),
      date: formatJalaliDateTime(c.createdAt),
      atMs: c.createdAt.getTime(),
      tone: rateTone(c.rating) ?? "info",
      thread: c.messages.map((m) => ({ staff: m.fromStaff, author: m.fromStaff ? m.author?.name ?? "پشتیبان" : "مشتری", body: m.body, at: formatJalaliDateTime(m.createdAt) })),
      href: `/portal/livechat?id=${c.id}`,
    });
  for (const x of interactions)
    out.push({
      id: `i-${x.id}`,
      kind: "interaction",
      title: `${CHANNEL_LABELS[x.channel]} · ${x.author ? x.author.name ?? x.author.phone : "سیستم"}`,
      meta: [x.summary, x.topic ? `موضوع: ${TOPIC_LABELS[x.topic]}` : null, x.sentiment !== "NEUTRAL" ? SENTIMENT_LABELS[x.sentiment] : null].filter(Boolean).join(" · "),
      date: formatJalaliDateTime(x.createdAt),
      atMs: x.createdAt.getTime(),
      tone: x.sentiment === "POSITIVE" ? "positive" : x.sentiment === "NEGATIVE" ? "negative" : "neutral",
    });
  return out.sort((a, b) => b.atMs - a.atMs);
}

// کارکنانی که می‌توانند مسئول ارتباط با مخاطب باشند
export async function loadStaffOptions(): Promise<{ id: string; name: string }[]> {
  const staff = await prisma.user.findMany({
    where: { isActive: true, roles: { some: { role: { key: { notIn: ["customer", AMBASSADOR_ROLE] } } } } },
    select: { id: true, name: true, phone: true },
    orderBy: { name: "asc" },
    take: 200,
  });
  return staff.map((s) => ({ id: s.id, name: s.name ?? s.phone }));
}

export type ContactDetail = NonNullable<Awaited<ReturnType<typeof loadContactDetail>>>;
