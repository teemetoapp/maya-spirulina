import { requireApi, logAudit } from "@/lib/rbac/server";
import prisma from "@/lib/prisma";
import { csv, file } from "@/lib/api/csv";
import { loadContacts } from "@/lib/crm/contacts";
import { SEGMENT_LABELS, STAGE_LABELS } from "@/lib/crm/insight";
import { PROFILE_FIELDS } from "@/lib/crm/profile-fields";

// GET /api/admin/contacts/export — every contact with profile, segment and purchase totals (Excel CSV)
export async function GET() {
  const auth = await requireApi("users.manage");
  if (auth instanceof Response) return auth;
  const [{ rows }, users] = await Promise.all([
    loadContacts(),
    prisma.user.findMany({ select: { id: true, ...Object.fromEntries(PROFILE_FIELDS.map((f) => [f.key, true])), birthDate: true, gender: true, referralCode: true, smsConsent: true, smsOptOutAt: true } }),
  ]);
  const byId = new Map(users.map((u) => [u.id, u as unknown as Record<string, string | null>]));
  const KIND = { staff: "کارکنان", ambassador: "سفیر", customer: "مشتری", lead: "بدون خرید" } as const;
  await logAudit(auth.userId, "contacts.export", String(rows.length));
  return file(
    "contacts.csv",
    csv([
      ["نام", "موبایل", "ایمیل", "نوع", "بخش", "مرحله فروش", "برچسب‌ها", "تعداد خرید", "مجموع خرید (تومان)", "آخرین خرید", "تاریخ عضویت", "کد معرفی", "رضایت پیامک تبلیغاتی", "تاریخ تولد", ...PROFILE_FIELDS.map((f) => f.label)],
      ...rows.map((r) => {
        const u = byId.get(r.id) ?? {};
        return [
          r.name,
          r.phone,
          r.email,
          KIND[r.kind],
          SEGMENT_LABELS[r.segment],
          r.leadStage ? STAGE_LABELS[r.leadStage] : "",
          r.tags.join("، "),
          r.orders,
          r.totalSpent,
          r.lastOrderAt ?? "",
          r.joinedAt,
          u.referralCode ?? "",
          u.smsOptOutAt ? "لغو کرده" : u.smsConsent ? "دارد" : "ندارد",
          u.birthDate ?? "",
          ...PROFILE_FIELDS.map((f) => u[f.key] ?? ""),
        ];
      }),
    ])
  );
}
