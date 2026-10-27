import { cache } from "react";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { ALL_PERMISSIONS, isPermission, SUPER_ADMIN_ROLE, type Permission } from "./permissions";
import { enabledModules, disabledPermissions } from "@/lib/modules/server";
import { moduleToken, type ModuleKey } from "@/lib/modules/registry";

// ==============================================================
// RBAC — server-side access resolution
// Permissions are read from the database on every request, so a
// role change by the super admin takes effect immediately.
// ==============================================================

export interface Access {
  userId: string;
  phone: string;
  name: string | null;
  referralCode: string;
  roleKeys: string[];
  roleNames: string[];
  permissions: Permission[];
  // ماژول‌های روشن سامانه
  modules: ModuleKey[];
  // مجوزها + module:<key> برای ماژول‌های روشن (برای منو و دسترسی بخش‌ها)
  tokens: string[];
  isSuper: boolean;
  chatBlocked: boolean;
}

export const getAccess = cache(async (): Promise<Access | null> => {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    include: { roles: { include: { role: true } } },
  });
  if (!user || !user.isActive) return null;

  // دسترسی نهایی = مجوزهای نقش‌ها + دسترسی‌های فردی − دسترسی‌های گرفته‌شده
  // (از مدیر ارشد هیچ مجوزی گرفته نمی‌شود)
  const permissions = new Set<Permission>();
  for (const ur of user.roles) {
    for (const p of ur.role.permissions) if (isPermission(p)) permissions.add(p);
  }
  for (const p of user.extraPermissions) if (isPermission(p)) permissions.add(p);
  const isSuper = user.roles.some((r) => r.role.key === SUPER_ADMIN_ROLE);
  // مدیر ارشد همیشه همه مجوزها را دارد (حتی مجوزهای تازه‌اضافه‌شده)
  if (isSuper) for (const p of ALL_PERMISSIONS) permissions.add(p);
  else for (const p of user.revokedPermissions) permissions.delete(p as Permission);

  // مجوزهای ماژول‌های خاموش از همه (حتی مدیر ارشد) حذف می‌شوند
  const [modules, off] = await Promise.all([enabledModules(), disabledPermissions()]);
  for (const p of off) permissions.delete(p as Permission);
  const permissionList = [...permissions];

  return {
    userId: user.id,
    phone: user.phone,
    name: user.name,
    referralCode: user.referralCode,
    roleKeys: user.roles.map((r) => r.role.key),
    roleNames: user.roles.map((r) => r.role.name),
    permissions: permissionList,
    modules,
    tokens: [...permissionList, ...modules.map(moduleToken)],
    isSuper,
    chatBlocked: user.chatBlocked,
  };
});

export function hasPermission(access: Access | null, ...anyOf: Permission[]): boolean {
  if (!access) return false;
  return anyOf.some((p) => access.permissions.includes(p));
}

/**
 * For API route handlers:
 *   const auth = await requireApi("orders.manage");
 *   if (auth instanceof NextResponse) return auth;
 * With no permission argument it only requires a logged-in user.
 */
export async function requireApi(...anyOf: Permission[]): Promise<Access | NextResponse> {
  const access = await getAccess();
  if (!access) {
    return NextResponse.json({ success: false, error: "ابتدا وارد حساب کاربری شوید." }, { status: 401 });
  }
  if (anyOf.length > 0 && !hasPermission(access, ...anyOf)) {
    return NextResponse.json({ success: false, error: "شما به این بخش دسترسی ندارید." }, { status: 403 });
  }
  return access;
}

export async function logAudit(
  actorId: string | null,
  action: string,
  target?: string | null,
  details?: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: { actorId, action, target: target ?? null, details: details as object | undefined },
    });
  } catch (err) {
    console.error("[audit] failed to write audit log", err);
  }
}
