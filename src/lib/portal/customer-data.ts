import prisma from "@/lib/prisma";
import { PROFILE_FIELDS } from "@/lib/crm/profile-fields";
import { getSettings } from "@/lib/settings";
import { toOrderDTO, type OrderDTO } from "@/lib/commerce/dto";
import { formatJalaliDateTime } from "@/lib/jalali";
import { createTelegramLinkToken } from "@/lib/notifications/telegram-link";
import { loadCustomerRefill, type CustomerRefill } from "@/lib/commerce/refill";
import { getModuleStates } from "@/lib/modules/server";

export interface CustomerData {
  name: string | null;
  phone: string;
  referralCode: string;
  walletBalance: number;
  points: number;
  totalSpent: number;
  orders: OrderDTO[];
  transactions: { id: string; title: string; amount: number; type: "CREDIT" | "DEBIT"; date: string }[];
  pointHistory: { id: string; title: string; points: number; date: string }[];
  addresses: {
    id: string;
    title: string;
    recipient: string;
    phone: string;
    province: string;
    city: string;
    address: string;
    postalCode: string;
    isDefault: boolean;
  }[];
  profile: {
    name: string;
    email: string;
    nationalCode: string;
    birthDate: string;
    notifySms: boolean;
    notifyTelegram: boolean;
    notifyEmail: boolean;
    smsConsent: boolean;
    telegramLinked: boolean;
    gender: string;
    extra: Record<string, string>;
  };
  rules: { pointsToToman: number; minPointsToRedeem: number; pointsPer100k: number; pointsExpiryDays: number; returnWindowDays: number; referralPoints: number };
  telegramLink: string | null;
  appUrl: string;
  refill: CustomerRefill | null;
  features: { refill: boolean; loyalty: boolean; consultation: boolean; reviews: boolean; invoice: boolean };
}

import { LOYALTY_TIERS } from "./labels";
export { LOYALTY_TIERS };

export async function loadCustomerData(userId: string): Promise<CustomerData> {
  const [user, orders, settings, pointsAgg, delivered] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        wallet: { include: { transactions: { orderBy: { createdAt: "desc" }, take: 50 } } },
        addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] },
        pointTransactions: { orderBy: { createdAt: "desc" }, take: 30 },
      },
    }),
    prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { items: true, referrer: { select: { name: true } }, review: true, returnRequest: true },
    }),
    getSettings(),
    prisma.pointTransaction.aggregate({ where: { userId, status: "RELEASED" }, _sum: { points: true } }),
    prisma.order.aggregate({
      where: { userId, status: "DELIVERED" },
      _sum: { totalProductAmount: true, discountAmount: true },
    }),
  ]);

  const botUsername = process.env.TELEGRAM_BOT_USERNAME;
  const modules = await getModuleStates();
  const refill = modules.refill ? await loadCustomerRefill(userId) : null;

  return {
    name: user.name,
    phone: user.phone,
    referralCode: user.referralCode,
    walletBalance: user.wallet?.balance ?? 0,
    points: pointsAgg._sum.points ?? 0,
    totalSpent: (delivered._sum.totalProductAmount ?? 0) - (delivered._sum.discountAmount ?? 0),
    orders: orders.map(toOrderDTO),
    transactions: (user.wallet?.transactions ?? []).map((t) => ({
      id: t.id,
      title: t.description,
      amount: t.amount,
      type: t.type,
      date: formatJalaliDateTime(t.createdAt),
    })),
    pointHistory: user.pointTransactions.map((p) => ({
      id: p.id,
      title: p.description,
      points: p.points,
      date: formatJalaliDateTime(p.createdAt),
    })),
    addresses: user.addresses.map((a) => ({
      id: a.id,
      title: a.title,
      recipient: a.recipient,
      phone: a.phone,
      province: a.province,
      city: a.city,
      address: a.address,
      postalCode: a.postalCode,
      isDefault: a.isDefault,
    })),
    profile: {
      name: user.name ?? "",
      email: user.email ?? "",
      nationalCode: user.nationalCode ?? "",
      birthDate: user.birthDate ?? "",
      notifySms: user.notifySms,
      notifyTelegram: user.notifyTelegram,
      notifyEmail: user.notifyEmail,
      smsConsent: user.smsConsent && !user.smsOptOutAt,
      telegramLinked: !!user.telegramChatId,
      gender: user.gender ?? "",
      extra: Object.fromEntries(PROFILE_FIELDS.map((f) => [f.key, (user[f.key] as string | null) ?? ""])),
    },
    rules: {
      pointsToToman: Number(settings.POINTS_TO_TOMAN_RATIO) || 0,
      minPointsToRedeem: Number(settings.MIN_POINTS_TO_REDEEM) || 0,
      pointsPer100k: Number(settings.PURCHASE_POINTS_PER_100K) || 0,
      pointsExpiryDays: Number(settings.POINTS_EXPIRY_DAYS) || 0,
      returnWindowDays: Number(settings.RETURN_WINDOW_DAYS) || 0,
      referralPoints: Number(settings.REFERRAL_REWARD_POINTS) || 0,
    },
    telegramLink: botUsername ? `https://t.me/${botUsername}?start=${await createTelegramLinkToken(userId)}` : null,
    appUrl: (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, ""),
    refill,
    features: { refill: modules.refill, loyalty: modules.loyalty, consultation: modules.consultation, reviews: modules.reviews, invoice: modules.invoice },
  };
}
