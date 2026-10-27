import prisma from "@/lib/prisma";
import { getSettings, SETTING_DEFAULTS } from "@/lib/settings";
import { formatJalaliDateTime } from "@/lib/jalali";
import { MODULES, MODULE_GROUPS, dependentsOf, type ModuleDef, type ModuleGroup, type RuleType } from "./registry";
import { getModuleStates } from "./server";

// داده صفحه «ماژول‌ها و قوانین» در مرکز کنترل سازمان

export interface ModuleRuleRow {
  key: string;
  label: string;
  type: RuleType;
  min: number | null;
  max: number | null;
  value: string;
  defaultValue: string;
}

export interface ModuleRow {
  key: string;
  label: string;
  description: string;
  offEffect: string;
  group: ModuleGroup;
  core: boolean;
  enabled: boolean; // انتخاب مدیر
  effective: boolean; // با در نظر گرفتن وابستگی‌ها
  dependsOn: { key: string; label: string }[];
  dependents: { key: string; label: string }[];
  sectionsCount: number;
  rules: ModuleRuleRow[];
  updatedAt: string | null;
  updatedBy: string | null;
}

export async function loadModulesAdmin(): Promise<{ groups: typeof MODULE_GROUPS; modules: ModuleRow[] }> {
  const [rows, states, settings] = await Promise.all([prisma.moduleState.findMany(), getModuleStates(), getSettings()]);
  const userIds = rows.map((r) => r.updatedById).filter((x): x is string => !!x);
  const users = userIds.length ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, phone: true } }) : [];
  const all = MODULES as readonly ModuleDef[];
  const label = (k: string) => all.find((m) => m.key === k)?.label ?? k;

  return {
    groups: MODULE_GROUPS,
    modules: all.map((m) => {
      const row = rows.find((r) => r.key === m.key);
      const by = row?.updatedById ? users.find((u) => u.id === row.updatedById) : null;
      return {
        key: m.key,
        label: m.label,
        description: m.description,
        offEffect: m.offEffect,
        group: m.group,
        core: !!m.core,
        enabled: row?.enabled ?? m.defaultEnabled ?? true,
        effective: states[m.key as keyof typeof states],
        dependsOn: (m.dependsOn ?? []).map((k) => ({ key: k, label: label(k) })),
        dependents: dependentsOf(m.key).map((d) => ({ key: d.key, label: d.label })),
        sectionsCount: m.sections.length,
        rules: m.rules.map((r) => ({
          key: r.key,
          label: SETTING_DEFAULTS[r.key].description,
          type: r.type,
          min: r.min ?? null,
          max: r.max ?? null,
          value: settings[r.key],
          defaultValue: SETTING_DEFAULTS[r.key].value,
        })),
        updatedAt: row ? formatJalaliDateTime(row.updatedAt) : null,
        updatedBy: by ? by.name ?? by.phone : null,
      };
    }),
  };
}
