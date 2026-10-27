import { requireApi, logAudit } from "@/lib/rbac/server";
import { ok, fail, readJson, str, int } from "@/lib/api/respond";
import prisma from "@/lib/prisma";
import { moveWarehouseStock, resolveWarehouseId, WarehouseError } from "@/lib/commerce/warehouses";

// Receive a production batch: adds the quantity to the variant's stock
export async function POST(req: Request) {
  const auth = await requireApi("inventory.manage");
  if (auth instanceof Response) return auth;
  const b = await readJson(req);
  const variantId = str(b.variantId, 40);
  const batchCode = str(b.batchCode, 40).toUpperCase();
  const quantity = int(b.quantity) ?? 0;
  const productionDate = new Date(str(b.productionDate, 20));
  const expiryDate = new Date(str(b.expiryDate, 20));

  if (!batchCode) return fail("کد بچ الزامی است.");
  if (quantity <= 0) return fail("تعداد باید بیشتر از صفر باشد.");
  if (isNaN(productionDate.getTime()) || isNaN(expiryDate.getTime())) return fail("تاریخ تولید و انقضا را وارد کنید.");
  if (expiryDate <= productionDate) return fail("تاریخ انقضا باید بعد از تاریخ تولید باشد.");
  if (await prisma.inventoryBatch.findUnique({ where: { batchCode } })) return fail("این کد بچ قبلاً ثبت شده است.");

  const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
  if (!variant) return fail("بسته پیدا نشد.");
  try {
    await prisma.$transaction(async (tx) => {
      const warehouseId = await resolveWarehouseId(tx, str(b.warehouseId, 40) || null);
      await tx.inventoryBatch.create({
        data: { variantId, batchCode, quantity, productionDate, expiryDate, warehouseId, labReportUrl: str(b.labReportUrl, 300) || null },
      });
      await tx.productVariant.update({ where: { id: variantId }, data: { stock: { increment: quantity } } });
      await moveWarehouseStock(tx, warehouseId, variantId, quantity);
    });
  } catch (err) {
    if (err instanceof WarehouseError) return fail(err.message);
    throw err;
  }
  await logAudit(auth.userId, "inventory.batch", batchCode, { sku: variant.sku, quantity });
  return ok({}, "بچ ثبت شد و به موجودی اضافه شد.");
}

// Manual stock adjustment (count correction, damage, samples) with a reason
export async function PATCH(req: Request) {
  const auth = await requireApi("inventory.manage");
  if (auth instanceof Response) return auth;
  const b = await readJson(req);
  const variantId = str(b.variantId, 40);
  const delta = int(b.delta) ?? 0;
  const reason = str(b.reason, 200);
  if (delta === 0) return fail("مقدار تغییر را وارد کنید.");
  if (!reason) return fail("دلیل اصلاح موجودی الزامی است.");
  // اصلاح شمارش انبار: هم موجودی قابل فروش و هم موجودی فیزیکی همان انبار
  try {
    await prisma.$transaction(async (tx) => {
      const res = await tx.productVariant.updateMany({
        where: { id: variantId, stock: { gte: delta < 0 ? -delta : 0 } },
        data: { stock: { increment: delta } },
      });
      if (res.count === 0) throw new WarehouseError("موجودی برای این کسر کافی نیست.");
      await moveWarehouseStock(tx, await resolveWarehouseId(tx, str(b.warehouseId, 40) || null), variantId, delta);
    });
  } catch (err) {
    if (err instanceof WarehouseError) return fail(err.message);
    throw err;
  }
  const v = await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } });
  await logAudit(auth.userId, "inventory.adjust", v.sku, { delta, reason, stock: v.stock });
  return ok({}, "موجودی اصلاح شد.");
}

// Batch tracing fields for the public /batch/<code> page (QR on the pack).
// A batch can be public only with a lab document; nothing is shown without one.
export async function PUT(req: Request) {
  const auth = await requireApi("inventory.manage");
  if (auth instanceof Response) return auth;
  const b = await readJson(req);
  const id = str(b.id, 40);
  const labReportUrl = str(b.labReportUrl, 300);
  const harvestRaw = str(b.harvestDate, 20);
  const harvestDate = harvestRaw ? new Date(harvestRaw) : null;
  const isPublic = b.isPublic === true;
  if (harvestDate && isNaN(harvestDate.getTime())) return fail("تاریخ برداشت نامعتبر است.");
  if (labReportUrl && !/^(https:\/\/|\/lab-reports\/)/.test(labReportUrl)) return fail("لینک برگه آزمایش باید با https:// یا /lab-reports/ شروع شود.");
  if (isPublic && !labReportUrl) return fail("بدون برگه آزمایش، بچ قابل انتشار نیست.");
  const batch = await prisma.inventoryBatch.findUnique({ where: { id } });
  if (!batch) return fail("بچ پیدا نشد.");
  if (harvestDate && harvestDate > batch.productionDate) return fail("تاریخ برداشت نمی‌تواند بعد از تاریخ تولید باشد.");
  await prisma.inventoryBatch.update({
    where: { id },
    data: { harvestDate, labName: str(b.labName, 120) || null, labSummary: str(b.labSummary, 1000) || null, labReportUrl: labReportUrl || null, isPublic },
  });
  await logAudit(auth.userId, "inventory.trace", batch.batchCode, { isPublic });
  return ok({}, isPublic ? "اطلاعات بچ منتشر شد." : "اطلاعات بچ ذخیره شد (منتشر نشده).");
}
