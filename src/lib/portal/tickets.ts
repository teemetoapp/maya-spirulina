import prisma from "@/lib/prisma";
import { formatJalaliDateTime } from "@/lib/jalali";
import { SUPER_ADMIN_ROLE } from "@/lib/rbac/permissions";

export type TicketStatusKey = "OPEN" | "IN_PROGRESS" | "ANSWERED" | "CLOSED";
export type TicketPriorityKey = "LOW" | "NORMAL" | "HIGH" | "URGENT";
export type TicketKindKey = "SUPPORT" | "CONSULTATION";

export interface TicketDTO {
  id: string;
  kind: TicketKindKey;
  subject: string;
  status: TicketStatusKey;
  priority: TicketPriorityKey;
  createdAt: string;
  updatedAt: string;
  ageHours: number; // از زمان ثبت
  customerId: string;
  customerName: string;
  customerPhone: string;
  orderNumber: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  firstResponseMinutes: number | null;
  rating: number | null;
  ratingComment: string | null;
  messages: { id: string; body: string; isStaff: boolean; authorName: string; createdAt: string }[];
}

export interface TicketStats {
  open: number;
  avgFirstResponseMinutes: number | null; // ۳۰ روز اخیر
  avgResolutionHours: number | null; // ۳۰ روز اخیر
  satisfaction: number | null; // میانگین ۱ تا ۵
  ratedCount: number;
  ratingDistribution: number[]; // تعداد امتیازهای ۱..۵
  respondedWithinDay: number | null; // درصد تیکت‌هایی که زیر ۲۴ ساعت پاسخ گرفتند
}

const MIN = 60_000;

/**
 * kind: SUPPORT (default) or CONSULTATION — the two never mix, so support
 * staff do not see health questions and consultants do not see support.
 * agentId: only tickets assigned to this agent or not assigned yet.
 */
export async function loadTickets(filter: { userId?: string; kind?: TicketKindKey; agentId?: string }): Promise<TicketDTO[]> {
  const kind = filter.kind ?? "SUPPORT";
  const tickets = await prisma.supportTicket.findMany({
    where: {
      kind,
      ...(filter.userId ? { userId: filter.userId } : {}),
      ...(filter.agentId ? { OR: [{ assigneeId: filter.agentId }, { assigneeId: null }] } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 300,
    include: {
      user: { select: { name: true, phone: true } },
      assignee: { select: { name: true, phone: true } },
      messages: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true } } } },
    },
  });
  const orderIds = tickets.map((t) => t.orderId).filter((x): x is string => !!x);
  const orders = orderIds.length
    ? await prisma.order.findMany({ where: { id: { in: orderIds } }, select: { id: true, orderNumber: true } })
    : [];
  const orderMap = new Map(orders.map((o) => [o.id, o.orderNumber]));
  const now = Date.now();

  return tickets.map((t) => ({
    id: t.id,
    kind: t.kind,
    subject: t.subject,
    status: t.status,
    priority: t.priority,
    createdAt: formatJalaliDateTime(t.createdAt),
    updatedAt: formatJalaliDateTime(t.updatedAt),
    ageHours: Math.round((now - t.createdAt.getTime()) / (60 * MIN)),
    customerId: t.userId,
    customerName: t.user.name ?? "بدون نام",
    customerPhone: t.user.phone,
    orderNumber: t.orderId ? orderMap.get(t.orderId) ?? null : null,
    assigneeId: t.assigneeId,
    assigneeName: t.assignee ? t.assignee.name ?? t.assignee.phone : null,
    firstResponseMinutes: t.firstResponseAt ? Math.round((t.firstResponseAt.getTime() - t.createdAt.getTime()) / MIN) : null,
    rating: t.rating,
    ratingComment: t.ratingComment,
    messages: t.messages.map((m) => ({
      id: m.id,
      body: m.body,
      isStaff: m.isStaff,
      authorName: m.isStaff
        ? `${kind === "CONSULTATION" ? "مشاور تغذیه مایا" : "پشتیبانی مایا"}${m.author.name ? ` (${m.author.name})` : ""}`
        : m.author.name ?? "مشتری",
      createdAt: formatJalaliDateTime(m.createdAt),
    })),
  }));
}

export async function loadTicketStats(kind: TicketKindKey = "SUPPORT", agentId?: string): Promise<TicketStats> {
  const since = new Date(Date.now() - 30 * 24 * 60 * MIN);
  const scope = { kind, ...(agentId ? { OR: [{ assigneeId: agentId }, { assigneeId: null }] } : {}) };
  const [open, recent, rated] = await Promise.all([
    prisma.supportTicket.count({ where: { ...scope, status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.supportTicket.findMany({
      where: { ...scope, createdAt: { gte: since } },
      select: { createdAt: true, firstResponseAt: true, closedAt: true },
    }),
    prisma.supportTicket.findMany({ where: { ...scope, rating: { not: null } }, select: { rating: true } }),
  ]);
  const responded = recent.filter((t) => t.firstResponseAt);
  const closed = recent.filter((t) => t.closedAt);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
  const firstResponses = responded.map((t) => (t.firstResponseAt!.getTime() - t.createdAt.getTime()) / MIN);
  const distribution = [1, 2, 3, 4, 5].map((n) => rated.filter((r) => r.rating === n).length);
  const sat = avg(rated.map((r) => r.rating!));

  return {
    open,
    avgFirstResponseMinutes: firstResponses.length ? Math.round(avg(firstResponses)!) : null,
    avgResolutionHours: closed.length ? Math.round(avg(closed.map((t) => (t.closedAt!.getTime() - t.createdAt.getTime()) / (60 * MIN)))! * 10) / 10 : null,
    satisfaction: sat === null ? null : Math.round(sat * 10) / 10,
    ratedCount: rated.length,
    ratingDistribution: distribution,
    respondedWithinDay: responded.length ? Math.round((firstResponses.filter((m) => m <= 24 * 60).length / responded.length) * 100) : null,
  };
}

// کارکنانی که می‌توان تیکت را به آن‌ها ارجاع داد
// برای مشاوره: مشاوران تغذیه (portal.consultant)
export async function loadTicketAgents(kind: TicketKindKey = "SUPPORT"): Promise<{ id: string; name: string }[]> {
  const perm = kind === "CONSULTATION" ? "portal.consultant" : "tickets.manage";
  const roles = await prisma.role.findMany({
    where: { OR: [{ permissions: { has: perm } }, ...(kind === "SUPPORT" ? [{ key: SUPER_ADMIN_ROLE }] : [])] },
    select: { id: true },
  });
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      OR: [{ roles: { some: { roleId: { in: roles.map((r) => r.id) } } } }, { extraPermissions: { has: perm } }],
    },
    select: { id: true, name: true, phone: true },
    take: 100,
  });
  return users.map((u) => ({ id: u.id, name: u.name ?? u.phone }));
}
