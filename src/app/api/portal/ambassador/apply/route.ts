import { requireApi, hasPermission } from "@/lib/rbac/server";
import { moduleGuard } from "@/lib/modules/server";
import { ok, fail, readJson, str } from "@/lib/api/respond";
import prisma from "@/lib/prisma";
import { notify } from "@/lib/notifications";
import { isValidIranianSheba } from "@/lib/validators";
import { toEnglishDigits } from "@/lib/currency";

export async function POST(req: Request) {
  const auth = await requireApi("portal.customer");
  if (auth instanceof Response) return auth;
  const off = await moduleGuard("ambassadors");
  if (off) return off;
  if (hasPermission(auth, "portal.ambassador")) return fail("شما در حال حاضر سفیر برند هستید.");

  const pending = await prisma.ambassadorApplication.findFirst({ where: { userId: auth.userId, status: "PENDING" } });
  if (pending) return fail("درخواست قبلی شما در حال بررسی است.");

  const b = await readJson(req);
  const fullName = str(b.fullName, 80);
  const profession = str(b.profession, 120);
  const city = str(b.city, 60);
  const licenseNumber = str(b.licenseNumber, 40);
  let sheba = toEnglishDigits(str(b.shebaNumber, 40)).toUpperCase().replace(/\s/g, "");
  if (sheba && !sheba.startsWith("IR")) sheba = "IR" + sheba;

  if (fullName.length < 3) return fail("نام و نام خانوادگی کامل را وارد کنید.");
  if (!profession || !city) return fail("حوزه فعالیت و شهر الزامی است.");
  if (sheba && !isValidIranianSheba(sheba)) return fail("شماره شبا معتبر نیست.");

  await prisma.ambassadorApplication.create({
    data: {
      userId: auth.userId,
      fullName,
      profession,
      city,
      licenseNumber: licenseNumber || null,
      shebaNumber: sheba || null,
      socialLink: str(b.socialLink, 200) || null,
      audience: str(b.audience, 200) || null,
      motivation: str(b.motivation, 1000) || null,
    },
  });
  await notify("ambassador.application", { data: { name: fullName, profession, city } });
  return ok({}, "درخواست شما ثبت شد. نتیجه بررسی با پیامک اطلاع داده می‌شود.");
}
