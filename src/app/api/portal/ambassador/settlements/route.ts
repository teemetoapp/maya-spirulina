import { requireApi } from "@/lib/rbac/server";
import { ok, fail, readJson, str, int, handleError } from "@/lib/api/respond";
import prisma from "@/lib/prisma";
import { notify } from "@/lib/notifications";
import { getNumberSetting } from "@/lib/settings";
import { debitWallet, WalletError } from "@/lib/wallet";
import { isValidIranianSheba, detectBankFromSheba } from "@/lib/validators";
import { formatToman, toEnglishDigits } from "@/lib/currency";

// Ambassador requests a payout. The amount is held (debited) right away so
// it cannot be requested twice; a rejected request returns it to the wallet.
export async function POST(req: Request) {
  const auth = await requireApi("portal.ambassador");
  if (auth instanceof Response) return auth;
  const b = await readJson(req);
  const amount = int(b.amount) ?? 0;
  const accountHolder = str(b.accountHolder, 80);
  let sheba = toEnglishDigits(str(b.shebaNumber, 40)).toUpperCase().replace(/\s/g, "");
  if (sheba && !sheba.startsWith("IR")) sheba = "IR" + sheba;

  const min = await getNumberSetting("MIN_SETTLEMENT_TOMAN");
  if (amount < min) return fail(`حداقل مبلغ تسویه ${formatToman(min)} است.`);
  if (!isValidIranianSheba(sheba)) return fail("شماره شبا معتبر نیست.");
  if (accountHolder.length < 3) return fail("نام صاحب حساب را وارد کنید.");

  const open = await prisma.settlementRequest.count({
    where: { userId: auth.userId, status: { in: ["PENDING", "APPROVED"] } },
  });
  if (open > 0) return fail("یک درخواست تسویه باز دارید؛ پس از واریز آن می‌توانید درخواست جدید ثبت کنید.");

  try {
    await prisma.$transaction(async (tx) => {
      const request = await tx.settlementRequest.create({
        data: { userId: auth.userId, amount, shebaNumber: sheba, accountHolder, bankName: detectBankFromSheba(sheba) },
      });
      await debitWallet(tx, auth.userId, amount, "SETTLEMENT_PAYOUT", request.id, "درخواست تسویه پورسانت");
      await tx.user.update({ where: { id: auth.userId }, data: { shebaNumber: sheba } });
    });
  } catch (err) {
    return handleError(err, [WalletError]);
  }
  await notify("settlement.requested", { data: { name: auth.name ?? auth.phone, amount } });
  return ok({}, "درخواست تسویه ثبت شد و پس از بررسی مالی واریز می‌شود.");
}
