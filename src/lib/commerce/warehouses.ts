import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

// ==============================================================
// Physical stock per warehouse. ProductVariant.stock stays the sellable
// count (reserved at checkout); a warehouse's stock drops when an order
// is shipped from it. Without the warehouses module everything uses the
// default warehouse, so the numbers stay consistent when it is turned on.
// ==============================================================

type Db = Prisma.TransactionClient | typeof prisma;

export class WarehouseError extends Error {}

export const DEFAULT_WAREHOUSE_NAME = "انبار مرکزی";

export async function defaultWarehouseId(db: Db = prisma): Promise<string> {
  const found = await db.warehouse.findFirst({ where: { isDefault: true }, select: { id: true } });
  if (found) return found.id;
  const created = await db.warehouse.upsert({ where: { name: DEFAULT_WAREHOUSE_NAME }, update: { isDefault: true }, create: { name: DEFAULT_WAREHOUSE_NAME, isDefault: true } });
  return created.id;
}

/** Adds (or with a negative delta removes) physical stock; never lets a warehouse go below zero. */
export async function moveWarehouseStock(db: Db, warehouseId: string, variantId: string, delta: number) {
  if (delta === 0) return;
  if (delta > 0) {
    await db.warehouseStock.upsert({
      where: { warehouseId_variantId: { warehouseId, variantId } },
      update: { quantity: { increment: delta } },
      create: { warehouseId, variantId, quantity: delta },
    });
    return;
  }
  const res = await db.warehouseStock.updateMany({ where: { warehouseId, variantId, quantity: { gte: -delta } }, data: { quantity: { increment: delta } } });
  if (res.count === 0) {
    const [w, v] = await Promise.all([db.warehouse.findUnique({ where: { id: warehouseId } }), db.productVariant.findUnique({ where: { id: variantId } })]);
    throw new WarehouseError(`موجودی «${v?.sku ?? "کالا"}» در «${w?.name ?? "انبار"}» کافی نیست.`);
  }
}

export async function resolveWarehouseId(db: Db, id: string | null | undefined): Promise<string> {
  if (id) {
    const w = await db.warehouse.findFirst({ where: { id, isActive: true }, select: { id: true } });
    if (!w) throw new WarehouseError("انبار انتخاب‌شده پیدا نشد یا غیرفعال است.");
    return w.id;
  }
  return defaultWarehouseId(db);
}

export interface WarehouseView {
  id: string;
  name: string;
  city: string;
  isDefault: boolean;
  isActive: boolean;
  stock: Record<string, number>; // variantId → quantity
}

export async function loadWarehouses(): Promise<{ warehouses: WarehouseView[]; transfers: { id: string; at: string; from: string; to: string; sku: string; quantity: number; note: string }[] }> {
  await defaultWarehouseId();
  const [rows, transfers] = await Promise.all([
    prisma.warehouse.findMany({ orderBy: [{ isDefault: "desc" }, { name: "asc" }], include: { stocks: true } }),
    prisma.stockTransfer.findMany({ orderBy: { createdAt: "desc" }, take: 30, include: { from: true, to: true, variant: { select: { sku: true } } } }),
  ]);
  return {
    warehouses: rows.map((w) => ({
      id: w.id,
      name: w.name,
      city: w.city ?? "",
      isDefault: w.isDefault,
      isActive: w.isActive,
      stock: Object.fromEntries(w.stocks.map((s) => [s.variantId, s.quantity])),
    })),
    transfers: transfers.map((t) => ({ id: t.id, at: t.createdAt.toISOString(), from: t.from.name, to: t.to.name, sku: t.variant.sku, quantity: t.quantity, note: t.note ?? "" })),
  };
}
