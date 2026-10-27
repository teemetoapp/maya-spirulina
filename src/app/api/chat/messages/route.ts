import { requireApi, hasPermission } from "@/lib/rbac/server";
import { ok, fail, readJson, str } from "@/lib/api/respond";
import prisma from "@/lib/prisma";
import { loadMessages } from "@/lib/chat";

// Messages of one channel (polled by the chat page)
export async function GET(req: Request) {
  const auth = await requireApi("chat.use");
  if (auth instanceof Response) return auth;
  const channelId = new URL(req.url).searchParams.get("channel") ?? "";
  const messages = await loadMessages(channelId, auth.userId, hasPermission(auth, "chat.moderate"));
  if (!messages) return fail("گفتگو پیدا نشد.", 404);
  return ok({ messages, blocked: auth.chatBlocked });
}

// Send a message
export async function POST(req: Request) {
  const auth = await requireApi("chat.use");
  if (auth instanceof Response) return auth;
  if (auth.chatBlocked) return fail("شما توسط مدیر در پیام‌ها بلاک شده‌اید و نمی‌توانید پیام بفرستید.", 403);
  const b = await readJson(req);
  const channelId = str(b.channelId, 40);
  const body = str(b.body, 4000);
  if (!body) return fail("پیام خالی است.");
  const member = await prisma.chatMember.findUnique({ where: { channelId_userId: { channelId, userId: auth.userId } } });
  if (!member) return fail("عضو این گفتگو نیستید.", 403);
  await prisma.$transaction([
    prisma.chatMessage.create({ data: { channelId, authorId: auth.userId, body } }),
    prisma.chatChannel.update({ where: { id: channelId }, data: { updatedAt: new Date() } }),
    prisma.chatMember.update({ where: { id: member.id }, data: { lastReadAt: new Date() } }),
  ]);
  return ok({});
}
