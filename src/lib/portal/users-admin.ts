import prisma from "@/lib/prisma";
import { formatJalaliShort } from "@/lib/jalali";

export interface AdminUser {
  id: string;
  name: string;
  phone: string;
  email: string;
  isActive: boolean;
  joinedAt: string;
  roleKeys: string[];
  ambassadorTier: "SILVER" | "GOLD" | "DIAMOND" | null;
  referralCode: string;
  referredBy: string | null;
  walletBalance: number;
  orders: number;
  totalSpent: number;
  lastOrderAt: string | null;
  telegramLinked: boolean;
}

export interface AdminRole {
  id: string;
  key: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissions: string[];
  userCount: number;
}

export async function loadUsersAdmin(): Promise<{ users: AdminUser[]; roles: AdminRole[] }> {
  const [users, roles, stats] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 1000,
      include: {
        roles: { include: { role: { select: { key: true } } } },
        wallet: { select: { balance: true } },
        referredBy: { select: { name: true, phone: true } },
      },
    }),
    prisma.role.findMany({ orderBy: [{ isSystem: "desc" }, { createdAt: "asc" }], include: { _count: { select: { users: true } } } }),
    prisma.order.groupBy({
      by: ["userId"],
      where: { status: { notIn: ["PENDING", "CANCELLED", "REFUNDED"] } },
      _count: { _all: true },
      _sum: { totalProductAmount: true, discountAmount: true },
      _max: { createdAt: true },
    }),
  ]);
  const statMap = new Map(stats.map((s) => [s.userId, s]));

  return {
    users: users.map((u) => {
      const s = statMap.get(u.id);
      return {
        id: u.id,
        name: u.name ?? "",
        phone: u.phone,
        email: u.email ?? "",
        isActive: u.isActive,
        joinedAt: formatJalaliShort(u.createdAt),
        roleKeys: u.roles.map((r) => r.role.key),
        ambassadorTier: u.ambassadorTier,
        referralCode: u.referralCode,
        referredBy: u.referredBy ? u.referredBy.name ?? u.referredBy.phone : null,
        walletBalance: u.wallet?.balance ?? 0,
        orders: s?._count._all ?? 0,
        totalSpent: (s?._sum.totalProductAmount ?? 0) - (s?._sum.discountAmount ?? 0),
        lastOrderAt: s?._max.createdAt ? formatJalaliShort(s._max.createdAt) : null,
        telegramLinked: !!u.telegramChatId,
      };
    }),
    roles: roles.map((r) => ({
      id: r.id,
      key: r.key,
      name: r.name,
      description: r.description ?? "",
      isSystem: r.isSystem,
      permissions: r.permissions,
      userCount: r._count.users,
    })),
  };
}
