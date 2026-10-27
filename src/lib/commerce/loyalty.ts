import prisma from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { isModuleEnabled } from "@/lib/modules/server";
import { notify } from "@/lib/notifications";
import { logAudit } from "@/lib/rbac/server";
import { toPersianDigits } from "@/lib/currency";
import type { Order, Prisma } from "@prisma/client";

// ==============================================================
// Customer club rules that need a clock:
//   • every earned point expires POINTS_EXPIRY_DAYS after it is released
//     (oldest points are treated as spent first)
//   • a friend referral rewards ONLY the direct referrer (one level, never
//     the referrer's referrer), after the friend's first order is delivered,
//     and is held until the return window closes
//   • self-referral (same phone, same address, same signup IP) and more
//     than REFERRAL_MAX_PER_MONTH rewards a month are blocked and logged
// ==============================================================

const DAY = 86_400_000;

export async function pointsExpiryDate(from = new Date()): Promise<Date | null> {
  const days = Number((await getSettings()).POINTS_EXPIRY_DAYS) || 0;
  return days > 0 ? new Date(from.getTime() + days * DAY) : null;
}

/**
 * Expires unspent points whose validity has passed. For each user:
 *   expired = balance − Σ(still-valid earned points)
 * Spending consumes the oldest points first, so whatever the balance holds
 * beyond the valid grants is exactly the expired remainder. Idempotent.
 */
export async function expirePoints(): Promise<number> {
  const now = new Date();
  const users = await prisma.pointTransaction.findMany({
    where: { status: "RELEASED", points: { gt: 0 }, expiresAt: { lte: now } },
    distinct: ["userId"],
    select: { userId: true },
    take: 500,
  });
  let expired = 0;
  for (const { userId } of users) {
    await prisma.$transaction(async (tx) => {
      const [balance, valid] = await Promise.all([
        tx.pointTransaction.aggregate({ where: { userId, status: "RELEASED" }, _sum: { points: true } }),
        tx.pointTransaction.aggregate({
          where: { userId, status: "RELEASED", points: { gt: 0 }, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
          _sum: { points: true },
        }),
      ]);
      const excess = (balance._sum.points ?? 0) - (valid._sum.points ?? 0);
      if (excess <= 0) return;
      await tx.pointTransaction.create({
        data: { userId, points: -excess, type: "EXPIRED", status: "RELEASED", releasedAt: now, description: "انقضای امتیازهای استفاده‌نشده" },
      });
      expired++;
    });
  }
  return expired;
}

export async function referralFraudReasons(order: Pick<Order, "id" | "userId" | "shippingPhone" | "shippingPostalCode">, referrerId: string): Promise<string[]> {
  const s = await getSettings();
  const cap = Number(s.REFERRAL_MAX_PER_MONTH) || 0;
  const [referrer, buyer, sameAddress, recent] = await Promise.all([
    prisma.user.findUnique({ where: { id: referrerId }, select: { phone: true, signupIp: true } }),
    prisma.user.findUnique({ where: { id: order.userId }, select: { signupIp: true } }),
    prisma.address.count({ where: { userId: referrerId, postalCode: order.shippingPostalCode } }),
    prisma.pointTransaction.count({ where: { userId: referrerId, type: "REFERRAL_REWARD", createdAt: { gte: new Date(Date.now() - 30 * DAY) } } }),
  ]);
  const ownOrders = await prisma.order.count({ where: { userId: referrerId, shippingPostalCode: order.shippingPostalCode } });
  const reasons: string[] = [];
  if (!referrer) return ["REFERRER_MISSING"];
  if (referrer.phone === order.shippingPhone) reasons.push("SAME_PHONE");
  if (sameAddress + ownOrders > 0) reasons.push("SAME_ADDRESS");
  if (referrer.signupIp && buyer?.signupIp && referrer.signupIp === buyer.signupIp) reasons.push("SAME_IP");
  if (cap > 0 && recent >= cap) reasons.push("MONTHLY_CAP");
  return reasons;
}

export { FRAUD_LABELS } from "./fraud-labels";

/**
 * Called when an order is delivered. Rewards the buyer's direct referrer
 * once, on the buyer's first delivered order. The reward is PENDING until
 * releaseHeldRewards() runs after the return window.
 */
export async function grantReferralReward(orderId: string): Promise<void> {
  if (!(await isModuleEnabled("loyalty"))) return;
  const points = Number((await getSettings()).REFERRAL_REWARD_POINTS) || 0;
  if (points <= 0) return;
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { user: { select: { referredById: true, name: true } } } });
  const referrerId = order?.user.referredById;
  if (!order || !referrerId || referrerId === order.userId) return;
  // فقط اولین خرید تحویل‌شده دوست
  const earlier = await prisma.order.count({ where: { userId: order.userId, status: "DELIVERED", id: { not: order.id } } });
  if (earlier > 0) return;
  const already = await prisma.pointTransaction.count({ where: { type: "REFERRAL_REWARD", order: { userId: order.userId } } });
  if (already > 0) return;

  const reasons = await referralFraudReasons(order, referrerId);
  if (reasons.length > 0) {
    await prisma.order.update({ where: { id: order.id }, data: { fraudFlags: { set: [...new Set([...order.fraudFlags, ...reasons])] } } });
    await logAudit(null, "referral.blocked", order.orderNumber, { referrerId, reasons });
    return;
  }
  await prisma.pointTransaction.create({
    data: {
      userId: referrerId,
      orderId: order.id,
      points,
      type: "REFERRAL_REWARD",
      status: "PENDING",
      description: `پاداش معرفی ${order.user.name ?? "دوست"} (پس از پایان مهلت مرجوعی آزاد می‌شود)`,
    },
  });
}

// پاداش‌های معرفی که مهلت مرجوعی سفارششان تمام شده آزاد می‌شوند
export async function releaseHeldRewards(): Promise<number> {
  const s = await getSettings();
  const window = Number(s.RETURN_WINDOW_DAYS) || 0;
  const held = await prisma.pointTransaction.findMany({
    where: {
      type: "REFERRAL_REWARD",
      status: "PENDING",
      order: {
        status: "DELIVERED",
        deliveredAt: { lte: new Date(Date.now() - window * DAY) },
        OR: [{ returnRequest: { is: null } }, { returnRequest: { status: "REJECTED" } }],
      },
    },
    take: 200,
  });
  for (const p of held) {
    const now = new Date();
    const claimed = await prisma.pointTransaction.updateMany({
      where: { id: p.id, status: "PENDING" },
      data: { status: "RELEASED", releasedAt: now, expiresAt: await pointsExpiryDate(now), description: p.description.replace(/ \(پس از .*\)$/, "") },
    });
    if (claimed.count) await notify("referral.reward", { userId: p.userId, data: { points: toPersianDigits(p.points) } });
  }
  return held.length;
}

// سفارش مرجوعی: امتیاز خرید خریدار و پاداش معرفی معرف باطل می‌شود
export async function revokeOrderPoints(tx: Prisma.TransactionClient, orderId: string) {
  await tx.pointTransaction.updateMany({ where: { orderId, status: { not: "REVOKED" }, points: { gt: 0 } }, data: { status: "REVOKED" } });
}
