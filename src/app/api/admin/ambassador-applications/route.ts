import { requireApi, logAudit } from "@/lib/rbac/server";
import { ok, fail, readJson, str } from "@/lib/api/respond";
import prisma from "@/lib/prisma";
import { assignRole } from "@/lib/users";
import { AMBASSADOR_ROLE } from "@/lib/rbac/permissions";
import { notify } from "@/lib/notifications";

export async function PATCH(req: Request) {
  const auth = await requireApi("ambassadors.manage");
  if (auth instanceof Response) return auth;
  const b = await readJson(req);
  const app = await prisma.ambassadorApplication.findUnique({ where: { id: str(b.id, 40) } });
  if (!app) return fail("درخواست پیدا نشد.", 404);
  if (app.status !== "PENDING") return fail("این درخواست قبلاً بررسی شده است.");
  const note = str(b.note, 500) || null;

  if (b.action === "approve") {
    const tier = (["SILVER", "GOLD", "DIAMOND"] as const).find((t) => t === b.tier) ?? "SILVER";
    await assignRole(app.userId, AMBASSADOR_ROLE, auth.userId);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: app.userId },
        data: { ambassadorTier: tier, name: app.fullName, ...(app.shebaNumber ? { shebaNumber: app.shebaNumber } : {}) },
      }),
      prisma.ambassadorApplication.update({
        where: { id: app.id },
        data: { status: "APPROVED", reviewNote: note, reviewedAt: new Date() },
      }),
    ]);
    await logAudit(auth.userId, "ambassador.approve", app.fullName, { tier });
    await notify("ambassador.approved", { userId: app.userId, data: { name: app.fullName } });
    return ok({}, "درخواست تأیید شد و پرتال سفیر برای کاربر فعال شد.");
  }

  if (b.action === "reject") {
    if (!note) return fail("دلیل رد درخواست را بنویسید؛ به متقاضی نمایش داده می‌شود.");
    await prisma.ambassadorApplication.update({
      where: { id: app.id },
      data: { status: "REJECTED", reviewNote: note, reviewedAt: new Date() },
    });
    await logAudit(auth.userId, "ambassador.reject", app.fullName, { note });
    return ok({}, "درخواست رد شد.");
  }
  return fail("عملیات نامعتبر است.");
}
