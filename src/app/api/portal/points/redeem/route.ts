import { requireApi } from "@/lib/rbac/server";
import { moduleGuard } from "@/lib/modules/server";
import { ok, fail, handleError } from "@/lib/api/respond";
import prisma from "@/lib/prisma";
import { getNumberSetting } from "@/lib/settings";
import { creditWallet } from "@/lib/wallet";
import { formatToman, toPersianDigits } from "@/lib/currency";

// Converts all released loyalty points to wallet credit
export async function POST() {
  const auth = await requireApi("portal.customer");
  if (auth instanceof Response) return auth;
  const off = await moduleGuard("loyalty");
  if (off) return off;
  try {
    const [ratio, min] = await Promise.all([
      getNumberSetting("POINTS_TO_TOMAN_RATIO"),
      getNumberSetting("MIN_POINTS_TO_REDEEM"),
    ]);
    const amount = await prisma.$transaction(async (tx) => {
      const agg = await tx.pointTransaction.aggregate({
        where: { userId: auth.userId, status: "RELEASED" },
        _sum: { points: true },
      });
      const points = agg._sum.points ?? 0;
      if (points < min) throw new Error(`حداقل ${toPersianDigits(min)} امتیاز برای تبدیل لازم است.`);
      const toman = points * ratio;
      const pt = await tx.pointTransaction.create({
        data: {
          userId: auth.userId,
          points: -points,
          type: "REDEEMED",
          status: "RELEASED",
          releasedAt: new Date(),
          description: "تبدیل امتیاز به اعتبار کیف پول",
        },
      });
      await creditWallet(tx, auth.userId, toman, "PURCHASE_CASHBACK", pt.id, `تبدیل ${points} امتیاز وفاداری`);
      return toman;
    });
    return ok({}, `${formatToman(amount)} به کیف پول شما اضافه شد.`);
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("حداقل")) return fail(err.message);
    return handleError(err);
  }
}
