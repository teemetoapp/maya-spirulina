import prisma from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { formatJalaliDateTime } from "@/lib/jalali";
import { loadInsight, type Insight } from "@/lib/crm/insight";

// ==============================================================
// Module «livechat» — real-time-ish chat between site visitors and the
// support / consultation team. The widget polls every few seconds; no
// websocket server is needed. A visitor is identified by the maya_lc
// cookie and, when logged in, by their account, so the conversation
// lands in that person's CRM timeline.
// ==============================================================

export const LC_COOKIE = "maya_lc";
export const TOPIC_LABELS = { SUPPORT: "پشتیبانی سفارش", CONSULTATION: "مشاوره تغذیه", SALES: "خرید و راهنمایی محصول" } as const;
export const STATUS_LABELS = { WAITING: "در انتظار پاسخ", ACTIVE: "در حال گفت‌وگو", CLOSED: "بسته‌شده" } as const;
export type LiveChatTopicKey = keyof typeof TOPIC_LABELS;

export interface LiveMessageDTO {
  id: string;
  fromStaff: boolean;
  author: string;
  body: string;
  at: string;
  atMs: number;
}

export async function liveChatHours() {
  const s = await getSettings();
  const start = Math.min(23, Math.max(0, Number(s.LIVECHAT_START_HOUR) || 0));
  const end = Math.min(24, Math.max(1, Number(s.LIVECHAT_END_HOUR) || 24));
  // ساعت تهران
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Tehran", hour: "numeric", hourCycle: "h23" }).format(new Date()));
  return { start, end, online: start < end ? hour >= start && hour < end : hour >= start || hour < end, guests: s.LIVECHAT_GUESTS !== "0" && s.LIVECHAT_GUESTS !== "false" };
}

export function messageDTO(m: { id: string; fromStaff: boolean; body: string; createdAt: Date; author?: { name: string | null } | null }, staffLabel = "پشتیبان مایا"): LiveMessageDTO {
  return {
    id: m.id,
    fromStaff: m.fromStaff,
    author: m.fromStaff ? m.author?.name?.split(" ")[0] ?? staffLabel : "شما",
    body: m.body,
    at: formatJalaliDateTime(m.createdAt),
    atMs: m.createdAt.getTime(),
  };
}

// ---------------------------------------------------------------- staff side

export interface LiveChatRow {
  id: string;
  name: string;
  phone: string;
  userId: string | null;
  topic: LiveChatTopicKey;
  status: keyof typeof STATUS_LABELS;
  assignee: string | null;
  assigneeId: string | null;
  last: string;
  lastAt: string;
  lastAtMs: number;
  waitingForStaff: boolean;
  rating: number | null;
  page: string | null;
}

export interface LiveChatDetail extends LiveChatRow {
  messages: (LiveMessageDTO & { authorFull: string })[];
  ratingComment: string | null;
  verified: boolean; // گفت‌وگو از حساب واردشده شروع شده یا فقط شماره وارد شده
  contact: null | {
    id: string;
    name: string;
    phone: string;
    city: string;
    roles: string[];
    tags: string[];
    crmNotes: string;
    insight: Insight;
    recentOrders: { orderNumber: string; date: string; status: string; amount: number }[];
    openTickets: { id: string; subject: string; kind: string }[];
  };
}

export async function loadLiveChats(scope: "all" | "consultation", meId: string, selectedId: string | null) {
  const topicFilter = scope === "consultation" ? { topic: "CONSULTATION" as const } : {};
  const since = new Date(Date.now() - 3 * 86_400_000);
  const chats = await prisma.liveChat.findMany({
    where: { ...topicFilter, OR: [{ status: { not: "CLOSED" } }, { lastMessageAt: { gte: since } }] },
    orderBy: [{ status: "asc" }, { lastMessageAt: "desc" }],
    take: 120,
    include: {
      user: { select: { name: true, phone: true } },
      assignee: { select: { name: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  const rows: LiveChatRow[] = chats.map((c) => ({
    id: c.id,
    name: c.user?.name ?? c.guestName ?? "بازدیدکننده",
    phone: c.user?.phone ?? c.guestPhone ?? "",
    userId: c.userId,
    topic: c.topic,
    status: c.status,
    assignee: c.assignee?.name ?? null,
    assigneeId: c.assigneeId,
    last: c.messages[0]?.body.slice(0, 80) ?? "",
    lastAt: formatJalaliDateTime(c.lastMessageAt),
    lastAtMs: c.lastMessageAt.getTime(),
    waitingForStaff: c.status !== "CLOSED" && !!c.messages[0] && !c.messages[0].fromStaff,
    rating: c.rating,
    page: c.page,
  }));

  let selected: LiveChatDetail | null = null;
  const pick = selectedId ? rows.find((r) => r.id === selectedId) : null;
  if (pick) selected = await loadLiveChatDetail(pick);
  return {
    rows,
    selected,
    meId,
    stats: {
      waiting: rows.filter((r) => r.waitingForStaff).length,
      active: rows.filter((r) => r.status !== "CLOSED").length,
      mine: rows.filter((r) => r.assigneeId === meId && r.status !== "CLOSED").length,
    },
  };
}

async function loadLiveChatDetail(row: LiveChatRow): Promise<LiveChatDetail> {
  const chat = await prisma.liveChat.findUniqueOrThrow({
    where: { id: row.id },
    include: { messages: { orderBy: { createdAt: "asc" }, take: 300, include: { author: { select: { name: true } } } } },
  });
  let contact: LiveChatDetail["contact"] = null;
  if (chat.userId) {
    const [u, insight, orders, tickets] = await Promise.all([
      prisma.user.findUnique({ where: { id: chat.userId }, include: { roles: { include: { role: { select: { name: true } } } } } }),
      loadInsight(chat.userId),
      prisma.order.findMany({ where: { userId: chat.userId }, orderBy: { createdAt: "desc" }, take: 4 }),
      prisma.supportTicket.findMany({ where: { userId: chat.userId, status: { in: ["OPEN", "IN_PROGRESS"] } }, take: 5, orderBy: { updatedAt: "desc" } }),
    ]);
    if (u)
      contact = {
        id: u.id,
        name: u.name ?? "",
        phone: u.phone,
        city: [u.province, u.city].filter(Boolean).join("، "),
        roles: u.roles.map((r) => r.role.name),
        tags: u.tags,
        crmNotes: u.crmNotes ?? "",
        insight,
        recentOrders: orders.map((o) => ({
          orderNumber: o.orderNumber,
          date: formatJalaliDateTime(o.createdAt).split(" ")[0],
          status: o.status,
          amount: o.totalProductAmount - o.discountAmount + o.shippingFee,
        })),
        openTickets: tickets.map((t) => ({ id: t.id, subject: t.subject, kind: t.kind })),
      };
  }
  return {
    ...row,
    ratingComment: chat.ratingComment,
    verified: !chat.guestPhone && !!chat.userId,
    messages: chat.messages.map((m) => ({ ...messageDTO(m), author: m.fromStaff ? m.author?.name ?? "پشتیبان" : row.name, authorFull: m.author?.name ?? "" })),
    contact,
  };
}
