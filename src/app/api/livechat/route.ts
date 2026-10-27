import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { ok, fail, readJson, str, int } from "@/lib/api/respond";
import { isModuleEnabled, moduleGuard } from "@/lib/modules/server";
import { notify } from "@/lib/notifications";
import { isValidIranianMobile, normalizeIranianMobile } from "@/lib/validators";
import { LC_COOKIE, TOPIC_LABELS, liveChatHours, messageDTO, type LiveChatTopicKey } from "@/lib/livechat";

// Visitor side of the live chat widget.
//   GET                → state + current conversation (polled every few seconds)
//   POST {action}      → start | message | close | rate

const DAY = 86_400_000;

async function identity() {
  const jar = await cookies();
  const session = await getSession();
  return { key: jar.get(LC_COOKIE)?.value ?? null, userId: session?.id ?? null };
}

// گفت‌وگوی جاری: باز، یا بسته‌شده‌ای که هنوز امتیاز نگرفته (تا ۱ روز)
async function currentChat(key: string | null, userId: string | null) {
  const or = [...(key ? [{ visitorKey: key }] : []), ...(userId ? [{ userId, guestPhone: null }] : [])];
  if (!or.length) return null;
  const chat = await prisma.liveChat.findFirst({
    where: { OR: or, lastMessageAt: { gte: new Date(Date.now() - 2 * DAY) } },
    orderBy: { createdAt: "desc" },
    include: { messages: { orderBy: { createdAt: "asc" }, take: 200, include: { author: { select: { name: true } } } } },
  });
  if (!chat) return null;
  if (chat.status === "CLOSED" && (chat.rating !== null || (chat.closedAt && Date.now() - chat.closedAt.getTime() > DAY))) return null;
  return chat;
}

function chatPayload(chat: NonNullable<Awaited<ReturnType<typeof currentChat>>>) {
  return {
    id: chat.id,
    status: chat.status,
    topic: chat.topic,
    rating: chat.rating,
    messages: chat.messages.map((m) => messageDTO(m)),
  };
}

export async function GET() {
  if (!(await isModuleEnabled("livechat"))) return ok({ enabled: false });
  const { key, userId } = await identity();
  const [hours, chat] = await Promise.all([liveChatHours(), currentChat(key, userId)]);
  return ok({
    enabled: true,
    online: hours.online,
    hours: { start: hours.start, end: hours.end },
    guestsAllowed: hours.guests,
    loggedIn: !!userId,
    topics: TOPIC_LABELS,
    chat: chat ? chatPayload(chat) : null,
  });
}

export async function POST(req: Request) {
  const off = await moduleGuard("livechat");
  if (off) return off;
  const b = await readJson(req);
  const action = str(b.action, 10);
  const { key, userId } = await identity();

  if (action === "start") {
    const body = str(b.body, 2000);
    const topic = (Object.hasOwn(TOPIC_LABELS, str(b.topic, 20)) ? str(b.topic, 20) : "SUPPORT") as LiveChatTopicKey;
    if (!body) return fail("پیام خود را بنویسید.");
    const existing = await currentChat(key, userId);
    if (existing && existing.status !== "CLOSED") return fail("یک گفت‌وگوی باز دارید.");

    let linkedUser = userId;
    let guestName: string | null = null;
    let guestPhone: string | null = null;
    if (!userId) {
      const hours = await liveChatHours();
      if (!hours.guests) return fail("برای گفت‌وگو ابتدا وارد حساب کاربری شوید.", 401);
      guestName = str(b.name, 60);
      const phone = str(b.phone, 20);
      if (!guestName) return fail("نام خود را وارد کنید.");
      if (!isValidIranianMobile(phone)) return fail("شماره موبایل معتبر وارد کنید تا در صورت قطع ارتباط با شما تماس بگیریم.");
      guestPhone = normalizeIranianMobile(phone);
      // اتصال به پرونده مشتری موجود (شماره تأییدنشده؛ در پنل مشخص است)
      linkedUser = (await prisma.user.findUnique({ where: { phone: guestPhone }, select: { id: true } }))?.id ?? null;
      // محدودیت ساده سوءاستفاده: حداکثر ۵ گفت‌وگو با یک شماره در روز
      const today = await prisma.liveChat.count({ where: { guestPhone, createdAt: { gte: new Date(Date.now() - DAY) } } });
      if (today >= 5) return fail("تعداد گفت‌وگوهای امروز این شماره به سقف رسیده است.", 429);
    }

    const visitorKey = key ?? randomBytes(16).toString("hex");
    const chat = await prisma.liveChat.create({
      data: {
        visitorKey,
        userId: linkedUser,
        guestName,
        guestPhone,
        topic,
        page: str(b.page, 200) || null,
        messages: { create: { body, authorId: userId } },
      },
    });
    const res = ok({ id: chat.id });
    if (!key) {
      (res as NextResponse).cookies.set(LC_COOKIE, visitorKey, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 180, secure: process.env.NODE_ENV === "production" });
    }
    const who = guestName ?? (userId ? (await prisma.user.findUnique({ where: { id: userId }, select: { name: true, phone: true } }))?.name : null) ?? "بازدیدکننده";
    await notify("livechat.new", { data: { customer: who, topic: TOPIC_LABELS[topic], message: body.slice(0, 120) } });
    return res;
  }

  const chat = await currentChat(key, userId);
  if (!chat) return fail("گفت‌وگوی فعالی پیدا نشد.", 404);

  if (action === "message") {
    if (chat.status === "CLOSED") return fail("این گفت‌وگو بسته شده است؛ گفت‌وگوی جدید شروع کنید.");
    const body = str(b.body, 2000);
    if (!body) return fail("پیام خالی است.");
    const recent = await prisma.liveChatMessage.count({ where: { chatId: chat.id, fromStaff: false, createdAt: { gte: new Date(Date.now() - 60_000) } } });
    if (recent >= 12) return fail("کمی آهسته‌تر؛ پیام‌های شما به دست پشتیبان رسیده است.", 429);
    const now = new Date();
    await prisma.$transaction([
      prisma.liveChatMessage.create({ data: { chatId: chat.id, body, authorId: userId } }),
      prisma.liveChat.update({ where: { id: chat.id }, data: { lastMessageAt: now } }),
    ]);
    return ok({});
  }

  if (action === "close") {
    if (chat.status !== "CLOSED") await prisma.liveChat.update({ where: { id: chat.id }, data: { status: "CLOSED", closedAt: new Date() } });
    return ok({}, "گفت‌وگو بسته شد.");
  }

  if (action === "rate") {
    const rating = int(b.rating);
    if (rating === null || rating < 1 || rating > 5) return fail("امتیاز باید بین ۱ تا ۵ باشد.");
    await prisma.liveChat.update({
      where: { id: chat.id },
      data: { rating, ratingComment: str(b.comment, 500) || null, status: "CLOSED", closedAt: chat.closedAt ?? new Date() },
    });
    return ok({}, "از بازخورد شما ممنونیم.");
  }

  return fail("درخواست نامعتبر.");
}
