import type { AmbassadorTier } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { logAudit } from "@/lib/rbac/server";

// ==============================================================
// Ambassador tiers. The tier (and so the commission percent:
// COMMISSION_SILVER / GOLD / DIAMOND) follows the ambassador's
// lifetime net sales of DELIVERED referred orders, against the
// TIER_GOLD_MIN_SALES / TIER_DIAMOND_MIN_SALES thresholds in Setting.
// Promotion is automatic and never demotes; staff can still set a
// tier by hand in «کاربران و نقش‌ها».
// ==============================================================

export const TIER_ORDER: AmbassadorTier[] = ["SILVER", "GOLD", "DIAMOND"];

export function tierForSales(sales: number, settings: Record<string, string>): AmbassadorTier {
  const diamond = Number(settings.TIER_DIAMOND_MIN_SALES) || Infinity;
  const gold = Number(settings.TIER_GOLD_MIN_SALES) || Infinity;
  if (sales >= diamond) return "DIAMOND";
  if (sales >= gold) return "GOLD";
  return "SILVER";
}

/** Next tier and the delivered sales still needed to reach it (null at the top). */
export function nextTier(
  tier: AmbassadorTier,
  sales: number,
  settings: Record<string, string>
): { tier: AmbassadorTier; remaining: number; threshold: number } | null {
  const next = TIER_ORDER[TIER_ORDER.indexOf(tier) + 1];
  if (!next) return null;
  const threshold = Number(next === "DIAMOND" ? settings.TIER_DIAMOND_MIN_SALES : settings.TIER_GOLD_MIN_SALES) || 0;
  if (!threshold) return null;
  return { tier: next, remaining: Math.max(0, threshold - sales), threshold };
}

export async function deliveredReferralSales(ambassadorId: string): Promise<number> {
  const agg = await prisma.order.aggregate({
    where: { referrerId: ambassadorId, status: "DELIVERED" },
    _sum: { totalProductAmount: true, discountAmount: true },
  });
  return (agg._sum.totalProductAmount ?? 0) - (agg._sum.discountAmount ?? 0);
}

/** Called after a referred order is delivered. Returns the new tier when promoted. */
export async function refreshAmbassadorTier(ambassadorId: string): Promise<AmbassadorTier | null> {
  const [user, sales, settings] = await Promise.all([
    prisma.user.findUnique({ where: { id: ambassadorId }, select: { ambassadorTier: true } }),
    deliveredReferralSales(ambassadorId),
    getSettings(),
  ]);
  if (!user) return null;
  const current = user.ambassadorTier ?? "SILVER";
  const earned = tierForSales(sales, settings);
  if (TIER_ORDER.indexOf(earned) <= TIER_ORDER.indexOf(current)) return null;

  await prisma.user.update({ where: { id: ambassadorId }, data: { ambassadorTier: earned } });
  await logAudit(null, "ambassador.tier.auto", ambassadorId, { from: current, to: earned, sales });
  return earned;
}
