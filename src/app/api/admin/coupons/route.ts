import { requireApi, logAudit } from "@/lib/rbac/server";
import { ok, fail, readJson, str, int } from "@/lib/api/respond";
import prisma from "@/lib/prisma";

function couponData(b: Record<string, unknown>) {
  const expires = str(b.expiresAt, 20);
  return {
    description: str(b.description, 200) || null,
    type: b.type === "FIXED" ? ("FIXED" as const) : ("PERCENT" as const),
    value: int(b.value) ?? 0,
    minAmount: int(b.minAmount) ?? 0,
    maxDiscount: int(b.maxDiscount) || null,
    maxUses: int(b.maxUses) || null,
    expiresAt: expires ? new Date(expires) : null,
    isActive: b.isActive !== false,
  };
}

function validate(d: ReturnType<typeof couponData>) {
  if (d.value <= 0) return "مقدار تخفیف باید بیشتر از صفر باشد.";
  if (d.type === "PERCENT" && d.value > 100) return "درصد تخفیف نمی‌تواند بیش از ۱۰۰ باشد.";
  if (d.expiresAt && isNaN(d.expiresAt.getTime())) return "تاریخ انقضا معتبر نیست.";
  return null;
}

export async function POST(req: Request) {
  const auth = await requireApi("marketing.manage");
  if (auth instanceof Response) return auth;
  const b = await readJson(req);
  const code = str(b.code, 30).toUpperCase();
  const data = couponData(b);
  if (!/^[A-Z0-9-]{3,30}$/.test(code)) return fail("کد باید حروف انگلیسی، عدد و خط تیره باشد.");
  const err = validate(data);
  if (err) return fail(err);
  if (await prisma.coupon.findUnique({ where: { code } })) return fail("این کد قبلاً ساخته شده است.");
  await prisma.coupon.create({ data: { ...data, code } });
  await logAudit(auth.userId, "coupon.create", code, { type: data.type, value: data.value });
  return ok({}, "کد تخفیف ساخته شد.");
}

export async function PATCH(req: Request) {
  const auth = await requireApi("marketing.manage");
  if (auth instanceof Response) return auth;
  const b = await readJson(req);
  const id = str(b.id, 40);
  const data = couponData(b);
  const err = validate(data);
  if (err) return fail(err);
  const c = await prisma.coupon.update({ where: { id }, data });
  await logAudit(auth.userId, "coupon.update", c.code, { isActive: data.isActive, value: data.value });
  return ok({}, "کد تخفیف ذخیره شد.");
}

export async function DELETE(req: Request) {
  const auth = await requireApi("marketing.manage");
  if (auth instanceof Response) return auth;
  const id = str((await readJson(req)).id, 40);
  const c = await prisma.coupon.findUnique({ where: { id } });
  if (!c) return fail("کد پیدا نشد.", 404);
  // کدهای استفاده‌شده برای حفظ سابقه سفارش‌ها فقط غیرفعال می‌شوند
  if (c.usedCount > 0) {
    await prisma.coupon.update({ where: { id }, data: { isActive: false } });
  } else {
    await prisma.coupon.delete({ where: { id } });
  }
  await logAudit(auth.userId, "coupon.delete", c.code);
  return ok({}, c.usedCount > 0 ? "این کد استفاده شده بود؛ غیرفعال شد." : "کد حذف شد.");
}
