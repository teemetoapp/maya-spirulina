import { requireApi, logAudit } from "@/lib/rbac/server";
import { ok, fail, readJson, str, int } from "@/lib/api/respond";
import prisma from "@/lib/prisma";

function variantData(b: Record<string, unknown>) {
  return {
    title: str(b.title, 120),
    format: b.format === "POWDER" ? ("POWDER" as const) : ("CAPSULE" as const),
    durationDays: int(b.durationDays) ?? 30,
    packDescription: str(b.packDescription, 200) || null,
    badge: str(b.badge, 40) || null,
    price: int(b.price) ?? 0,
    compareAtPrice: int(b.compareAtPrice) || null,
    costPrice: int(b.costPrice) ?? 0,
    lowStockAlert: int(b.lowStockAlert) ?? 10,
    weightGrams: int(b.weightGrams) || null,
    isActive: b.isActive !== false,
    sortOrder: int(b.sortOrder) ?? 0,
  };
}

function validate(d: ReturnType<typeof variantData>): string | null {
  if (!d.title) return "عنوان بسته الزامی است.";
  if (d.price <= 0) return "قیمت فروش باید بیشتر از صفر باشد.";
  if (d.compareAtPrice && d.compareAtPrice <= d.price) return "قیمت قبل از تخفیف باید از قیمت فروش بیشتر باشد.";
  if (d.durationDays <= 0) return "دوره مصرف معتبر نیست.";
  return null;
}

export async function POST(req: Request) {
  const auth = await requireApi("products.manage");
  if (auth instanceof Response) return auth;
  const b = await readJson(req);
  const sku = str(b.sku, 40).toUpperCase();
  const productId = str(b.productId, 40);
  const data = variantData(b);
  const err = validate(data);
  if (err) return fail(err);
  if (!/^[A-Z0-9-]{3,40}$/.test(sku)) return fail("SKU باید حروف انگلیسی بزرگ، عدد و خط تیره باشد.");
  if (await prisma.productVariant.findUnique({ where: { sku } })) return fail("این SKU قبلاً استفاده شده است.");
  if (!(await prisma.product.findUnique({ where: { id: productId } }))) return fail("محصول پیدا نشد.");
  await prisma.productVariant.create({ data: { ...data, sku, productId, stock: 0 } });
  await logAudit(auth.userId, "variant.create", sku);
  return ok({}, "بسته جدید ساخته شد. موجودی را از تب انبار با ثبت بچ تولید اضافه کنید.");
}

export async function PATCH(req: Request) {
  const auth = await requireApi("products.manage");
  if (auth instanceof Response) return auth;
  const b = await readJson(req);
  const id = str(b.id, 40);
  const data = variantData(b);
  const err = validate(data);
  if (err) return fail(err);
  const before = await prisma.productVariant.findUnique({ where: { id }, include: { _count: { select: { costItems: true } } } });
  if (!before) return fail("بسته پیدا نشد.", 404);
  // وقتی برگه بهای تمام‌شده دارد، قیمت تمام‌شده فقط از ماژول «بهای تمام‌شده» تغییر می‌کند
  const { costPrice, ...rest } = data;
  await prisma.productVariant.update({ where: { id }, data: before._count.costItems > 0 ? rest : { ...rest, costPrice } });
  await logAudit(auth.userId, "variant.update", before.sku, {
    price: [before.price, data.price],
    isActive: [before.isActive, data.isActive],
  });
  return ok({}, "بسته ذخیره شد.");
}
