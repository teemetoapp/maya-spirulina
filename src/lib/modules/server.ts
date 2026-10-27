import { cache } from "react";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { MODULES, type ModuleDef, type ModuleKey } from "./registry";

// ==============================================================
// Module state on the server. A module with no ModuleState row uses
// its default (on). A module is effective only when it and every
// module it depends on are on.
// Read once per request (React cache); toggles apply immediately.
// ==============================================================

export type ModuleStates = Record<ModuleKey, boolean>;

async function readStates(): Promise<ModuleStates> {
  let rows: { key: string; enabled: boolean }[] = [];
  try {
    rows = await prisma.moduleState.findMany({ select: { key: true, enabled: true } });
  } catch (err) {
    // جدول هنوز ساخته نشده (قبل از db push): همه ماژول‌ها روشن فرض می‌شوند
    console.error("[modules] failed to read module states", err);
  }
  const raw = Object.fromEntries(
    (MODULES as readonly ModuleDef[]).map((m) => [m.key, rows.find((r) => r.key === m.key)?.enabled ?? m.defaultEnabled ?? true])
  ) as ModuleStates;

  const effective = {} as ModuleStates;
  const resolve = (key: ModuleKey, seen: Set<string>): boolean => {
    if (key in effective) return effective[key];
    if (seen.has(key)) return false;
    seen.add(key);
    const def = (MODULES as readonly ModuleDef[]).find((m) => m.key === key)!;
    const on = raw[key] && (def.dependsOn ?? []).every((d) => resolve(d as ModuleKey, seen));
    effective[key] = on;
    return on;
  };
  for (const m of MODULES) resolve(m.key, new Set());
  return effective;
}

export const getModuleStates = cache(readStates);

export async function isModuleEnabled(key: ModuleKey): Promise<boolean> {
  return (await getModuleStates())[key];
}

export async function enabledModules(): Promise<ModuleKey[]> {
  const states = await getModuleStates();
  return (Object.keys(states) as ModuleKey[]).filter((k) => states[k]);
}

// مجوزهای ماژول‌های خاموش (از همه کاربران حذف می‌شوند)
export async function disabledPermissions(): Promise<Set<string>> {
  const states = await getModuleStates();
  const out = new Set<string>();
  for (const m of MODULES as readonly ModuleDef[]) {
    if (!states[m.key as ModuleKey]) for (const p of m.permissions) out.add(p);
  }
  return out;
}

// پیام استاندارد برای API هایی که ماژولشان خاموش است
export function moduleOffMessage(key: ModuleKey): string {
  const def = (MODULES as readonly ModuleDef[]).find((m) => m.key === key);
  return `بخش «${def?.label ?? key}» در حال حاضر غیرفعال است.`;
}

/**
 * For API routes of a switchable feature:
 *   const off = await moduleGuard("tickets"); if (off) return off;
 */
export async function moduleGuard(key: ModuleKey): Promise<NextResponse | null> {
  if (await isModuleEnabled(key)) return null;
  return NextResponse.json({ success: false, error: moduleOffMessage(key), moduleOff: key }, { status: 403 });
}
