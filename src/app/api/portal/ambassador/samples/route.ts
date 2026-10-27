import { requireApi, hasPermission, logAudit } from "@/lib/rbac/server";
import { moduleGuard } from "@/lib/modules/server";
import { ok, fail, readJson, str } from "@/lib/api/respond";
import prisma from "@/lib/prisma";
import { getNumberSetting } from "@/lib/settings";
import { isValidIranianMobile, normalizeIranianMobile } from "@/lib/validators";
import { toEnglishDigits } from "@/lib/currency";
import { randomBytes } from "crypto";

const STATUSES = ["DELIVERED", "FOLLOWED_UP", "CONVERTED", "LOST"] as const;

// Ambassador records a sample kit handed to a prospect
export async function POST(req: Request) {
  const auth = await requireApi("portal.ambassador");
  if (auth instanceof Response) return auth;
  const off = await moduleGuard("samplekits");
  if (off) return off;
  const b = await readJson(req);
  const recipientName = str(b.recipientName, 80);
  const phone = normalizeIranianMobile(toEnglishDigits(str(b.recipientPhone, 20)));
  if (recipientName.length < 2) return fail("نام دریافت‌کننده را وارد کنید.");
  if (!isValidIranianMobile(phone)) return fail("شماره موبایل دریافت‌کننده معتبر نیست.");

  const days = await getNumberSetting("SAMPLE_KIT_FOLLOWUP_DAYS");
  await prisma.sampleKit.create({
    data: {
      code: `SK-${randomBytes(3).toString("hex").toUpperCase()}`,
      ambassadorId: auth.userId,
      recipientName,
      recipientPhone: phone,
      notes: str(b.notes, 500) || null,
      followUpAt: new Date(Date.now() + days * 24 * 60 * 60 * 1000),
    },
  });
  return ok({}, "کیت سمپل ثبت شد. روز پیگیری به شما یادآوری می‌شود.");
}

// Update status — the owning ambassador or staff with samplekits.manage
export async function PATCH(req: Request) {
  const auth = await requireApi("portal.ambassador", "samplekits.manage");
  if (auth instanceof Response) return auth;
  const off = await moduleGuard("samplekits");
  if (off) return off;
  const b = await readJson(req);
  const kit = await prisma.sampleKit.findUnique({ where: { id: str(b.id, 40) } });
  if (!kit) return fail("کیت پیدا نشد.", 404);
  const isStaff = hasPermission(auth, "samplekits.manage");
  if (!isStaff && kit.ambassadorId !== auth.userId) return fail("دسترسی ندارید.", 403);

  const status = str(b.status, 20) as (typeof STATUSES)[number];
  if (!STATUSES.includes(status)) return fail("وضعیت نامعتبر است.");

  let convertedOrderId: string | null | undefined = undefined;
  if (status === "CONVERTED") {
    const orderNumber = str(b.orderNumber, 30);
    if (orderNumber) {
      const order = await prisma.order.findUnique({ where: { orderNumber }, select: { id: true, sampleKit: true } });
      if (!order) return fail("سفارشی با این شماره پیدا نشد.");
      if (order.sampleKit && order.sampleKit.id !== kit.id) return fail("این سفارش به کیت دیگری متصل شده است.");
      convertedOrderId = order.id;
    }
  }

  await prisma.sampleKit.update({
    where: { id: kit.id },
    data: { status, ...(convertedOrderId !== undefined ? { convertedOrderId } : {}), notes: str(b.notes, 500) || kit.notes },
  });
  if (isStaff) await logAudit(auth.userId, "samplekit.status", kit.code, { status });
  return ok({}, "وضعیت کیت به‌روز شد.");
}
