import { requireApi, hasPermission, logAudit } from "@/lib/rbac/server";
import { ok, fail, readJson, str } from "@/lib/api/respond";
import prisma from "@/lib/prisma";

// Edit: the author (not blocked) or a moderator
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApi("chat.use");
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const body = str((await readJson(req)).body, 4000);
  if (!body) return fail("پیام خالی است.");
  const msg = await prisma.chatMessage.findUnique({ where: { id } });
  if (!msg || msg.deletedAt) return fail("پیام پیدا نشد.", 404);
  const moderator = hasPermission(auth, "chat.moderate");
  const own = msg.authorId === auth.userId && !auth.chatBlocked;
  if (!own && !moderator) return fail("اجازه ویرایش این پیام را ندارید.", 403);
  await prisma.chatMessage.update({ where: { id }, data: { body, editedAt: new Date(), editedById: auth.userId } });
  if (!own) await logAudit(auth.userId, "chat.message.edit", id, { author: msg.authorId });
  return ok({}, "پیام ویرایش شد.");
}

// Soft delete: the author or a moderator
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApi("chat.use");
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const msg = await prisma.chatMessage.findUnique({ where: { id } });
  if (!msg || msg.deletedAt) return fail("پیام پیدا نشد.", 404);
  const moderator = hasPermission(auth, "chat.moderate");
  if (msg.authorId !== auth.userId && !moderator) return fail("اجازه حذف این پیام را ندارید.", 403);
  await prisma.chatMessage.update({ where: { id }, data: { deletedAt: new Date(), deletedById: auth.userId } });
  if (msg.authorId !== auth.userId) await logAudit(auth.userId, "chat.message.delete", id, { author: msg.authorId });
  return ok({}, "پیام حذف شد.");
}
