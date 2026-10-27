import { requireApi, logAudit } from "@/lib/rbac/server";
import { ok, fail, readJson, str } from "@/lib/api/respond";
import prisma from "@/lib/prisma";
import { SETTING_DEFAULTS } from "@/lib/settings";
import { getModule, validateRule } from "@/lib/modules/registry";

// ==============================================================
// Module centre (modules.manage):
//   PATCH { key, enabled, confirm? }        switch a module on/off
//   PUT   { key, values: {SETTING: value} } save the module's rules
//   PUT   { key, reset: true }              restore the default rules
// Core modules need confirm = the module key to be switched off.
// ==============================================================

export async function PATCH(req: Request) {
  const auth = await requireApi("modules.manage");
  if (auth instanceof Response) return auth;
  const b = await readJson(req);
  const def = getModule(str(b.key, 40));
  if (!def) return fail("ماژول پیدا نشد.", 404);
  if (typeof b.enabled !== "boolean") return fail("وضعیت ماژول مشخص نیست.");
  if (def.core && !b.enabled && b.confirm !== def.key) return fail("برای خاموش کردن ماژول هسته، تأیید لازم است.");

  await prisma.moduleState.upsert({
    where: { key: def.key },
    update: { enabled: b.enabled, updatedById: auth.userId },
    create: { key: def.key, enabled: b.enabled, updatedById: auth.userId },
  });
  await logAudit(auth.userId, b.enabled ? "module.enable" : "module.disable", def.key, { label: def.label });
  return ok({}, b.enabled ? `ماژول «${def.label}» روشن شد.` : `ماژول «${def.label}» خاموش شد.`);
}

export async function PUT(req: Request) {
  const auth = await requireApi("modules.manage");
  if (auth instanceof Response) return auth;
  const b = await readJson<{ key?: unknown; values?: Record<string, unknown>; reset?: unknown }>(req);
  const def = getModule(str(b.key, 40));
  if (!def) return fail("ماژول پیدا نشد.", 404);
  if (def.rules.length === 0) return fail("این ماژول قانون قابل ویرایش ندارد.");

  const changes: Record<string, string> = {};
  if (b.reset === true) {
    for (const r of def.rules) changes[r.key] = SETTING_DEFAULTS[r.key].value;
  } else {
    if (!b.values || typeof b.values !== "object") return fail("مقداری ارسال نشد.");
    for (const [key, raw] of Object.entries(b.values)) {
      const rule = def.rules.find((r) => r.key === key);
      if (!rule) return fail("این قانون به ماژول تعلق ندارد.");
      const res = validateRule(rule, String(raw ?? ""), SETTING_DEFAULTS[rule.key].description);
      if ("error" in res) return fail(res.error);
      changes[key] = res.value;
    }
  }
  if (Object.keys(changes).length === 0) return fail("تغییری ارسال نشد.");

  await prisma.$transaction(
    Object.entries(changes).map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value, description: SETTING_DEFAULTS[key as keyof typeof SETTING_DEFAULTS].description },
      })
    )
  );
  await prisma.moduleState.upsert({
    where: { key: def.key },
    update: { updatedById: auth.userId },
    create: { key: def.key, enabled: def.defaultEnabled ?? true, updatedById: auth.userId },
  });
  await logAudit(auth.userId, b.reset === true ? "module.rules_reset" : "module.rules", def.key, changes);
  return ok({}, b.reset === true ? "قوانین به مقدار پیش‌فرض برگشت." : "قوانین ذخیره شد.");
}
