import prisma from "@/lib/prisma";
import QRCode from "qrcode";
import { getSettings } from "@/lib/settings";
import { formatJalaliDateTime, formatJalaliShort } from "@/lib/jalali";
import { commissionPercentForTier } from "@/lib/commerce/pricing";
import { nextTier } from "@/lib/commerce/tiers";
import { ORDER_STATUS_LABELS } from "@/lib/commerce/dto";

import { TIER_LABELS, SAMPLE_KIT_STATUS_LABELS, SETTLEMENT_STATUS_LABELS } from "./labels";
export { TIER_LABELS, SAMPLE_KIT_STATUS_LABELS, SETTLEMENT_STATUS_LABELS };

export interface AmbassadorData {
  name: string;
  tier: keyof typeof TIER_LABELS;
  commissionPercent: number;
  next: { tier: keyof typeof TIER_LABELS; percent: number; remaining: number; threshold: number } | null;
  customerDiscount: number;
  referralCode: string;
  slug: string | null;
  refLink: string;
  refQr: string; // data:image/png
  storyLink: string | null;
  walletBalance: number;
  totalEarned: number;
  totalWithdrawn: number;
  pendingCommission: number;
  shebaNumber: string;
  minSettlement: number;
  followUpDays: number;
  stats: { orders: number; delivered: number; sales: number; customers: number; kits: number; converted: number };
  referredCustomers: {
    key: string;
    customer: string;
    orders: number;
    amount: number;
    commission: number;
    lastOrder: string;
  }[];
  referredOrders: {
    id: string;
    orderNumber: string;
    date: string;
    statusLabel: string;
    status: string;
    customer: string;
    amount: number;
    commission: number;
    released: boolean;
  }[];
  sampleKits: {
    id: string;
    code: string;
    recipientName: string;
    recipientPhone: string;
    status: keyof typeof SAMPLE_KIT_STATUS_LABELS;
    deliveredAt: string;
    followUpAt: string;
    followUpDue: boolean;
    notes: string;
    convertedOrderNumber: string | null;
  }[];
  settlements: {
    id: string;
    amount: number;
    status: keyof typeof SETTLEMENT_STATUS_LABELS;
    shebaNumber: string;
    bankName: string;
    date: string;
    receipt: string | null;
    note: string | null;
  }[];
}

// نام مشتری برای سفیر تا حدی پنهان می‌شود (حریم خصوصی مشتری)
function maskName(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts.slice(1).join(" ").charAt(0)}.` : parts[0] || "مشتری";
}

export async function loadAmbassadorData(userId: string): Promise<AmbassadorData> {
  const [user, orders, kits, settlements, settings] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, include: { wallet: true } }),
    prisma.order.findMany({
      where: { referrerId: userId, status: { not: "PENDING" } },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.sampleKit.findMany({
      where: { ambassadorId: userId },
      orderBy: { deliveredAt: "desc" },
      include: { convertedOrder: { select: { orderNumber: true } } },
    }),
    prisma.settlementRequest.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50 }),
    getSettings(),
  ]);

  const tier = user.ambassadorTier ?? "SILVER";
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const active = orders.filter((o) => o.status !== "CANCELLED" && o.status !== "REFUNDED");
  const now = Date.now();
  const refLink = `${appUrl}/ref/${user.ambassadorSlug ?? user.referralCode}`;
  const refQr = await QRCode.toDataURL(refLink, { width: 480, margin: 2, errorCorrectionLevel: "M" });

  // زیرمجموعه‌ها: مشتریانی که با لینک یا کد این سفیر خرید کرده‌اند
  const byCustomer = new Map<string, AmbassadorData["referredCustomers"][number]>();
  for (const o of active) {
    const c = byCustomer.get(o.userId) ?? {
      key: o.userId.slice(-6),
      customer: maskName(o.shippingRecipient),
      orders: 0,
      amount: 0,
      commission: 0,
      lastOrder: formatJalaliShort(o.createdAt),
    };
    c.orders += 1;
    c.amount += o.totalProductAmount - o.discountAmount;
    c.commission += o.commissionAmount;
    byCustomer.set(o.userId, c);
  }

  return {
    name: user.name ?? "سفیر مایا",
    tier,
    commissionPercent: commissionPercentForTier(tier, settings),
    next: (() => {
      const deliveredSales = active.filter((o) => o.status === "DELIVERED").reduce((s, o) => s + o.totalProductAmount - o.discountAmount, 0);
      const n = nextTier(tier, deliveredSales, settings);
      return n ? { ...n, percent: commissionPercentForTier(n.tier, settings) } : null;
    })(),
    customerDiscount: Number(settings.AMBASSADOR_CUSTOMER_DISCOUNT) || 0,
    referralCode: user.referralCode,
    slug: user.ambassadorSlug,
    refLink,
    refQr,
    referredCustomers: [...byCustomer.values()].sort((a, b) => b.amount - a.amount),
    storyLink: user.ambassadorSlug ? `${appUrl}/story/${user.ambassadorSlug}` : null,
    walletBalance: user.wallet?.balance ?? 0,
    totalEarned: user.wallet?.totalEarned ?? 0,
    totalWithdrawn: user.wallet?.totalWithdrawn ?? 0,
    pendingCommission: active.filter((o) => !o.commissionReleased).reduce((s, o) => s + o.commissionAmount, 0),
    shebaNumber: user.shebaNumber ?? "",
    minSettlement: Number(settings.MIN_SETTLEMENT_TOMAN) || 0,
    followUpDays: Number(settings.SAMPLE_KIT_FOLLOWUP_DAYS) || 3,
    stats: {
      orders: active.length,
      delivered: active.filter((o) => o.status === "DELIVERED").length,
      sales: active.reduce((s, o) => s + o.totalProductAmount - o.discountAmount, 0),
      customers: new Set(active.map((o) => o.userId)).size,
      kits: kits.length,
      converted: kits.filter((k) => k.status === "CONVERTED").length,
    },
    referredOrders: orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      date: formatJalaliDateTime(o.createdAt),
      status: o.status,
      statusLabel: ORDER_STATUS_LABELS[o.status],
      customer: maskName(o.shippingRecipient),
      amount: o.totalProductAmount - o.discountAmount,
      commission: o.commissionAmount,
      released: o.commissionReleased,
    })),
    sampleKits: kits.map((k) => ({
      id: k.id,
      code: k.code,
      recipientName: k.recipientName,
      recipientPhone: k.recipientPhone,
      status: k.status,
      deliveredAt: formatJalaliShort(k.deliveredAt),
      followUpAt: formatJalaliShort(k.followUpAt),
      followUpDue: k.status === "DELIVERED" && k.followUpAt.getTime() <= now,
      notes: k.notes ?? "",
      convertedOrderNumber: k.convertedOrder?.orderNumber ?? null,
    })),
    settlements: settlements.map((s) => ({
      id: s.id,
      amount: s.amount,
      status: s.status,
      shebaNumber: s.shebaNumber,
      bankName: s.bankName ?? "",
      date: formatJalaliDateTime(s.createdAt),
      receipt: s.bankReceiptRef,
      note: s.adminNotes,
    })),
  };
}

export async function loadLatestApplication(userId: string) {
  const app = await prisma.ambassadorApplication.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });
  return app
    ? { status: app.status, createdAt: formatJalaliDateTime(app.createdAt), reviewNote: app.reviewNote, fullName: app.fullName }
    : null;
}
