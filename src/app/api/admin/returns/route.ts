import { requireApi, logAudit } from "@/lib/rbac/server";
import { ok, fail, readJson, str, handleError } from "@/lib/api/respond";
import prisma from "@/lib/prisma";
import { changeOrderStatus, OrderError } from "@/lib/commerce/orders";
import { notify } from "@/lib/notifications";
import { RETURN_STATUS_LABELS } from "@/lib/commerce/dto";

// بررسی مرجوعی: تأیید (هماهنگی ارسال کالا)، رد، یا بازپرداخت پس از دریافت کالا
export async function PATCH(req: Request) {
  const auth = await requireApi("orders.manage");
  if (auth instanceof Response) return auth;
  const b = await readJson(req);
  const action = str(b.action, 10);
  const note = str(b.note, 500) || null;
  const rr = await prisma.returnRequest.findUnique({ where: { id: str(b.id, 40) }, include: { order: true } });
  if (!rr) return fail("درخواست پیدا نشد.", 404);
  const next = action === "approve" ? "APPROVED" : action === "reject" ? "REJECTED" : action === "refund" ? "REFUNDED" : null;
  if (!next) return fail("عملیات نامعتبر است.");
  if (rr.status === "REFUNDED" || rr.status === "REJECTED") return fail("این درخواست بسته شده است.");
  if (next === "REJECTED" && !note) return fail("دلیل رد را برای مشتری بنویسید.");
  try {
    if (next === "REFUNDED") await changeOrderStatus(rr.orderId, "REFUNDED", auth.userId, { note: `مرجوعی: ${rr.reason}`, restock: b.restock !== false });
    await prisma.returnRequest.update({ where: { id: rr.id }, data: { status: next, adminNote: note ?? rr.adminNote, handledById: auth.userId } });
    await logAudit(auth.userId, "return." + action, rr.order.orderNumber, { note, restock: b.restock !== false });
    await notify("return.updated", { userId: rr.userId, data: { orderNumber: rr.order.orderNumber, status: RETURN_STATUS_LABELS[next], note: note ?? "" } });
    return ok({}, next === "REFUNDED" ? "مبلغ به کیف پول مشتری برگشت و امتیازهای سفارش باطل شد." : "درخواست به‌روز شد.");
  } catch (err) {
    return handleError(err, [OrderError]);
  }
}
