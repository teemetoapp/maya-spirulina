import prisma from "@/lib/prisma";
import { formatJalaliDateTime } from "@/lib/jalali";
import { isPermission, SUPER_ADMIN_ROLE } from "@/lib/rbac/permissions";

// ==============================================================
// Internal messages (پیام‌ها و هماهنگی). Staff with chat.use talk in
// groups and direct chats. chat.groups.create lets someone open a group;
// chat.moderate (super admin by default) can read every channel, edit or
// delete any message and block a user from sending.
// ==============================================================

export interface ChatPerson {
  id: string;
  name: string;
  roleNames: string;
  blocked: boolean;
}

export interface ChatChannelDTO {
  id: string;
  type: "GROUP" | "DIRECT";
  title: string;
  description: string;
  memberIds: string[];
  isMember: boolean;
  canManage: boolean; // افزودن/حذف عضو و حذف گروه
  lastMessage: string | null;
  lastAt: string | null;
  lastAtMs: number;
  unread: number;
}

export interface ChatMessageDTO {
  id: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
  edited: boolean;
  editedByModerator: boolean;
  deleted: boolean;
  mine: boolean;
}

// همه کسانی که (از نقش یا دسترسی فردی) به پیام‌ها دسترسی دارند
export async function loadChatPeople(): Promise<ChatPerson[]> {
  const users = await prisma.user.findMany({
    where: { isActive: true, OR: [{ roles: { some: {} } }, { extraPermissions: { has: "chat.use" } }] },
    include: { roles: { include: { role: true } } },
    take: 500,
  });
  return users
    .filter((u) => {
      if (u.revokedPermissions.includes("chat.use") && !u.roles.some((r) => r.role.key === SUPER_ADMIN_ROLE)) return false;
      return u.extraPermissions.includes("chat.use") || u.roles.some((r) => r.role.permissions.filter(isPermission).includes("chat.use"));
    })
    .map((u) => ({ id: u.id, name: u.name ?? u.phone, roleNames: u.roles.map((r) => r.role.name).join("، "), blocked: u.chatBlocked }));
}

export async function loadChannels(userId: string, isModerator: boolean): Promise<ChatChannelDTO[]> {
  const channels = await prisma.chatChannel.findMany({
    where: isModerator ? {} : { members: { some: { userId } } },
    include: {
      members: { include: { user: { select: { id: true, name: true, phone: true } } } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, include: { author: { select: { name: true } } } },
    },
    orderBy: { updatedAt: "desc" },
  });
  const unreadCounts = await Promise.all(
    channels.map((c) => {
      const me = c.members.find((m) => m.userId === userId);
      if (!me) return 0;
      return prisma.chatMessage.count({
        where: { channelId: c.id, authorId: { not: userId }, deletedAt: null, ...(me.lastReadAt ? { createdAt: { gt: me.lastReadAt } } : {}) },
      });
    })
  );

  return channels
    .map((c, i) => {
      const me = c.members.find((m) => m.userId === userId);
      const other = c.type === "DIRECT" ? c.members.find((m) => m.userId !== userId) : null;
      const last = c.messages[0];
      return {
        id: c.id,
        type: c.type,
        title:
          c.type === "DIRECT"
            ? other
              ? other.user.name ?? other.user.phone
              : c.members.map((m) => m.user.name ?? m.user.phone).join(" و ")
            : c.name ?? "گروه",
        description: c.description ?? "",
        memberIds: c.members.map((m) => m.userId),
        isMember: !!me,
        canManage: isModerator || (c.type === "GROUP" && (c.createdById === userId || !!me?.isAdmin)),
        lastMessage: last ? (last.deletedAt ? "پیام حذف شد" : `${last.author.name ?? ""}: ${last.body}`.slice(0, 80)) : null,
        lastAt: last ? formatJalaliDateTime(last.createdAt) : null,
        lastAtMs: (last?.createdAt ?? c.createdAt).getTime(),
        unread: unreadCounts[i],
      };
    })
    .sort((a, b) => b.lastAtMs - a.lastAtMs);
}

export async function loadMessages(channelId: string, userId: string, isModerator: boolean): Promise<ChatMessageDTO[] | null> {
  const channel = await prisma.chatChannel.findUnique({ where: { id: channelId }, include: { members: { select: { userId: true } } } });
  if (!channel) return null;
  const isMember = channel.members.some((m) => m.userId === userId);
  if (!isMember && !isModerator) return null;

  const messages = await prisma.chatMessage.findMany({
    where: { channelId },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { author: { select: { name: true, phone: true } } },
  });
  if (isMember) {
    await prisma.chatMember.update({ where: { channelId_userId: { channelId, userId } }, data: { lastReadAt: new Date() } });
  }
  return messages.reverse().map((m) => ({
    id: m.id,
    authorId: m.authorId,
    authorName: m.author.name ?? m.author.phone,
    // مدیر متن پیام حذف‌شده را برای پیگیری می‌بیند؛ بقیه نه
    body: m.deletedAt && !isModerator ? "" : m.body,
    createdAt: formatJalaliDateTime(m.createdAt),
    edited: !!m.editedAt,
    editedByModerator: !!m.editedById && m.editedById !== m.authorId,
    deleted: !!m.deletedAt,
    mine: m.authorId === userId,
  }));
}
