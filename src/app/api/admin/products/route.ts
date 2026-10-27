import { requireApi, logAudit } from "@/lib/rbac/server";
import { ok, fail, readJson, str, int } from "@/lib/api/respond";
import prisma from "@/lib/prisma";

function productData(b: Record<string, unknown>) {
  const list = (v: unknown) =>
    (Array.isArray(v) ? v : typeof v === "string" ? v.split("\n") : [])
      .map((x) => String(x).trim())
      .filter(Boolean)
      .slice(0, 20);
  return {
    title: str(b.title, 120),
    subtitle: str(b.subtitle, 200) || null,
    shortDescription: str(b.shortDescription, 500) || null,
    description: str(b.description, 10000),
    dosageInstructions: str(b.dosageInstructions, 2000) || null,
    benefits: list(b.benefits),
    images: list(b.images),
    isActive: b.isActive !== false,
    isFeatured: b.isFeatured === true,
    sortOrder: int(b.sortOrder) ?? 0,
  };
}

export async function POST(req: Request) {
  const auth = await requireApi("products.manage");
  if (auth instanceof Response) return auth;
  const b = await readJson(req);
  const slug = str(b.slug, 80).toLowerCase();
  const data = productData(b);
  if (!/^[a-z0-9-]{3,80}$/.test(slug)) return fail("اسلاگ باید حروف انگلیسی کوچک، عدد و خط تیره باشد.");
  if (!data.title || !data.description) return fail("عنوان و توضیحات محصول الزامی است.");
  if (await prisma.product.findUnique({ where: { slug } })) return fail("این اسلاگ قبلاً استفاده شده است.");
  const product = await prisma.$transaction(async (tx) => {
    if (data.isFeatured) await tx.product.updateMany({ data: { isFeatured: false } });
    return tx.product.create({ data: { ...data, slug } });
  });
  await logAudit(auth.userId, "product.create", slug);
  return ok({ id: product.id }, "محصول ساخته شد. حالا برای آن بسته (واریانت) تعریف کنید.");
}

export async function PATCH(req: Request) {
  const auth = await requireApi("products.manage");
  if (auth instanceof Response) return auth;
  const b = await readJson(req);
  const id = str(b.id, 40);
  const data = productData(b);
  if (!data.title || !data.description) return fail("عنوان و توضیحات محصول الزامی است.");
  await prisma.$transaction(async (tx) => {
    // فقط یک محصول قهرمان صفحه اصلی است
    if (data.isFeatured) await tx.product.updateMany({ where: { NOT: { id } }, data: { isFeatured: false } });
    await tx.product.update({ where: { id }, data });
  });
  await logAudit(auth.userId, "product.update", id, { title: data.title, isActive: data.isActive });
  return ok({}, "محصول ذخیره شد.");
}
