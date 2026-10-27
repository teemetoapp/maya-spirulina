import { requireApi, logAudit } from "@/lib/rbac/server";
import { ok, fail, readJson, str } from "@/lib/api/respond";
import prisma from "@/lib/prisma";
import { isPermission, SUPER_ADMIN_ROLE, ALL_PERMISSIONS } from "@/lib/rbac/permissions";

function parsePermissions(v: unknown): string[] | null {
  if (!Array.isArray(v)) return null;
  const list = [...new Set(v.map(String))];
  return list.every(isPermission) ? list : null;
}

export async function POST(req: Request) {
  const auth = await requireApi("roles.manage");
  if (auth instanceof Response) return auth;
  const b = await readJson(req);
  const key = str(b.key, 30).toLowerCase();
  const name = str(b.name, 60);
  const permissions = parsePermissions(b.permissions);
  if (!/^[a-z][a-z_]{2,29}$/.test(key)) return fail("شناسه نقش باید حروف انگلیسی کوچک و _ باشد.");
  if (!name) return fail("نام نقش الزامی است.");
  if (!permissions) return fail("فهرست مجوزها نامعتبر است.");
  if (await prisma.role.findUnique({ where: { key } })) return fail("نقشی با این شناسه وجود دارد.");
  await prisma.role.create({ data: { key, name, description: str(b.description, 300) || null, permissions } });
  await logAudit(auth.userId, "role.create", key, { permissions });
  return ok({}, "نقش ساخته شد.");
}

export async function PATCH(req: Request) {
  const auth = await requireApi("roles.manage");
  if (auth instanceof Response) return auth;
  const b = await readJson(req);
  const role = await prisma.role.findUnique({ where: { id: str(b.id, 40) } });
  if (!role) return fail("نقش پیدا نشد.", 404);
  const permissions = parsePermissions(b.permissions);
  if (!permissions) return fail("فهرست مجوزها نامعتبر است.");
  if (role.key === SUPER_ADMIN_ROLE && permissions.length !== ALL_PERMISSIONS.length) {
    return fail("مجوزهای مدیر ارشد قابل کم‌کردن نیست.");
  }
  // جلوگیری از اینکه کاربر با ویرایش نقش خودش دسترسی مدیریت نقش را از دست بدهد
  if (auth.roleKeys.includes(role.key) && !permissions.includes("roles.manage") && !auth.roleKeys.includes(SUPER_ADMIN_ROLE)) {
    return fail("با این تغییر، دسترسی خودتان به مدیریت نقش‌ها حذف می‌شود.");
  }
  await prisma.role.update({
    where: { id: role.id },
    data: { name: str(b.name, 60) || role.name, description: str(b.description, 300) || null, permissions },
  });
  await logAudit(auth.userId, "role.update", role.key, { from: role.permissions, to: permissions });
  return ok({}, "نقش ذخیره شد. تغییر دسترسی‌ها از درخواست بعدی کاربران اعمال می‌شود.");
}

export async function DELETE(req: Request) {
  const auth = await requireApi("roles.manage");
  if (auth instanceof Response) return auth;
  const role = await prisma.role.findUnique({
    where: { id: str((await readJson(req)).id, 40) },
    include: { _count: { select: { users: true } } },
  });
  if (!role) return fail("نقش پیدا نشد.", 404);
  if (role.isSystem) return fail("نقش سیستمی قابل حذف نیست.");
  if (role._count.users > 0) return fail("ابتدا این نقش را از کاربرانش بگیرید.");
  await prisma.role.delete({ where: { id: role.id } });
  await logAudit(auth.userId, "role.delete", role.key);
  return ok({}, "نقش حذف شد.");
}
