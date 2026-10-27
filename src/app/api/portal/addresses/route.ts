import { requireApi } from "@/lib/rbac/server";
import { ok, fail, readJson, str } from "@/lib/api/respond";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  const auth = await requireApi("portal.customer");
  if (auth instanceof Response) return auth;
  const b = await readJson(req);
  const data = {
    title: str(b.title, 40) || "آدرس من",
    recipient: str(b.recipient, 80),
    phone: str(b.phone, 15),
    province: str(b.province, 40),
    city: str(b.city, 40),
    address: str(b.address, 400),
    postalCode: str(b.postalCode, 10),
  };
  if (!data.recipient || !data.city || !data.address) return fail("نام گیرنده، شهر و نشانی الزامی است.");
  if (!/^09\d{9}$/.test(data.phone)) return fail("شماره موبایل گیرنده معتبر نیست.");
  if (!/^\d{10}$/.test(data.postalCode)) return fail("کد پستی باید ۱۰ رقم باشد.");
  const count = await prisma.address.count({ where: { userId: auth.userId } });
  if (count >= 10) return fail("حداکثر ۱۰ نشانی می‌توانید ذخیره کنید.");
  await prisma.address.create({ data: { ...data, userId: auth.userId, isDefault: count === 0 } });
  return ok({}, "نشانی ذخیره شد.");
}

// Set as default
export async function PATCH(req: Request) {
  const auth = await requireApi("portal.customer");
  if (auth instanceof Response) return auth;
  const id = str((await readJson(req)).id, 40);
  const addr = await prisma.address.findFirst({ where: { id, userId: auth.userId } });
  if (!addr) return fail("نشانی پیدا نشد.", 404);
  await prisma.$transaction([
    prisma.address.updateMany({ where: { userId: auth.userId }, data: { isDefault: false } }),
    prisma.address.update({ where: { id }, data: { isDefault: true } }),
  ]);
  return ok({}, "نشانی پیش‌فرض تغییر کرد.");
}

export async function DELETE(req: Request) {
  const auth = await requireApi("portal.customer");
  if (auth instanceof Response) return auth;
  const id = str((await readJson(req)).id, 40);
  const res = await prisma.address.deleteMany({ where: { id, userId: auth.userId } });
  if (res.count === 0) return fail("نشانی پیدا نشد.", 404);
  return ok({}, "نشانی حذف شد.");
}
