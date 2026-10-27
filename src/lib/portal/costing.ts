import prisma from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { formatJalaliShort } from "@/lib/jalali";
import { overheadInfo } from "@/lib/costing/engine";
import type { FixedCostCategoryKey } from "@/lib/costing/pricing";

// ==============================================================
// بهای تمام‌شده — the cost sheet of each package (variant). The sum of
// its items is written to ProductVariant.costPrice, which every new order
// line copies (OrderItem.unitCost), so COGS and profit in «حسابداری و سود»
// follow automatically.
// ==============================================================

export const COST_CATEGORY_LABELS = {
  RAW_MATERIAL: "ماده اولیه",
  CAPSULE: "کپسول و قرص‌سازی",
  PACKAGING: "قوطی و بسته‌بندی",
  LABEL: "برچسب و چاپ",
  BOX: "جعبه و بروشور",
  LAB_TEST: "آزمایش و مجوز",
  PRODUCTION: "دستمزد تولید",
  LOGISTICS: "حمل تا انبار",
  OVERHEAD: "سربار",
  OTHER: "سایر",
} as const;
export type CostCategoryKey = keyof typeof COST_CATEGORY_LABELS;

export interface CostItemDTO {
  id: string;
  title: string;
  category: CostCategoryKey;
  quantity: number;
  unitCost: number;
  inputId: string | null;
  note: string;
}

export interface CostInputDTO {
  id: string;
  title: string;
  unit: string;
  price: number;
  category: CostCategoryKey;
  note: string;
  usedBy: number;
  updatedAt: string;
}

export interface FixedCostDTO {
  id: string;
  title: string;
  category: FixedCostCategoryKey;
  monthlyAmount: number;
  isActive: boolean;
  note: string;
}

export interface CostingVariant {
  id: string;
  productTitle: string;
  title: string;
  sku: string;
  price: number;
  compareAtPrice: number | null;
  costPrice: number;
  fullCostPrice: number;
  overheadUnits: number;
  targetMargin: number | null;
  sold30d: number;
  items: CostItemDTO[];
  updatedAt: string | null;
}

export async function loadCosting() {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [variants, settings, sold, inputs, fixed, overhead] = await Promise.all([
    prisma.productVariant.findMany({
      orderBy: [{ product: { sortOrder: "asc" } }, { sortOrder: "asc" }],
      include: { product: { select: { title: true } }, costItems: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] } },
    }),
    getSettings(),
    prisma.orderItem.groupBy({
      by: ["variantId"],
      where: { order: { createdAt: { gte: since }, status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] } } },
      _sum: { quantity: true },
    }),
    prisma.costInput.findMany({ orderBy: [{ category: "asc" }, { title: "asc" }], include: { _count: { select: { items: true } } } }),
    prisma.fixedCost.findMany({ orderBy: [{ isActive: "desc" }, { monthlyAmount: "desc" }] }),
    overheadInfo(),
  ]);
  const soldMap = new Map(sold.map((s) => [s.variantId, s._sum.quantity ?? 0]));
  return {
    variants: variants.map((v) => ({
      id: v.id,
      productTitle: v.product.title,
      title: v.title,
      sku: v.sku,
      price: v.price,
      compareAtPrice: v.compareAtPrice,
      costPrice: v.costPrice,
      fullCostPrice: v.fullCostPrice || v.costPrice,
      overheadUnits: v.overheadUnits,
      targetMargin: v.targetMargin,
      sold30d: soldMap.get(v.id) ?? 0,
      updatedAt: v.costItems.length ? formatJalaliShort(v.costItems.reduce((a, b) => (a.updatedAt > b.updatedAt ? a : b)).updatedAt) : null,
      items: v.costItems.map((i) => ({ id: i.id, title: i.title, category: i.category, quantity: i.quantity, unitCost: i.unitCost, inputId: i.inputId, note: i.note ?? "" })),
    })) as CostingVariant[],
    inputs: inputs.map((i) => ({
      id: i.id,
      title: i.title,
      unit: i.unit,
      price: i.price,
      category: i.category,
      note: i.note ?? "",
      usedBy: i._count.items,
      updatedAt: formatJalaliShort(i.updatedAt),
    })) as CostInputDTO[],
    fixed: fixed.map((f) => ({ id: f.id, title: f.title, category: f.category, monthlyAmount: f.monthlyAmount, isActive: f.isActive, note: f.note ?? "" })) as FixedCostDTO[],
    overhead,
    rules: {
      rounding: Math.max(1, Number(settings.COSTING_PRICE_ROUNDING) || 1000),
      maxCommission: Math.max(Number(settings.COMMISSION_SILVER) || 0, Number(settings.COMMISSION_GOLD) || 0, Number(settings.COMMISSION_DIAMOND) || 0),
      ambassadorDiscount: Number(settings.AMBASSADOR_CUSTOMER_DISCOUNT) || 0,
    },
  };
}
export type CostingData = Awaited<ReturnType<typeof loadCosting>>;
