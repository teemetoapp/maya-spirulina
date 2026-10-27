import prisma from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { parseWholesaleTiers } from "@/lib/commerce/pricing";
import { ORDER_STATUS_LABELS } from "@/lib/commerce/dto";

export interface WholesaleData {
  minQty: number;
  tiers: { min: number; pct: number }[];
  products: { sku: string; title: string; price: number; stock: number }[];
  orders: { orderNumber: string; createdAt: string; status: string; items: number; total: number }[];
}

export async function loadWholesaleData(userId: string): Promise<WholesaleData> {
  const [s, variants, orders] = await Promise.all([
    getSettings(),
    prisma.productVariant.findMany({
      where: { isActive: true, product: { isActive: true } },
      include: { product: { select: { title: true } } },
      orderBy: [{ product: { title: "asc" } }, { price: "asc" }],
    }),
    prisma.order.findMany({
      where: { userId, salesChannel: "WHOLESALE" },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { items: { select: { quantity: true } } },
    }),
  ]);
  return {
    minQty: Number(s.WHOLESALE_MIN_QTY) || 0,
    tiers: parseWholesaleTiers(s.WHOLESALE_TIERS),
    products: variants.map((v) => ({
      sku: v.sku,
      title: `${v.product.title} - ${v.title} (${v.format === "CAPSULE" ? "کپسول" : "پودر"})`,
      price: v.price,
      stock: v.stock,
    })),
    orders: orders.map((o) => ({
      orderNumber: o.orderNumber,
      createdAt: o.createdAt.toISOString(),
      status: ORDER_STATUS_LABELS[o.status],
      items: o.items.reduce((n, i) => n + i.quantity, 0),
      total: o.totalProductAmount - o.discountAmount + o.shippingFee,
    })),
  };
}
