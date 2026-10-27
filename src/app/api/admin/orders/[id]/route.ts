import { requireApi, logAudit } from "@/lib/rbac/server";
import { ok, fail, readJson, str, handleError } from "@/lib/api/respond";
import prisma from "@/lib/prisma";
import { changeOrderStatus, OrderError, CARRIERS, type CarrierKey } from "@/lib/commerce/orders";
import { WarehouseError } from "@/lib/commerce/warehouses";
import type { OrderStatus } from "@prisma/client";

const STATUSES: OrderStatus[] = ["PENDING", "PAID", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];

// Staff: change status, tracking code or internal note
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApi("orders.manage");
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const b = await readJson(req);
  const status = str(b.status, 20) as OrderStatus;
  const trackingCode = str(b.trackingCode, 40) || null;
  const note = typeof b.note === "string" ? str(b.note, 1000) : null;
  const carrierRaw = str(b.carrier, 10);
  const carrier = Object.hasOwn(CARRIERS, carrierRaw) ? (carrierRaw as CarrierKey) : null;

  try {
    if (status) {
      if (!STATUSES.includes(status)) return fail("وضعیت نامعتبر است.");
      if (status === "PAID") return fail("وضعیت پرداخت فقط از طریق درگاه ثبت می‌شود.");
      await changeOrderStatus(id, status, auth.userId, { trackingCode, note, carrier, restock: b.restock !== false, warehouseId: str(b.warehouseId, 40) || null });
      return ok({}, "وضعیت سفارش تغییر کرد.");
    }
    const order = await prisma.order.update({
      where: { id },
      data: { ...(trackingCode ? { trackingCode } : {}), ...(carrier ? { shippingCarrier: carrier } : {}), ...(note !== null ? { adminNote: note } : {}) },
    });
    await logAudit(auth.userId, "order.update", order.orderNumber, { trackingCode, note });
    return ok({}, "سفارش به‌روز شد.");
  } catch (err) {
    return handleError(err, [OrderError, WarehouseError]);
  }
}
