import prisma from "@/lib/prisma";
import { formatJalaliDateTime, formatJalaliShort } from "@/lib/jalali";
import { AMBASSADOR_ROLE } from "@/lib/rbac/permissions";

export interface AdminApplication {
  id: string;
  fullName: string;
  phone: string;
  profession: string;
  city: string;
  licenseNumber: string | null;
  shebaNumber: string | null;
  socialLink: string | null;
  audience: string | null;
  motivation: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewNote: string | null;
  createdAt: string;
}

export interface AdminAmbassador {
  id: string;
  name: string;
  phone: string;
  tier: "SILVER" | "GOLD" | "DIAMOND";
  slug: string | null;
  referralCode: string;
  orders: number;
  sales: number;
  commission: number;
  walletBalance: number;
  kits: number;
  converted: number;
  joinedAt: string;
}

export interface AdminSettlement {
  id: string;
  name: string;
  phone: string;
  amount: number;
  shebaNumber: string;
  bankName: string;
  accountHolder: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "PAID";
  receipt: string | null;
  note: string | null;
  createdAt: string;
}

export async function loadAmbassadorsAdmin() {
  const [apps, ambassadors, orderStats, kitStats, settlements] = await Promise.all([
    prisma.ambassadorApplication.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { user: { select: { phone: true } } } }),
    prisma.user.findMany({
      where: { roles: { some: { role: { key: AMBASSADOR_ROLE } } } },
      include: { wallet: { select: { balance: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.order.groupBy({
      by: ["referrerId"],
      where: { referrerId: { not: null }, status: { notIn: ["PENDING", "CANCELLED", "REFUNDED"] } },
      _count: { _all: true },
      _sum: { totalProductAmount: true, discountAmount: true, commissionAmount: true },
    }),
    prisma.sampleKit.groupBy({ by: ["ambassadorId", "status"], _count: { _all: true } }),
    prisma.settlementRequest.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { user: { select: { name: true, phone: true } } } }),
  ]);
  const orderMap = new Map(orderStats.map((s) => [s.referrerId, s]));

  return {
    applications: apps.map(
      (a): AdminApplication => ({
        id: a.id,
        fullName: a.fullName,
        phone: a.user.phone,
        profession: a.profession,
        city: a.city,
        licenseNumber: a.licenseNumber,
        shebaNumber: a.shebaNumber,
        socialLink: a.socialLink,
        audience: a.audience,
        motivation: a.motivation,
        status: a.status,
        reviewNote: a.reviewNote,
        createdAt: formatJalaliDateTime(a.createdAt),
      })
    ),
    ambassadors: ambassadors.map((u): AdminAmbassador => {
      const s = orderMap.get(u.id);
      const kits = kitStats.filter((k) => k.ambassadorId === u.id);
      return {
        id: u.id,
        name: u.name ?? "بدون نام",
        phone: u.phone,
        tier: u.ambassadorTier ?? "SILVER",
        slug: u.ambassadorSlug,
        referralCode: u.referralCode,
        orders: s?._count._all ?? 0,
        sales: (s?._sum.totalProductAmount ?? 0) - (s?._sum.discountAmount ?? 0),
        commission: s?._sum.commissionAmount ?? 0,
        walletBalance: u.wallet?.balance ?? 0,
        kits: kits.reduce((n, k) => n + k._count._all, 0),
        converted: kits.filter((k) => k.status === "CONVERTED").reduce((n, k) => n + k._count._all, 0),
        joinedAt: formatJalaliShort(u.createdAt),
      };
    }),
    settlements: settlements.map(
      (s): AdminSettlement => ({
        id: s.id,
        name: s.user.name ?? s.accountHolder,
        phone: s.user.phone,
        amount: s.amount,
        shebaNumber: s.shebaNumber,
        bankName: s.bankName ?? "",
        accountHolder: s.accountHolder,
        status: s.status,
        receipt: s.bankReceiptRef,
        note: s.adminNotes,
        createdAt: formatJalaliDateTime(s.createdAt),
      })
    ),
  };
}
