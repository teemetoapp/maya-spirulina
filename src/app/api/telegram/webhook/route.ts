import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { consumeTelegramLinkToken } from "@/lib/notifications/telegram-link";
import { sendTelegram } from "@/lib/notifications/channels";

// ==============================================================
// Telegram bot webhook. Register once with:
//   https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<site>/api/telegram/webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>
// The customer opens t.me/<bot>?start=<token> from «پروفایل و اعلان‌ها»;
// the token links their Telegram chat to their account.
// ==============================================================

interface TelegramUpdate {
  message?: { chat: { id: number; type: string }; text?: string };
}

export async function POST(req: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!secret || req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const update = (await req.json().catch(() => ({}))) as TelegramUpdate;
  const msg = update.message;
  if (!msg?.text || msg.chat.type !== "private") return NextResponse.json({ ok: true });
  const chatId = String(msg.chat.id);

  const match = msg.text.match(/^\/start(?:\s+(\S+))?/);
  if (match) {
    const token = match[1];
    const userId = token ? await consumeTelegramLinkToken(token) : null;
    if (!userId) {
      await sendTelegram(chatId, "سلام! برای دریافت اعلان‌های سفارش، از بخش «پروفایل و اعلان‌ها» در حساب کاربری مایا روی لینک تلگرام بزنید.");
      return NextResponse.json({ ok: true });
    }
    // هر chat فقط به یک حساب متصل می‌ماند
    await prisma.$transaction([
      prisma.user.updateMany({ where: { telegramChatId: chatId, NOT: { id: userId } }, data: { telegramChatId: null } }),
      prisma.user.update({ where: { id: userId }, data: { telegramChatId: chatId, notifyTelegram: true } }),
    ]);
    await sendTelegram(chatId, "✅ حساب شما به ربات اسپیرولینا مایا متصل شد. اعلان‌های سفارش از این پس اینجا هم ارسال می‌شود.");
  } else if (msg.text === "/stop") {
    await prisma.user.updateMany({ where: { telegramChatId: chatId }, data: { telegramChatId: null } });
    await sendTelegram(chatId, "اتصال حساب شما قطع شد.");
  }
  return NextResponse.json({ ok: true });
}
