import { csv, file } from "@/lib/api/csv";
import { requireApi, logAudit } from "@/lib/rbac/server";
import { moduleGuard } from "@/lib/modules/server";
import prisma from "@/lib/prisma";
import { getSettings } from "@/lib/settings";
import { invoiceLines } from "@/lib/commerce/invoice";
import { formatJalaliShort } from "@/lib/jalali";

// ==============================================================
// GET /api/admin/finance/invoices?days=30
// One row per invoice line, for the accountant to import into the
// Moadian (سامانه مودیان) Excel template. Type-2 (B2C) sales invoices,
// amounts in Rial. Columns follow the template's field names; the
// accountant must confirm them against the current template.
// ==============================================================

const DAY = 86_400_000;

export async function GET(req: Request) {
  const auth = await requireApi("finance.view");
  if (auth instanceof Response) return auth;
  const off = await moduleGuard("invoice");
  if (off) return off;
  const days = Math.min(400, Math.max(1, Number(new URL(req.url).searchParams.get("days")) || 31));
  const s = await getSettings();
  const vat = Number(s.VAT_PERCENT) || 0;

  const orders = await prisma.order.findMany({
    where: { invoiceNumber: { not: null }, invoicedAt: { gte: new Date(Date.now() - days * DAY) } },
    orderBy: { invoiceNumber: "asc" },
    include: { items: true, user: { select: { name: true, nationalCode: true } } },
  });

  const rows: (string | number)[][] = [
    [
      "شماره صورتحساب داخلی",
      "تاریخ صدور",
      "نوع صورتحساب",
      "الگوی صورتحساب",
      "موضوع",
      "وضعیت سفارش",
      "نام خریدار",
      "کد ملی خریدار",
      "کد پستی خریدار",
      "شناسه کالا/خدمت",
      "شرح کالا",
      "تعداد",
      "واحد اندازه‌گیری",
      "مبلغ واحد (ریال)",
      "مبلغ قبل از تخفیف (ریال)",
      "مبلغ تخفیف (ریال)",
      "مبلغ پس از تخفیف بدون مالیات (ریال)",
      "نرخ مالیات بر ارزش افزوده",
      "مبلغ مالیات (ریال)",
      "مبلغ کل (ریال)",
      "شماره سفارش سایت",
    ],
  ];
  for (const o of orders) {
    for (const l of invoiceLines(o, vat)) {
      rows.push([
        o.invoiceNumber!,
        formatJalaliShort(o.invoicedAt ?? o.createdAt),
        "نوع دوم",
        "فروش",
        o.status === "REFUNDED" ? "برگشت از فروش" : "اصلی",
        o.status,
        o.user.name || o.shippingRecipient,
        o.user.nationalCode ?? "",
        o.shippingPostalCode,
        l.sku === "SHIPPING" ? "" : s.TAX_GOODS_ID,
        l.title,
        l.quantity,
        l.sku === "SHIPPING" ? "خدمت" : "عدد",
        l.unitPriceRial,
        l.grossRial,
        l.discountRial,
        l.baseRial,
        vat,
        l.taxRial,
        l.totalRial,
        o.orderNumber,
      ]);
    }
  }
  await logAudit(auth.userId, "finance.export", "invoices", { days, count: orders.length });
  return file(`moadian-invoices-${days}d.csv`, csv(rows));
}
