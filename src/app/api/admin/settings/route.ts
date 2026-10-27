import { requireApi, logAudit } from "@/lib/rbac/server";
import { ok, fail, readJson } from "@/lib/api/respond";
import prisma from "@/lib/prisma";
import { SETTING_DEFAULTS } from "@/lib/settings";

// All current settings are non-negative integers (Toman, percent, days, points)
export async function PATCH(req: Request) {
  const auth = await requireApi("settings.manage");
  if (auth instanceof Response) return auth;
  const { values } = await readJson<{ values?: Record<string, unknown> }>(req);
  if (!values || typeof values !== "object") return fail("مقداری ارسال نشد.");

  const changes: Record<string, string> = {};
  for (const [key, raw] of Object.entries(values)) {
    if (!(key in SETTING_DEFAULTS)) return fail(`تنظیم ناشناخته: ${key}`);
    const value = String(raw).trim();
    if (!/^\d+$/.test(value)) return fail(`«${SETTING_DEFAULTS[key as keyof typeof SETTING_DEFAULTS].description}» باید عدد صحیح باشد.`);
    if (key.startsWith("COMMISSION_") || key === "AMBASSADOR_CUSTOMER_DISCOUNT") {
      if (Number(value) > 50) return fail("درصد پورسانت یا تخفیف نمی‌تواند بیش از ۵۰ باشد.");
    }
    changes[key] = value;
  }

  await prisma.$transaction(
    Object.entries(changes).map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value, description: SETTING_DEFAULTS[key as keyof typeof SETTING_DEFAULTS].description },
      })
    )
  );
  await logAudit(auth.userId, "settings.update", null, changes);
  return ok({}, "تنظیمات ذخیره شد.");
}
