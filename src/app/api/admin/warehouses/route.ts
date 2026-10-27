import { requireApi, logAudit } from "@/lib/rbac/server";
import { moduleGuard } from "@/lib/modules/server";
import { ok, fail, readJson, str, int } from "@/lib/api/respond";
import prisma from "@/lib/prisma";
import { moveWarehouseStock, WarehouseError } from "@/lib/commerce/warehouses";

async function guard() {
  const auth = await requireApi("inventory.manage");
  if (auth instanceof Response) return auth;
  return (await moduleGuard("warehouses")) ?? auth;
}

// انبار جدید
export async function POST(req: Request) {
  const auth = await guard();
  if (auth instanceof Response) return auth;
  const b = await readJson(req);
  const name = str(b.name, 60);
  if (!name) return fail("نام انبار را وارد کنید.");
  if (await prisma.warehouse.findUnique({ where: { name } })) return fail("انباری با این نام هست.");
  const w = await prisma.warehouse.create({ data: { name, city: str(b.city, 40) || null } });
  await logAudit(auth.userId, "warehouse.create", w.name, {});
  return ok({}, "انبار اضافه شد.");
}

// فعال/غیرفعال یا انبار پیش‌فرض
export async function PATCH(req: Request) {
  const auth = await guard();
  if (auth instanceof Response) return auth;
  const b = await readJson(req);
  const w = await prisma.warehouse.findUnique({ where: { id: str(b.id, 40) }, include: { stocks: true } });
  if (!w) return fail("انبار پیدا نشد.");
  if (b.isDefault === true) {
    if (!w.isActive) return fail("انبار غیرفعال نمی‌تواند پیش‌فرض باشد.");
    await prisma.$transaction([prisma.warehouse.updateMany({ data: { isDefault: false } }), prisma.warehouse.update({ where: { id: w.id }, data: { isDefault: true } })]);
  } else if (typeof b.isActive === "boolean") {
    if (!b.isActive && w.isDefault) return fail("انبار پیش‌فرض را نمی‌توان غیرفعال کرد؛ اول انبار دیگری را پیش‌فرض کنید.");
    if (!b.isActive && w.stocks.some((s) => s.quantity > 0)) return fail("این انبار هنوز موجودی دارد؛ اول موجودی را منتقل کنید.");
    await prisma.warehouse.update({ where: { id: w.id }, data: { isActive: b.isActive } });
  }
  await logAudit(auth.userId, "warehouse.update", w.name, { isDefault: b.isDefault, isActive: b.isActive });
  return ok({}, "انبار به‌روز شد.");
}

// انتقال بین انبارها (موجودی قابل فروش تغییر نمی‌کند)
export async function PUT(req: Request) {
  const auth = await guard();
  if (auth instanceof Response) return auth;
  const b = await readJson(req);
  const fromId = str(b.fromId, 40);
  const toId = str(b.toId, 40);
  const variantId = str(b.variantId, 40);
  const quantity = int(b.quantity) ?? 0;
  if (quantity <= 0) return fail("تعداد باید بیشتر از صفر باشد.");
  if (!fromId || fromId === toId) return fail("انبار مبدأ و مقصد باید متفاوت باشند.");
  const to = await prisma.warehouse.findFirst({ where: { id: toId, isActive: true } });
  if (!to) return fail("انبار مقصد پیدا نشد یا غیرفعال است.");
  try {
    await prisma.$transaction(async (tx) => {
      await moveWarehouseStock(tx, fromId, variantId, -quantity);
      await moveWarehouseStock(tx, toId, variantId, quantity);
      await tx.stockTransfer.create({ data: { fromId, toId, variantId, quantity, note: str(b.note, 200) || null, createdById: auth.userId } });
    });
  } catch (err) {
    if (err instanceof WarehouseError) return fail(err.message);
    throw err;
  }
  await logAudit(auth.userId, "warehouse.transfer", to.name, { fromId, variantId, quantity });
  return ok({}, "انتقال ثبت شد.");
}
