import { requireApi, hasPermission, logAudit } from "@/lib/rbac/server";
import { ok, fail, readJson, str } from "@/lib/api/respond";
import prisma from "@/lib/prisma";
import { loadChatPeople } from "@/lib/chat";

async function canManage(channelId: string, userId: string, moderator: boolean) {
  const ch = await prisma.chatChannel.findUnique({ where: { id: channelId }, include: { members: true } });
  if (!ch) return null;
  const me = ch.members.find((m) => m.userId === userId);
  const allowed = moderator || (ch.type === "GROUP" && (ch.createdById === userId || !!me?.isAdmin));
  return { ch, allowed };
}

// Rename, add or remove members
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApi("chat.use");
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const r = await canManage(id, auth.userId, hasPermission(auth, "chat.moderate"));
  if (!r) return fail("گفتگو پیدا نشد.", 404);
  if (!r.allowed || r.ch.type !== "GROUP") return fail("اجازه مدیریت این گروه را ندارید.", 403);
  const b = await readJson(req);

  if (typeof b.name === "string") {
    const name = str(b.name, 60);
    if (!name) return fail("نام گروه خالی است.");
    await prisma.chatChannel.update({ where: { id }, data: { name, description: str(b.description, 200) || null } });
  }
  if (Array.isArray(b.memberIds)) {
    const people = new Set((await loadChatPeople()).map((p) => p.id));
    const wanted = [...new Set(b.memberIds.map(String))].filter((x) => people.has(x));
    if (wanted.length === 0) return fail("گروه باید حداقل یک عضو داشته باشد.");
    await prisma.$transaction([
      prisma.chatMember.deleteMany({ where: { channelId: id, userId: { notIn: wanted } } }),
      ...wanted.map((userId) =>
        prisma.chatMember.upsert({ where: { channelId_userId: { channelId: id, userId } }, update: {}, create: { channelId: id, userId } })
      ),
    ]);
  }
  await logAudit(auth.userId, "chat.group.update", id, { name: b.name, members: Array.isArray(b.memberIds) ? b.memberIds.length : undefined });
  return ok({}, "گروه به‌روز شد.");
}

// Delete a group (creator or moderator)
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApi("chat.use");
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const r = await canManage(id, auth.userId, hasPermission(auth, "chat.moderate"));
  if (!r) return fail("گفتگو پیدا نشد.", 404);
  if (!r.allowed) return fail("اجازه حذف این گفتگو را ندارید.", 403);
  await prisma.chatChannel.delete({ where: { id } });
  await logAudit(auth.userId, "chat.channel.delete", id, { name: r.ch.name });
  return ok({}, "گفتگو حذف شد.");
}
