import { requireApi, hasPermission, logAudit } from "@/lib/rbac/server";
import { ok, fail, readJson, str, int, handleError } from "@/lib/api/respond";
import prisma from "@/lib/prisma";
import { SUPER_ADMIN_ROLE, AMBASSADOR_ROLE, isPermission } from "@/lib/rbac/permissions";
import { PROFILE_FIELDS, GENDER_LABELS } from "@/lib/crm/profile-fields";
import { STAGE_LABELS } from "@/lib/crm/insight";
import { creditWallet, debitWallet, WalletError } from "@/lib/wallet";

const TIERS = ["SILVER", "GOLD", "DIAMOND"] as const;

/**
 * Staff edits a user. Each field needs its own permission:
 *   name / isActive / wallet adjustment → users.manage
 *   roles                               → roles.manage (super_admin role only by a super admin)
 *   ambassadorTier                      → ambassadors.manage
 *   tags / crmNotes / profile fields    → users.manage («مخاطبان»)
 *   extra / revoked permissions         → super admin only
 *   chatBlocked                         → chat.moderate
 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApi("users.manage", "roles.manage", "ambassadors.manage", "chat.moderate", "crm.followup");
  if (auth instanceof Response) return auth;
  const { id } = await params;
  const b = await readJson(req);
  const user = await prisma.user.findUnique({ where: { id }, include: { roles: { include: { role: true } } } });
  if (!user) return fail("کاربر پیدا نشد.", 404);
  const currentKeys = user.roles.map((r) => r.role.key);
  const actorIsSuper = auth.roleKeys.includes(SUPER_ADMIN_ROLE);
  const changes: Record<string, unknown> = {};

  try {
    // ---------- Profile & activation ----------
    if (b.name !== undefined || b.isActive !== undefined) {
      if (!hasPermission(auth, "users.manage")) return fail("اجازه ویرایش کاربران را ندارید.", 403);
      if (b.isActive === false && id === auth.userId) return fail("نمی‌توانید حساب خودتان را غیرفعال کنید.");
      if (b.isActive === false && currentKeys.includes(SUPER_ADMIN_ROLE) && !actorIsSuper) {
        return fail("فقط مدیر ارشد می‌تواند مدیر ارشد دیگری را غیرفعال کند.", 403);
      }
      await prisma.user.update({
        where: { id },
        data: {
          ...(b.name !== undefined ? { name: str(b.name, 80) || null } : {}),
          ...(typeof b.isActive === "boolean" ? { isActive: b.isActive } : {}),
        },
      });
      changes.profile = { name: b.name, isActive: b.isActive };
    }

    // ---------- Roles ----------
    if (Array.isArray(b.roleKeys)) {
      if (!hasPermission(auth, "roles.manage")) return fail("اجازه تعیین نقش را ندارید.", 403);
      const wanted = [...new Set(b.roleKeys.map(String))];
      const roles = await prisma.role.findMany({ where: { key: { in: wanted } } });
      if (roles.length !== wanted.length) return fail("یکی از نقش‌ها وجود ندارد.");

      const touchesSuper = wanted.includes(SUPER_ADMIN_ROLE) !== currentKeys.includes(SUPER_ADMIN_ROLE);
      if (touchesSuper && !actorIsSuper) return fail("فقط مدیر ارشد می‌تواند نقش مدیر ارشد را بدهد یا بگیرد.", 403);
      if (id === auth.userId && currentKeys.includes(SUPER_ADMIN_ROLE) && !wanted.includes(SUPER_ADMIN_ROLE)) {
        return fail("نمی‌توانید نقش مدیر ارشد را از خودتان بگیرید.");
      }

      await prisma.$transaction(async (tx) => {
        await tx.userRole.deleteMany({ where: { userId: id, role: { key: { notIn: wanted } } } });
        for (const role of roles) {
          await tx.userRole.upsert({
            where: { userId_roleId: { userId: id, roleId: role.id } },
            update: {},
            create: { userId: id, roleId: role.id, assignedById: auth.userId },
          });
        }
        // سفیر جدید با سطح نقره‌ای شروع می‌کند
        if (wanted.includes(AMBASSADOR_ROLE) && !user.ambassadorTier) {
          await tx.user.update({ where: { id }, data: { ambassadorTier: "SILVER" } });
        }
      });
      changes.roles = { from: currentKeys, to: wanted };
    }

    // ---------- Ambassador tier ----------
    if (b.ambassadorTier !== undefined) {
      if (!hasPermission(auth, "ambassadors.manage")) return fail("اجازه تغییر سطح سفیر را ندارید.", 403);
      const tier = str(b.ambassadorTier, 10) as (typeof TIERS)[number];
      if (!TIERS.includes(tier)) return fail("سطح سفیر نامعتبر است.");
      await prisma.user.update({ where: { id }, data: { ambassadorTier: tier } });
      changes.ambassadorTier = tier;
    }

    // ---------- CRM: tags, notes and profile fields ----------
    if (b.tags !== undefined || b.crmNotes !== undefined || b.profile !== undefined) {
      if (!hasPermission(auth, "users.manage")) return fail("اجازه ویرایش مخاطبان را ندارید.", 403);
      const data: Record<string, unknown> = {};
      if (Array.isArray(b.tags)) {
        data.tags = [...new Set(b.tags.map((t) => str(t, 30)).filter(Boolean))].slice(0, 20);
      }
      if (b.crmNotes !== undefined) data.crmNotes = str(b.crmNotes, 4000) || null;
      if (b.profile && typeof b.profile === "object") {
        const p = b.profile as Record<string, unknown>;
        for (const f of PROFILE_FIELDS) if (typeof p[f.key] === "string") data[f.key] = str(p[f.key], f.max) || null;
        if (typeof p.email === "string") {
          const email = str(p.email, 120);
          if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("ایمیل معتبر نیست.");
          data.email = email || null;
        }
        if (typeof p.birthDate === "string") data.birthDate = str(p.birthDate, 10) || null;
        if (typeof p.gender === "string") {
          const g = str(p.gender, 10);
          if (g && !Object.hasOwn(GENDER_LABELS, g)) return fail("جنسیت نامعتبر است.");
          data.gender = g || null;
        }
      }
      await prisma.user.update({ where: { id }, data });
      changes.crm = Object.keys(data);
    }

    // ---------- CRM: funnel stage and account owner ----------
    if (b.leadStage !== undefined || b.ownerId !== undefined) {
      if (!hasPermission(auth, "users.manage", "crm.followup")) return fail("اجازه ویرایش پرونده مشتری را ندارید.", 403);
      const data: Record<string, unknown> = {};
      if (b.leadStage !== undefined) {
        const st = str(b.leadStage, 20);
        if (st && !Object.hasOwn(STAGE_LABELS, st)) return fail("مرحله نامعتبر است.");
        data.leadStage = st || null;
      }
      if (b.ownerId !== undefined) {
        const oid = str(b.ownerId, 40);
        if (oid && !(await prisma.user.findUnique({ where: { id: oid }, select: { id: true } }))) return fail("مسئول انتخاب‌شده پیدا نشد.");
        data.ownerId = oid || null;
      }
      await prisma.user.update({ where: { id }, data });
      changes.crmOwner = data;
    }

    // ---------- Individual permissions (on top of roles) ----------
    if (Array.isArray(b.extraPermissions) || Array.isArray(b.revokedPermissions)) {
      if (!actorIsSuper) return fail("فقط مدیر ارشد می‌تواند دسترسی فردی تعیین کند.", 403);
      if (currentKeys.includes(SUPER_ADMIN_ROLE)) return fail("مدیر ارشد همه دسترسی‌ها را دارد.");
      const clean = (v: unknown) => (Array.isArray(v) ? [...new Set(v.map(String))].filter(isPermission) : undefined);
      const extra = clean(b.extraPermissions);
      const revoked = clean(b.revokedPermissions);
      await prisma.user.update({
        where: { id },
        data: { ...(extra ? { extraPermissions: extra } : {}), ...(revoked ? { revokedPermissions: revoked } : {}) },
      });
      changes.permissions = { extra, revoked };
    }

    // ---------- Block / unblock in internal messages ----------
    if (typeof b.chatBlocked === "boolean") {
      if (!hasPermission(auth, "chat.moderate")) return fail("اجازه مدیریت پیام‌ها را ندارید.", 403);
      if (id === auth.userId) return fail("نمی‌توانید خودتان را بلاک کنید.");
      if (currentKeys.includes(SUPER_ADMIN_ROLE)) return fail("مدیر ارشد قابل بلاک شدن نیست.");
      await prisma.user.update({ where: { id }, data: { chatBlocked: b.chatBlocked, chatBlockedAt: b.chatBlocked ? new Date() : null } });
      changes.chatBlocked = b.chatBlocked;
    }

    // ---------- Manual wallet adjustment ----------
    if (b.walletDelta !== undefined) {
      if (!hasPermission(auth, "users.manage")) return fail("اجازه اصلاح کیف پول را ندارید.", 403);
      const delta = int(b.walletDelta) ?? 0;
      const reason = str(b.walletReason, 200);
      if (delta === 0) return fail("مبلغ اصلاح را وارد کنید.");
      if (!reason) return fail("دلیل اصلاح کیف پول الزامی است.");
      await prisma.$transaction(async (tx) => {
        const desc = `اصلاح دستی توسط مدیریت: ${reason}`;
        if (delta > 0) await creditWallet(tx, id, delta, "ADMIN_ADJUSTMENT", auth.userId, desc);
        else await debitWallet(tx, id, -delta, "ADMIN_ADJUSTMENT", auth.userId, desc);
      });
      changes.wallet = { delta, reason };
    }
  } catch (err) {
    return handleError(err, [WalletError]);
  }

  if (Object.keys(changes).length === 0) return fail("تغییری ارسال نشد.");
  await logAudit(auth.userId, "user.update", user.phone, changes);
  return ok({}, "تغییرات کاربر ذخیره شد.");
}
