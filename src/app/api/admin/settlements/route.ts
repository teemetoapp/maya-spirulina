import { requireApi, logAudit } from "@/lib/rbac/server";
import { ok, fail, readJson, str } from "@/lib/api/respond";
import prisma from "@/lib/prisma";
import { creditWallet } from "@/lib/wallet";
import { notify } from "@/lib/notifications";

// PENDING → APPROVED → PAID, or PENDING/APPROVED → REJECTED (amount returns to the wallet)
export async function PATCH(req: Request) {
  const auth = await requireApi("settlements.approve");
  if (auth instanceof Response) return auth;
  const b = await readJson(req);
  const s = await prisma.settlementRequest.findUnique({ where: { id: str(b.id, 40) } });
  if (!s) return fail("درخواست پیدا نشد.", 404);
  const note = str(b.note, 500) || null;

  if (b.action === "approve") {
    if (s.status !== "PENDING") return fail("فقط درخواست در انتظار قابل تأیید است.");
    await prisma.settlementRequest.update({ where: { id: s.id }, data: { status: "APPROVED", adminNotes: note, processedAt: new Date() } });
  } else if (b.action === "pay") {
    if (s.status !== "APPROVED" && s.status !== "PENDING") return fail("این درخواست قابل پرداخت نیست.");
    const receipt = str(b.receipt, 60);
    if (!receipt) return fail("شماره پیگیری واریز بانکی را وارد کنید.");
    await prisma.settlementRequest.update({
      where: { id: s.id },
      data: { status: "PAID", bankReceiptRef: receipt, adminNotes: note ?? s.adminNotes, processedAt: new Date() },
    });
    await notify("settlement.paid", { userId: s.userId, data: { amount: s.amount, receipt } });
  } else if (b.action === "reject") {
    if (s.status !== "PENDING" && s.status !== "APPROVED") return fail("این درخواست قابل رد نیست.");
    if (!note) return fail("دلیل رد را بنویسید.");
    await prisma.$transaction(async (tx) => {
      await tx.settlementRequest.update({ where: { id: s.id }, data: { status: "REJECTED", adminNotes: note, processedAt: new Date() } });
      await creditWallet(tx, s.userId, s.amount, "ADMIN_ADJUSTMENT", s.id, "بازگشت مبلغ درخواست تسویه ردشده");
      await tx.wallet.update({ where: { userId: s.userId }, data: { totalWithdrawn: { decrement: s.amount } } });
    });
    await notify("settlement.rejected", { userId: s.userId, data: { amount: s.amount, reason: note } });
  } else {
    return fail("عملیات نامعتبر است.");
  }
  await logAudit(auth.userId, `settlement.${b.action}`, s.id, { amount: s.amount, note });
  return ok({}, "درخواست تسویه به‌روز شد.");
}
