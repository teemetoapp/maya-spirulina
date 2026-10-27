"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { WholesaleData } from "@/lib/portal/wholesale";
import { PageTitle, Table, Td, EmptyState, Notice } from "@/components/portal/ui";
import { formatToman, toPersianDigits } from "@/lib/currency";
import { formatJalaliShort } from "@/lib/jalali";

// پنل همکار عمده: جدول پله‌های تخفیف و فرم سفارش تعدادی.
// مبلغ اینجا تخمین است؛ قیمت نهایی را سرور هنگام تسویه حساب می‌کند.

export default function WholesalePortal({ data }: { data: WholesaleData }) {
  const router = useRouter();
  const [qty, setQty] = useState<Record<string, number>>({});
  const total = Object.values(qty).reduce((n, q) => n + q, 0);
  const subtotal = data.products.reduce((sum, p) => sum + p.price * (qty[p.sku] ?? 0), 0);
  const pct = total >= data.minQty ? (data.tiers.filter((t) => total >= t.min).at(-1)?.pct ?? 0) : 0;
  const next = data.tiers.find((t) => t.min > total);

  const submit = () => {
    const param = Object.entries(qty).filter(([, q]) => q > 0).map(([sku, q]) => `${sku}:${q}`).join(",");
    router.push(`/checkout?wholesale=${encodeURIComponent(param)}`);
  };

  return (
    <div className="space-y-6">
      <PageTitle title="سفارش عمده" subtitle="تخفیف پلکانی بر اساس تعداد کل اقلام سفارش محاسبه می‌شود و با کد تخفیف جمع نمی‌شود." />

      <div className="studio-card p-5 text-xs space-y-2">
        <p className="font-bold">پله‌های تخفیف</p>
        {data.tiers.length === 0 ? (
          <p className="text-text-muted">پله‌ای تعریف نشده است.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {data.tiers.map((t) => (
              <span key={t.min} className={`px-3 py-1.5 rounded-lg border ${pct === t.pct ? "border-accent-primary font-bold" : "border-border-subtle"}`}>
                از {toPersianDigits(t.min)} عدد: {toPersianDigits(t.pct)}٪
              </span>
            ))}
          </div>
        )}
        <p className="text-text-muted">حداقل سفارش عمده: {toPersianDigits(data.minQty)} عدد</p>
      </div>

      <div className="studio-card p-5 space-y-3 text-xs">
        <Table head={["محصول", "قیمت واحد", "موجودی", "تعداد"]}>
          {data.products.map((p) => (
            <tr key={p.sku}>
              <Td>{p.title}</Td>
              <Td>{formatToman(p.price)}</Td>
              <Td>{toPersianDigits(p.stock)}</Td>
              <Td>
                <input
                  type="number"
                  min={0}
                  max={Math.min(p.stock, 1000)}
                  inputMode="numeric"
                  aria-label={`تعداد ${p.title}`}
                  className="input w-24"
                  value={qty[p.sku] ?? ""}
                  disabled={p.stock === 0}
                  onChange={(e) => setQty({ ...qty, [p.sku]: Math.max(0, Math.min(Math.floor(Number(e.target.value) || 0), p.stock, 1000)) })}
                />
              </Td>
            </tr>
          ))}
        </Table>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="space-y-1">
            <p>
              {toPersianDigits(total)} عدد · جمع {formatToman(subtotal)}
              {pct > 0 && <> · تخفیف {toPersianDigits(pct)}٪ · تقریباً {formatToman(Math.round(subtotal * (1 - pct / 100)))}</>}
            </p>
            {next && total > 0 && <p className="text-text-muted">با {toPersianDigits(next.min - total)} عدد بیشتر، تخفیف {toPersianDigits(next.pct)}٪ می‌شود.</p>}
          </div>
          <button type="button" className="btn btn-primary text-xs" disabled={total < Math.max(1, data.minQty)} onClick={submit}>
            ادامه و تسویه حساب
          </button>
        </div>
        {total > 0 && total < data.minQty && <Notice kind="warning">برای سفارش عمده حداقل {toPersianDigits(data.minQty)} عدد لازم است.</Notice>}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-bold">سفارش‌های عمده شما</p>
        {data.orders.length === 0 ? (
          <EmptyState text="هنوز سفارش عمده‌ای ثبت نکرده‌اید." />
        ) : (
          <Table head={["شماره", "تاریخ", "تعداد", "مبلغ", "وضعیت"]}>
            {data.orders.map((o) => (
              <tr key={o.orderNumber}>
                <Td>{o.orderNumber}</Td>
                <Td>{formatJalaliShort(o.createdAt)}</Td>
                <Td>{toPersianDigits(o.items)}</Td>
                <Td>{formatToman(o.total)}</Td>
                <Td>{o.status}</Td>
              </tr>
            ))}
          </Table>
        )}
      </div>
    </div>
  );
}
