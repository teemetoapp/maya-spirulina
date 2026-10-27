import { requireApi, hasPermission, logAudit } from "@/lib/rbac/server";
import { ok, fail, readJson, str } from "@/lib/api/respond";
import prisma from "@/lib/prisma";
import { loadChannels, loadChatPeople } from "@/lib/chat";

// List my channels (moderators see all)
export async function GET() {
  const auth = await requireApi("chat.use");
  if (auth instanceof Response) return auth;
  return ok({ channels: await loadChannels(auth.userId, hasPermission(auth, "chat.moderate")) });
}

// Create a group (chat.groups.create) or open a direct chat (chat.use)
export async function POST(req: Request) {
  const auth = await requireApi("chat.use");
  if (auth instanceof Response) return auth;
  if (auth.chatBlocked) return fail("شما در پیام‌ها بلاک شده‌اید.", 403);
  const b = await readJson(req);
  const people = new Set((await loadChatPeople()).map((p) => p.id));

  if (b.type === "DIRECT") {
    const otherId = str(b.userId, 40);
    if (!people.has(otherId) || otherId === auth.userId) return fail("این شخص به پیام‌ها دسترسی ندارد.");
    const existing = await prisma.chatChannel.findFirst({
      where: { type: "DIRECT", AND: [{ members: { some: { userId: auth.userId } } }, { members: { some: { userId: otherId } } }] },
    });
    if (existing) return ok({ id: existing.id });
    const ch = await prisma.chatChannel.create({
      data: { type: "DIRECT", createdById: auth.userId, members: { create: [{ userId: auth.userId }, { userId: otherId }] } },
    });
    return ok({ id: ch.id });
  }

  if (!hasPermission(auth, "chat.groups.create")) return fail("اجازه ساخت گروه را ندارید؛ از مدیر ارشد بخواهید.", 403);
  const name = str(b.name, 60);
  if (!name) return fail("نام گروه را وارد کنید.");
  const memberIds = [...new Set([auth.userId, ...(Array.isArray(b.memberIds) ? b.memberIds.map(String) : [])])].filter((id) => people.has(id) || id === auth.userId);
  const ch = await prisma.chatChannel.create({
    data: {
      name,
      description: str(b.description, 200) || null,
      type: "GROUP",
      createdById: auth.userId,
      members: { create: memberIds.map((userId) => ({ userId, isAdmin: userId === auth.userId })) },
    },
  });
  await logAudit(auth.userId, "chat.group.create", ch.id, { name, members: memberIds.length });
  return ok({ id: ch.id }, "گروه ساخته شد.");
}
