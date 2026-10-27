import { requireApi } from "@/lib/rbac/server";
import { ok, fail, readJson, str } from "@/lib/api/respond";
import prisma from "@/lib/prisma";
import { PROFILE_FIELDS, GENDER_LABELS } from "@/lib/crm/profile-fields";

export async function PATCH(req: Request) {
  const auth = await requireApi();
  if (auth instanceof Response) return auth;
  const b = await readJson(req);
  const email = str(b.email, 120);
  const nationalCode = str(b.nationalCode, 10);
  const birthDate = str(b.birthDate, 10);
  const shebaNumber = str(b.shebaNumber, 26).toUpperCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("ایمیل معتبر نیست.");
  if (nationalCode && !/^\d{10}$/.test(nationalCode)) return fail("کد ملی باید ۱۰ رقم باشد.");
  if (shebaNumber && !/^IR\d{24}$/.test(shebaNumber)) return fail("شماره شبا باید با IR و ۲۴ رقم باشد.");
  if (nationalCode) {
    const taken = await prisma.user.findFirst({ where: { nationalCode, NOT: { id: auth.userId } }, select: { id: true } });
    if (taken) return fail("این کد ملی برای حساب دیگری ثبت شده است.");
  }
  // فیلدهای تکمیلی پروفایل (در «مخاطبان» هم دیده می‌شوند)
  const extra: Record<string, string | null> = {};
  for (const f of PROFILE_FIELDS) {
    if (typeof b[f.key] === "string") extra[f.key] = str(b[f.key], f.max) || null;
  }
  if (extra.instagram) extra.instagram = extra.instagram.replace(/^@/, "");
  if (extra.website && !/^https?:\/\//.test(extra.website)) return fail("آدرس وب‌سایت باید با http شروع شود.");
  const gender = str(b.gender, 10);
  if (gender && !Object.hasOwn(GENDER_LABELS, gender)) return fail("جنسیت نامعتبر است.");

  // رضایت پیامک تبلیغاتی: زمان دادن و پس گرفتن رضایت ثبت می‌شود
  let consent = {};
  if (typeof b.smsConsent === "boolean") {
    const cur = await prisma.user.findUnique({ where: { id: auth.userId }, select: { smsConsent: true } });
    if (cur && cur.smsConsent !== b.smsConsent)
      consent = b.smsConsent ? { smsConsent: true, smsConsentAt: new Date(), smsOptOutAt: null } : { smsConsent: false, smsOptOutAt: new Date() };
  }

  await prisma.user.update({
    where: { id: auth.userId },
    data: {
      ...extra,
      ...(typeof b.gender === "string" ? { gender: (gender || null) as keyof typeof GENDER_LABELS | null } : {}),
      profileUpdatedAt: new Date(),
      name: str(b.name, 80) || null,
      email: email || null,
      nationalCode: nationalCode || null,
      birthDate: birthDate || null,
      ...(typeof b.shebaNumber === "string" ? { shebaNumber: shebaNumber || null } : {}),
      notifySms: b.notifySms !== false,
      notifyTelegram: b.notifyTelegram !== false,
      notifyEmail: b.notifyEmail !== false,
      ...consent,
    },
  });
  return ok({}, "پروفایل ذخیره شد.");
}
