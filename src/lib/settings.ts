import prisma from "@/lib/prisma";
import { SETTING_DEFAULTS } from "@/lib/settings-defaults";

export { SETTING_DEFAULTS };

// ==============================================================
// Business rules stored in the Setting table.
// Defaults (settings-defaults.ts) apply until the super admin changes
// them in «تنظیمات و اعلان‌ها»; seed.ts writes them to the DB.
// ==============================================================

export type SettingKey = keyof typeof SETTING_DEFAULTS;

export async function getSettings(): Promise<Record<SettingKey, string>> {
  const rows = await prisma.setting.findMany({ where: { key: { in: Object.keys(SETTING_DEFAULTS) } } });
  const result = Object.fromEntries(
    Object.entries(SETTING_DEFAULTS).map(([k, v]) => [k, v.value])
  ) as Record<SettingKey, string>;
  for (const row of rows) result[row.key as SettingKey] = row.value;
  return result;
}

export async function getNumberSetting(key: SettingKey): Promise<number> {
  const row = await prisma.setting.findUnique({ where: { key } });
  const n = Number(row?.value ?? SETTING_DEFAULTS[key].value);
  return Number.isFinite(n) ? n : Number(SETTING_DEFAULTS[key].value);
}
