import type { Prisma, WalletTxReason } from "@prisma/client";

// ==============================================================
// Wallet ledger helpers. Always call inside a transaction so the
// balance and its ledger row are written together.
// ==============================================================

export class WalletError extends Error {}

export async function creditWallet(
  tx: Prisma.TransactionClient,
  userId: string,
  amount: number,
  reason: WalletTxReason,
  referenceId: string | null,
  description: string
) {
  if (amount <= 0) return null;
  const wallet = await tx.wallet.upsert({ where: { userId }, update: {}, create: { userId } });
  const updated = await tx.wallet.update({
    where: { id: wallet.id },
    data: {
      balance: { increment: amount },
      ...(reason === "REFERRAL_COMMISSION" ? { totalEarned: { increment: amount } } : {}),
    },
  });
  return tx.walletTransaction.create({
    data: { walletId: wallet.id, amount, balanceAfter: updated.balance, type: "CREDIT", reason, referenceId, description },
  });
}

/** Debits the wallet; throws WalletError when the balance is not enough. */
export async function debitWallet(
  tx: Prisma.TransactionClient,
  userId: string,
  amount: number,
  reason: WalletTxReason,
  referenceId: string | null,
  description: string
) {
  if (amount <= 0) return null;
  const wallet = await tx.wallet.upsert({ where: { userId }, update: {}, create: { userId } });
  // کسر شرطی برای جلوگیری از منفی شدن موجودی در درخواست‌های هم‌زمان
  const res = await tx.wallet.updateMany({
    where: { id: wallet.id, balance: { gte: amount } },
    data: {
      balance: { decrement: amount },
      ...(reason === "SETTLEMENT_PAYOUT" ? { totalWithdrawn: { increment: amount } } : {}),
    },
  });
  if (res.count === 0) throw new WalletError("موجودی کیف پول کافی نیست.");
  const after = await tx.wallet.findUniqueOrThrow({ where: { id: wallet.id } });
  return tx.walletTransaction.create({
    data: { walletId: wallet.id, amount, balanceAfter: after.balance, type: "DEBIT", reason, referenceId, description },
  });
}
