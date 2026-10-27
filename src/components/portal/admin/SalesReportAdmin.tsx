"use client";

import Link from "next/link";
import type { SalesReport, SalesRow } from "@/lib/portal/sales-report";
import { PageTitle, StatCard, Table, Td, EmptyState } from "@/components/portal/ui";
import { formatToman, toPersianDigits } from "@/lib/currency";
import { formatJalaliShort } from "@/lib/jalali";

// گزارش منبع فروش و قیف فروش

function Rows({ title, rows, total }: { title: string; rows: SalesRow[]; total: number }) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-black">{title}</h2>
      {rows.length === 0 ? (
        <EmptyState text="در این بازه داده‌ای نیست." />
      ) : (
        <Table head={["منبع", "سفارش", "فروش", "سهم"]}>
          {rows.map((r) => (
            <tr key={r.key}>
              <Td>{r.label}</Td>
              <Td>{toPersianDigits(r.orders)}</Td>
              <Td className="font-mono">{formatToman(r.revenue)}</Td>
              <Td className="w-40">
                <div className="flex items-center gap-2">
                  <div className="h-2 rounded bg-accent-primary" style={{ width: `${total ? Math.max(2, (r.revenue / total) * 100) : 0}%` }} />
                  <span className="text-[11px] text-text-muted">{toPersianDigits(total ? Math.round((r.revenue / total) * 100) : 0)}٪</span>
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </section>
  );
}

export default function SalesReportAdmin({ data }: { data: SalesReport }) {
  const top = data.funnel[0]?.count || 1;
  return (
    <div className="space-y-6">
      <PageTitle
        title="منبع فروش و قیف فروش"
        subtitle="فروش پرداخت‌شده (بدون لغو و مرجوعی) به تفکیک منبع؛ و مسیر مشتریانی که در این بازه عضو شده‌اند."
        action={
          <div className="flex gap-1 text-xs">
            {[30, 90, 365].map((d) => (
              <Link key={d} href={`/portal/sales-report?days=${d}`} className={`nav-tab-base ${data.days === d ? "nav-tab-active" : "nav-tab-inactive"}`}>
                {toPersianDigits(d)} روز
              </Link>
            ))}
          </div>
        }
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="فروش" value={formatToman(data.totals.revenue)} />
        <StatCard label="سفارش پرداخت‌شده" value={toPersianDigits(data.totals.orders)} />
        <StatCard
          label="رضایت خریداران"
          value={data.satisfaction.avg ? `${toPersianDigits(data.satisfaction.avg)} از ۵` : "—"}
          hint={`${toPersianDigits(data.satisfaction.count)} نظر · ${toPersianDigits(data.satisfaction.low)} ناراضی`}
        />
        <StatCard label="تبدیل ثبت‌نام به خرید" value={`${toPersianDigits(Math.round(((data.funnel[2]?.count ?? 0) / top) * 100))}٪`} />
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-black">قیف فروش (عضوهای {toPersianDigits(data.days)} روز اخیر)</h2>
        <div className="studio-card p-4 space-y-2 text-xs">
          {data.funnel.map((f) => (
            <div key={f.label} className="flex items-center gap-3">
              <span className="w-40 shrink-0">{f.label}</span>
              <div className="flex-1 h-5 rounded bg-bg-subtle overflow-hidden">
                <div className="h-full bg-accent-primary/80" style={{ width: `${(f.count / top) * 100}%` }} />
              </div>
              <span className="w-24 text-left font-mono">
                {toPersianDigits(f.count)} <span className="text-text-muted">({toPersianDigits(Math.round((f.count / top) * 100))}٪)</span>
              </span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 text-[11px]">
          <span className="text-text-muted">مرحله مخاطبان در CRM:</span>
          {data.stages.map((s) => (
            <span key={s.label} className="badge-status badge-status-neutral">
              {s.label}: {toPersianDigits(s.count)}
            </span>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Rows title="به تفکیک کانال" rows={data.byChannel} total={data.totals.revenue} />
        <Rows title="تبلیغات (utm_source / utm_campaign)" rows={data.byUtm} total={data.totals.revenue} />
        <Rows title="سفیران برتر" rows={data.byAmbassador} total={data.totals.revenue} />
        <Rows title="کدهای تخفیف" rows={data.byCoupon} total={data.totals.revenue} />
      </div>

      {data.campaigns.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-black">کمپین‌های پیامکی اخیر</h2>
          <Table head={["کمپین", "گروه", "گیرنده", "تاریخ"]}>
            {data.campaigns.map((c) => (
              <tr key={c.id}>
                <Td>{c.title}</Td>
                <Td>{c.segment}</Td>
                <Td>{toPersianDigits(c.recipients)}</Td>
                <Td>{formatJalaliShort(c.at)}</Td>
              </tr>
            ))}
          </Table>
        </section>
      )}
      <p className="text-[11px] text-text-muted">
        برای سنجش تبلیغات، لینک‌ها را با utm بسازید؛ مثلاً <span dir="ltr" className="font-mono">?utm_source=instagram&utm_campaign=yalda</span>.
      </p>
    </div>
  );
}
