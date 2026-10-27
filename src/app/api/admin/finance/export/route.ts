import { csv, file } from "@/lib/api/csv";
import { requireApi, logAudit } from "@/lib/rbac/server";
import prisma from "@/lib/prisma";
import { loadFinance } from "@/lib/portal/admin-loaders";
import { formatJalaliDateTime, formatJalaliShort, toJalali } from "@/lib/jalali";

// ==============================================================
// GET /api/admin/finance/export?type=pnl|orders|expenses
// CSV with a UTF-8 BOM so Excel opens Persian text correctly.
// Amounts are plain Toman integers (no separators) for formulas.
// ==============================================================

const DAY = 86_400_000;
const STATUS_FA: Record<string, string> = {
  PENDING: "در انتظار پرداخت",
  PAID: "پرداخت‌شده",
  PROCESSING: "در حال آماده‌سازی",
  SHIPPED: "ارسال‌شده",
  DELIVERED: "تحویل‌شده",
  CANCELLED: "لغوشده",
  REFUNDED: "مرجوعی",
};
const EXPENSE_FA: Record<string, string> = {
  MARKETING: "تبلیغات",
  SHIPPING: "ارسال",
  PACKAGING: "بسته‌بندی",
  SALARY: "حقوق",
  RENT: "اجاره و قبوض",
  GATEWAY: "کارمزد بانکی",
  OTHER: "سایر",
};

export async function GET(req: Request) {
  const auth = await requireApi("finance.view");
  if (auth instanceof Response) return auth;
  const type = new URL(req.url).searchParams.get("type") ?? "pnl";
  const { jy, jm, jd } = toJalali(new Date());
  const stamp = `${jy}-${String(jm).padStart(2, "0")}-${String(jd).padStart(2, "0")}`;
  await logAudit(auth.userId, "finance.export", type);

  if (type === "orders") {
    const orders = await prisma.order.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 365 * DAY) } },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, phone: true } }, referrer: { select: { name: true } }, items: { select: { unitCost: true, quantity: true } } },
    });
    return file(
      `maya-orders-${stamp}.csv`,
      csv([
        ["تاریخ", "شماره سفارش", "مشتری", "موبایل", "استان", "وضعیت", "مبلغ کالا", "تخفیف", "هزینه ارسال", "کیف پول", "قابل پرداخت", "بهای تمام‌شده", "سفیر", "پورسانت", "کد تخفیف"],
        ...orders.map((o) => [
          formatJalaliDateTime(o.createdAt),
          o.orderNumber,
          o.user.name ?? "",
          o.user.phone,
          o.shippingProvince,
          STATUS_FA[o.status] ?? o.status,
          o.totalProductAmount,
          o.discountAmount,
          o.shippingFee,
          o.walletCreditUsed,
          o.payableAmount,
          o.items.reduce((s, i) => s + i.unitCost * i.quantity, 0),
          o.referrer?.name ?? "",
          o.commissionAmount,
          o.couponCode ?? "",
        ]),
      ])
    );
  }

  if (type === "expenses") {
    const expenses = await prisma.expense.findMany({ where: { spentAt: { gte: new Date(Date.now() - 365 * DAY) } }, orderBy: { spentAt: "desc" } });
    return file(
      `maya-expenses-${stamp}.csv`,
      csv([
        ["تاریخ", "عنوان", "دسته", "مبلغ (تومان)", "توضیح"],
        ...expenses.map((e) => [formatJalaliShort(e.spentAt), e.title, EXPENSE_FA[e.category] ?? e.category, e.amount, e.note ?? ""]),
      ])
    );
  }

  const finance = await loadFinance();
  const rows = finance.months.map((m) => {
    const net = m.gross - m.discount - m.refunds;
    const gross = net - m.cogs - m.commission;
    return [m.key, m.orders, m.gross, m.discount, m.refunds, net, m.cogs, m.commission, gross, m.shipping, m.expenses, gross + m.shipping - m.expenses];
  });
  const total = rows.reduce((acc, r) => acc.map((v, i) => (i === 0 ? "جمع" : Number(v) + Number(r[i]))), ["جمع", 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] as (string | number)[]);
  return file(
    `maya-profit-loss-${stamp}.csv`,
    csv([
      ["ماه", "تعداد سفارش", "فروش ناخالص کالا", "تخفیف", "مرجوعی", "فروش خالص", "بهای تمام‌شده", "پورسانت سفیران", "سود ناخالص", "دریافتی ارسال", "هزینه‌های عملیاتی", "سود خالص"],
      ...rows,
      total,
    ])
  );
}
