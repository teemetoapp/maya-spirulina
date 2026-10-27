import { requireApi, hasPermission, logAudit } from "@/lib/rbac/server";
import { ok, fail, readJson, str, int } from "@/lib/api/respond";
import prisma from "@/lib/prisma";
import { formatToman } from "@/lib/currency";

// Save the target margin and, with products.manage, publish the new site price
export async function POST(req: Request) {
  const auth = await requireApi("costing.manage", "products.manage");
  if (auth instanceof Response) return auth;
  const b = await readJson(req);
  const variant = await prisma.productVariant.findUnique({ where: { id: str(b.variantId, 40) } });
  if (!variant) return fail("بسته پیدا نشد.", 404);
  const targetMargin = int(b.targetMargin);
  if (targetMargin === null || targetMargin < 0 || targetMargin > 95) return fail("حاشیه سود باید بین ۰ تا ۹۵ درصد باشد.");

  const publish = b.publish === true;
  if (!publish) {
    await prisma.productVariant.update({ where: { id: variant.id }, data: { targetMargin } });
    return ok({}, "حاشیه سود هدف ذخیره شد.");
  }
  if (!hasPermission(auth, "products.manage")) return fail("تغییر قیمت سایت به دسترسی «ویرایش محصولات و قیمت‌ها» نیاز دارد.", 403);
  const price = int(b.price);
  if (price === null || price < 1000) return fail("قیمت نامعتبر است.");
  // قیمت خط‌خورده اگر کمتر از قیمت جدید شود حذف می‌شود
  const compareAtPrice = variant.compareAtPrice && variant.compareAtPrice > price ? variant.compareAtPrice : null;
  await prisma.productVariant.update({ where: { id: variant.id }, data: { price, targetMargin, compareAtPrice } });
  await logAudit(auth.userId, "product.price", variant.sku, { from: variant.price, to: price, targetMargin });
  return ok({}, `قیمت سایت ${formatToman(price)} شد.`);
}
