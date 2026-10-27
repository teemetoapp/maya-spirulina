import { notFound, redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { getAccess, hasPermission } from "@/lib/rbac/server";
import { getSettings } from "@/lib/settings";
import { isModuleEnabled } from "@/lib/modules/server";
import { invoiceLines } from "@/lib/commerce/invoice";
import { formatJalaliShort } from "@/lib/jalali";
import { toPersianDigits } from "@/lib/currency";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "صورتحساب فروش | مایا اسپیرولینا", robots: { index: false } };

const rial = (n: number) => toPersianDigits(n.toLocaleString("en-US"));

// صورتحساب رسمی قابل چاپ: صاحب سفارش یا کارکنان سفارش/مالی
export default async function InvoicePage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const access = await getAccess();
  if (!access) redirect(`/login?redirect=/invoice/${orderNumber}`);
  if (!(await isModuleEnabled("invoice"))) notFound();
  const order = await prisma.order.findUnique({ where: { orderNumber }, include: { items: true, user: { select: { name: true, nationalCode: true } } } });
  if (!order || !order.invoiceNumber) notFound();
  if (order.userId !== access.userId && !hasPermission(access, "orders.view", "finance.view")) notFound();

  const s = await getSettings();
  const vat = Number(s.VAT_PERCENT) || 0;
  const lines = invoiceLines(order, vat);
  const sum = (k: "grossRial" | "discountRial" | "baseRial" | "taxRial" | "totalRial") => lines.reduce((t, l) => t + l[k], 0);
  const cell = "border border-neutral-400 px-2 py-1";

  return (
    <main dir="rtl" className="max-w-4xl mx-auto p-6 bg-white text-black text-xs leading-6 print:p-0">
      <div className="flex justify-between items-start mb-4">
        <h1 className="text-lg font-black">صورتحساب فروش کالا</h1>
        <div className="text-left">
          <div>شماره: {toPersianDigits(order.invoiceNumber)}</div>
          <div>تاریخ: {formatJalaliShort(order.invoicedAt ?? order.paidAt ?? order.createdAt)}</div>
          <div>سفارش: <span className="font-mono">{order.orderNumber}</span></div>
        </div>
      </div>
      <table className="w-full border-collapse mb-3">
        <tbody>
          <tr>
            <td className={`${cell} font-bold w-24`}>فروشنده</td>
            <td className={cell}>
              {s.SELLER_NAME || "مزرعه آفرینش مایا"} {s.SELLER_NATIONAL_ID && `· شناسه ملی ${toPersianDigits(s.SELLER_NATIONAL_ID)}`}{" "}
              {s.SELLER_ECONOMIC_CODE && `· کد اقتصادی ${toPersianDigits(s.SELLER_ECONOMIC_CODE)}`}
              <br />
              {s.SELLER_ADDRESS} {s.SELLER_POSTAL_CODE && `· کد پستی ${toPersianDigits(s.SELLER_POSTAL_CODE)}`} {s.SELLER_PHONE && `· تلفن ${toPersianDigits(s.SELLER_PHONE)}`}
            </td>
          </tr>
          <tr>
            <td className={`${cell} font-bold`}>خریدار</td>
            <td className={cell}>
              {order.user.name || order.shippingRecipient} {order.user.nationalCode && `· کد ملی ${toPersianDigits(order.user.nationalCode)}`}
              <br />
              {order.shippingProvince}، {order.shippingCity}، {order.shippingAddress} · کد پستی {toPersianDigits(order.shippingPostalCode)} · تلفن{" "}
              {toPersianDigits(order.shippingPhone)}
            </td>
          </tr>
        </tbody>
      </table>
      <table className="w-full border-collapse">
        <thead className="bg-neutral-100">
          <tr>
            {["ردیف", "شرح کالا", "تعداد", "مبلغ واحد", "مبلغ کل", "تخفیف", "مبلغ پس از تخفیف", `مالیات ارزش افزوده (${toPersianDigits(vat)}٪)`, "جمع"].map((h) => (
              <th key={h} className={cell}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {lines.map((l, i) => (
            <tr key={l.sku + i}>
              <td className={cell}>{toPersianDigits(i + 1)}</td>
              <td className={cell}>{l.title}</td>
              <td className={cell}>{toPersianDigits(l.quantity)}</td>
              <td className={cell}>{rial(l.unitPriceRial)}</td>
              <td className={cell}>{rial(l.grossRial)}</td>
              <td className={cell}>{rial(l.discountRial)}</td>
              <td className={cell}>{rial(l.baseRial)}</td>
              <td className={cell}>{rial(l.taxRial)}</td>
              <td className={cell}>{rial(l.totalRial)}</td>
            </tr>
          ))}
          <tr className="font-bold">
            <td className={cell} colSpan={4}>جمع (ریال)</td>
            <td className={cell}>{rial(sum("grossRial"))}</td>
            <td className={cell}>{rial(sum("discountRial"))}</td>
            <td className={cell}>{rial(sum("baseRial"))}</td>
            <td className={cell}>{rial(sum("taxRial"))}</td>
            <td className={cell}>{rial(sum("totalRial"))}</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-3 text-[11px] text-neutral-600">مبالغ به ریال است. قیمت‌های سایت شامل مالیات بر ارزش افزوده است.</p>
      <div className="mt-6 print:hidden">
        <PrintButton />
      </div>
    </main>
  );
}
