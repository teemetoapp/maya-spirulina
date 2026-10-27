import { requireApi } from "@/lib/rbac/server";
import { moduleGuard } from "@/lib/modules/server";
import { ok, fail, readJson, str } from "@/lib/api/respond";
import prisma from "@/lib/prisma";
import { getNumberSetting } from "@/lib/settings";
import { notify } from "@/lib/notifications";
import { toPersianDigits } from "@/lib/currency";

const DAY = 86_400_000;

// درخواست مرجوعی خریدار در مهلت پس از تحویل
export async function POST(req: Request) {
  const auth = await requireApi("portal.customer");
  if (auth instanceof Response) return auth;
  const off = await moduleGuard("orders");
  if (off) return off;
  const b = await readJson(req);
  const reason = str(b.reason, 120);
  if (!reason) return fail("دلیل مرجوعی را انتخاب کنید.");
  const order = await prisma.order.findFirst({
    where: { orderNumber: str(b.orderNumber, 40), userId: auth.userId },
    include: { returnRequest: true, user: { select: { name: true } } },
  });
  if (!order || order.status !== "DELIVERED" || !order.deliveredAt) return fail("فقط سفارش تحویل‌شده قابل مرجوعی است.");
  if (order.returnRequest) return fail("برای این سفارش قبلاً درخواست مرجوعی ثبت شده است.");
  const window = await getNumberSetting("RETURN_WINDOW_DAYS");
  if (Date.now() - order.deliveredAt.getTime() > window * DAY) return fail(`مهلت ${toPersianDigits(window)} روزه مرجوعی این سفارش تمام شده است. با پشتیبانی تماس بگیرید.`);
  await prisma.returnRequest.create({ data: { orderId: order.id, userId: auth.userId, reason, details: str(b.details, 1000) || null } });
  await notify("return.requested", { data: { orderNumber: order.orderNumber, customer: order.user.name ?? order.shippingRecipient, reason } });
  return ok({}, "درخواست مرجوعی ثبت شد. همکاران ما برای هماهنگی با شما تماس می‌گیرند.");
}
