import { requireApi, hasPermission, logAudit } from "@/lib/rbac/server";
import { ok, fail, readJson, str } from "@/lib/api/respond";
import prisma from "@/lib/prisma";
import { moduleGuard } from "@/lib/modules/server";
import { loadLiveChats, TOPIC_LABELS } from "@/lib/livechat";

// Staff side of the live chat. Support (livechat.answer) sees every
// conversation; a consultant without it sees consultation chats only.

async function guard() {
  const off = await moduleGuard("livechat");
  if (off) return off;
  const auth = await requireApi("livechat.answer", "portal.consultant");
  if (auth instanceof Response) return auth;
  return { auth, scope: hasPermission(auth, "livechat.answer") ? ("all" as const) : ("consultation" as const) };
}

// برای به‌روزرسانی زنده صندوق (polling)
export async function GET(req: Request) {
  const g = await guard();
  if (g instanceof Response) return g;
  const id = new URL(req.url).searchParams.get("id");
  return ok(await loadLiveChats(g.scope, g.auth.userId, id));
}

export async function POST(req: Request) {
  const g = await guard();
  if (g instanceof Response) return g;
  const { auth, scope } = g;
  const b = await readJson(req);
  const chat = await prisma.liveChat.findUnique({ where: { id: str(b.id, 40) } });
  if (!chat || (scope === "consultation" && chat.topic !== "CONSULTATION")) return fail("گفت‌وگو پیدا نشد.", 404);
  const action = str(b.action, 12);
  const now = new Date();

  if (action === "reply") {
    const body = str(b.body, 4000);
    if (!body) return fail("متن پاسخ خالی است.");
    if (chat.status === "CLOSED") return fail("این گفت‌وگو بسته شده است.");
    await prisma.$transaction([
      prisma.liveChatMessage.create({ data: { chatId: chat.id, body, fromStaff: true, authorId: auth.userId } }),
      prisma.liveChat.update({
        where: { id: chat.id },
        data: { status: "ACTIVE", lastMessageAt: now, firstReplyAt: chat.firstReplyAt ?? now, assigneeId: chat.assigneeId ?? auth.userId },
      }),
    ]);
    return ok({});
  }
  if (action === "assign") {
    // «به من بسپار» یا واگذاری به همکار
    const to = str(b.assigneeId, 40) || auth.userId;
    await prisma.liveChat.update({ where: { id: chat.id }, data: { assigneeId: to } });
    return ok({}, "مسئول گفت‌وگو تعیین شد.");
  }
  if (action === "topic") {
    const topic = str(b.topic, 20);
    if (!Object.hasOwn(TOPIC_LABELS, topic) || scope === "consultation") return fail("موضوع نامعتبر است.");
    await prisma.liveChat.update({ where: { id: chat.id }, data: { topic: topic as keyof typeof TOPIC_LABELS } });
    return ok({}, `گفت‌وگو به «${TOPIC_LABELS[topic as keyof typeof TOPIC_LABELS]}» منتقل شد.`);
  }
  if (action === "close") {
    await prisma.liveChat.update({ where: { id: chat.id }, data: { status: "CLOSED", closedAt: now } });
    await logAudit(auth.userId, "livechat.close", chat.userId ?? chat.guestPhone ?? chat.id);
    return ok({}, "گفت‌وگو بسته شد؛ از بازدیدکننده امتیاز خواسته می‌شود.");
  }
  if (action === "ticket") {
    // تبدیل به تیکت برای پیگیری بعدی (فقط برای کاربران ثبت‌نام‌شده)
    if (!chat.userId) return fail("بازدیدکننده حساب کاربری ندارد؛ از «ثبت تماس» در پرونده استفاده کنید.");
    const msgs = await prisma.liveChatMessage.findMany({ where: { chatId: chat.id }, orderBy: { createdAt: "asc" }, take: 60 });
    const transcript = msgs.map((m) => `${m.fromStaff ? "پشتیبان" : "مشتری"}: ${m.body}`).join("\n");
    const t = await prisma.supportTicket.create({
      data: {
        userId: chat.userId,
        subject: str(b.subject, 120) || `پیگیری گفت‌وگوی آنلاین (${TOPIC_LABELS[chat.topic]})`,
        kind: chat.topic === "CONSULTATION" ? "CONSULTATION" : "SUPPORT",
        assigneeId: auth.userId,
        messages: { create: { authorId: auth.userId, isStaff: true, body: `متن گفت‌وگوی آنلاین:\n${transcript}`.slice(0, 8000) } },
      },
    });
    return ok({ ticketId: t.id }, "تیکت پیگیری ساخته شد.");
  }
  return fail("درخواست نامعتبر.");
}
