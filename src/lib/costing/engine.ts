import prisma from "@/lib/prisma";
import { getSettings } from "@/lib/settings";

// ==============================================================
// Cost formula of each package (variant):
//   variable cost = Σ quantity × unit cost
//                   (a row linked to a CostInput uses the input's live price)
//   overhead/unit = Σ active monthly fixed costs ÷ COSTING_MONTHLY_UNITS
//   full cost     = variable cost + overhead/unit × variant.overheadUnits
// costPrice (variable) feeds COGS in accounting, where fixed costs are
// already booked as expenses; fullCostPrice is the basis for pricing.
// ==============================================================

export interface OverheadInfo {
  monthlyTotal: number;
  monthlyUnits: number;
  perUnit: number;
}

export async function overheadInfo(): Promise<OverheadInfo> {
  const [agg, s] = await Promise.all([
    prisma.fixedCost.aggregate({ where: { isActive: true }, _sum: { monthlyAmount: true } }),
    getSettings(),
  ]);
  const monthlyTotal = agg._sum.monthlyAmount ?? 0;
  const monthlyUnits = Math.max(1, Number(s.COSTING_MONTHLY_UNITS) || 1);
  return { monthlyTotal, monthlyUnits, perUnit: Math.round(monthlyTotal / monthlyUnits) };
}

/** Recompute costPrice and fullCostPrice (all variants when no ids are given). */
export async function recomputeCosts(variantIds?: string[]): Promise<number> {
  const [variants, overhead] = await Promise.all([
    prisma.productVariant.findMany({
      where: variantIds ? { id: { in: variantIds } } : {},
      include: { costItems: { include: { input: { select: { price: true } } } } },
    }),
    overheadInfo(),
  ]);
  for (const v of variants) {
    // ردیف‌های متصل به منبع، نرخ روز منبع را می‌گیرند
    for (const it of v.costItems) {
      if (it.input && it.unitCost !== it.input.price) {
        await prisma.variantCostItem.update({ where: { id: it.id }, data: { unitCost: it.input.price } });
      }
    }
    const hasSheet = v.costItems.length > 0;
    const variable = hasSheet ? Math.round(v.costItems.reduce((s, it) => s + it.quantity * (it.input?.price ?? it.unitCost), 0)) : v.costPrice;
    const full = variable + Math.round(overhead.perUnit * v.overheadUnits);
    if (variable !== v.costPrice || full !== v.fullCostPrice) {
      await prisma.productVariant.update({ where: { id: v.id }, data: { costPrice: variable, fullCostPrice: full } });
    }
  }
  return variants.length;
}

export { priceForMargin } from "./pricing";
