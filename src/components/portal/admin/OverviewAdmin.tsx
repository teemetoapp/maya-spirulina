"use client";

import React from "react";
import Link from "next/link";
import type { OverviewData } from "@/lib/portal/admin-loaders";
import { ORDER_STATUS_LABELS, ORDER_STATUS_BADGE } from "@/lib/commerce/dto";
import { PageTitle, Table, Td, EmptyState } from "@/components/portal/ui";
import { AreaChart, GroupedColumns, BarList, ShareBar, Meter, compact } from "@/components/portal/charts";
import { formatToman, toPersianDigits } from "@/lib/currency";

// ==============================================================
// Management dashboard: one look at the whole organisation.
// Every number comes from the database; figures the viewer may not
// see (finance) are hidden by the sections they are allowed to open.
// ==============================================================

const TIER_LABELS: Record<string, string> = { SILVER: "نقره‌ای", GOLD: "طلایی", DIAMOND: "الماس" };

function Change({ value }: { value: number | null }) {
  if (value === null) return <span className="text-text-subtle">بدون داده دوره قبل</span>;
  const up = value >= 0;
  return (
    <span className={up ? "text-success" : "text-danger"}>
      {up ? "▲" : "▼"} {toPersianDigits(Math.abs(value))}٪ <span className="text-text-subtle">نسبت به ۳۰ روز قبل</span>
    </span>
  );
}

function Kpi({ label, value, hint, href }: { label: string; value: React.ReactNode; hint?: React.ReactNode; href?: string }) {
  const body = (
    <>
      <span className="text-[11px] text-text-muted block">{label}</span>
      <span className="text-xl font-black font-mono block mt-1.5">{value}</span>
      {hint && <span className="text-[10.5px] block mt-1">{hint}</span>}
    </>
  );
  return href ? (
    <Link href={href} className="studio-card p-4 hover:border-accent-border transition-colors">
      {body}
    </Link>
  ) : (
    <div className="studio-card p-4">{body}</div>
  );
}

function Panel({ title, subtitle, action, children, className = "" }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`studio-card p-5 space-y-4 ${className}`}>
      <header className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-black">{title}</h2>
          {subtitle && <p className="text-[11px] text-text-muted mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

const minutes = (m: number | null) => (m === null ? "—" : m < 60 ? `${toPersianDigits(m)} دقیقه` : `${toPersianDigits(Math.round((m / 60) * 10) / 10)} ساعت`);

export default function OverviewAdmin({ data, allowed }: { data: OverviewData; allowed: string[] }) {
  const can = (s: string) => allowed.includes(s);
  const showFinance = can("finance");
  const margin = data.revenue ? Math.round((data.profit.net / data.revenue) * 100) : null;

  const tasks = [
    { n: data.tasks.toShip, label: "سفارش آماده ارسال", href: "/portal/orders?tab=shipping", section: "orders" },
    { n: data.tasks.openTickets, label: "تیکت بی‌پاسخ", href: "/portal/tickets", section: "tickets" },
    { n: data.tasks.pendingApps, label: "درخواست سفیری", href: "/portal/ambassadors?tab=applications", section: "ambassadors" },
    { n: data.tasks.pendingSettlements, label: "تسویه در انتظار", href: "/portal/ambassadors?tab=settlements", section: "ambassadors" },
    { n: data.tasks.lowStock.length, label: "بسته کم‌موجودی", href: "/portal/catalog?tab=inventory", section: "catalog" },
    { n: data.tasks.expiring, label: "بچ نزدیک انقضا", href: "/portal/catalog?tab=expiry", section: "catalog" },
    { n: data.tasks.failedNotifs, label: "اعلان ناموفق (۷ روز)", href: "/portal/settings?tab=logs", section: "settings" },
  ].filter((t) => t.n > 0 && can(t.section));

  const shortcuts = [
    { id: "contacts", label: "مخاطبان و دسترسی‌ها" },
    { id: "users", label: "نقش‌ها و منوها" },
    { id: "settings", label: "قوانین و تنظیمات" },
    { id: "costing", label: "بهای تمام‌شده" },
    { id: "promotions", label: "کمپین و کد تخفیف" },
    { id: "audit", label: "گزارش فعالیت" },
  ].filter((s) => can(s.id));

  return (
    <div className="space-y-5">
      <PageTitle
        title="داشبورد مدیریت سازمان"
        subtitle="نمای کلی فروش، سود، مشتریان، سفیران و پشتیبانی؛ بازه پیش‌فرض ۳۰ روز اخیر و فقط سفارش‌های پرداخت‌شده"
      />

      {shortcuts.length > 0 && (
        <nav className="flex flex-wrap gap-2" aria-label="میان‌برهای مدیریت">
          {shortcuts.map((s) => (
            <Link key={s.id} href={`/portal/${s.id}`} className="btn btn-ghost text-[11px] py-1.5 px-3 border border-border-hairline">
              {s.label}
            </Link>
          ))}
        </nav>
      )}

      {/* شاخص‌های کلیدی */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Kpi label="فروش خالص ۳۰ روز" value={compact(data.revenue)} hint={<Change value={data.revenueChange} />} href={showFinance ? "/portal/finance" : undefined} />
        {showFinance && (
          <Kpi
            label="سود خالص ۳۰ روز"
            value={compact(data.profit.net)}
            hint={<span className="text-text-muted">حاشیه سود {margin === null ? "—" : `${toPersianDigits(margin)}٪`}</span>}
            href="/portal/finance"
          />
        )}
        <Kpi label="سفارش‌ها" value={toPersianDigits(data.orders)} hint={<Change value={data.ordersChange} />} href="/portal/orders" />
        <Kpi label="میانگین سبد خرید" value={compact(data.aov)} hint={<span className="text-text-muted">{toPersianDigits(data.customers)} خریدار در این دوره</span>} />
        <Kpi
          label="مشتریان"
          value={toPersianDigits(data.people.customers)}
          hint={<span className="text-text-muted">{toPersianDigits(data.newUsers)} عضو جدید در ۳۰ روز</span>}
          href={can("contacts") ? "/portal/contacts" : undefined}
        />
        <Kpi
          label="سفیران فعال"
          value={toPersianDigits(data.people.ambassadors)}
          hint={<span className="text-text-muted">{toPersianDigits(data.people.staff)} نفر کادر سازمان</span>}
          href={can("ambassadors") ? "/portal/ambassadors" : undefined}
        />
      </div>

      {tasks.length > 0 && (
        <div className="studio-card p-4 flex flex-col md:flex-row md:items-center gap-3">
          <h2 className="text-sm font-black shrink-0">نیازمند اقدام</h2>
          <div className="flex flex-wrap gap-2">
            {tasks.map((t) => (
              <Link key={t.label} href={t.href} className="badge-status badge-status-warning py-2 px-3">
                ⚠ {toPersianDigits(t.n)} {t.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* روند فروش + کانال‌ها */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Panel title="فروش خالص روزانه" subtitle="۳۰ روز اخیر، به تومان" className="xl:col-span-2">
          <AreaChart
            data={data.daily}
            ariaLabel="نمودار فروش خالص روزانه در ۳۰ روز اخیر"
            format={formatToman}
            extra={(i) => <span className="block text-text-muted">{toPersianDigits(data.daily[i].orders)} سفارش</span>}
          />
        </Panel>
        <div className="space-y-4">
          <Panel title="کانال فروش" subtitle="سهم فروش مستقیم و فروش از طریق سفیران">
            <ShareBar
              parts={[
                { label: `مستقیم (${toPersianDigits(data.channel.direct.orders)} سفارش)`, value: data.channel.direct.revenue },
                { label: `سفیران (${toPersianDigits(data.channel.ambassador.orders)} سفارش)`, value: data.channel.ambassador.revenue },
              ]}
            />
          </Panel>
          <Panel title="وفاداری مشتری" subtitle="۱۲ ماه اخیر">
            <Meter
              label="نرخ خرید تکراری"
              value={data.loyalty.buyersYear ? data.loyalty.repeatRate : null}
              hint={`${toPersianDigits(data.loyalty.repeatBuyers)} از ${toPersianDigits(data.loyalty.buyersYear)} خریدار بیش از یک بار خرید کرده‌اند`}
            />
          </Panel>
        </div>
      </div>

      {/* روند ۱۲ ماه + ترکیب سود */}
      {showFinance && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Panel title="روند ۱۲ ماه" subtitle="فروش خالص در برابر سود خالص (پس از بهای تمام‌شده، پورسانت و هزینه‌ها)" className="xl:col-span-2">
            <GroupedColumns
              labels={data.monthly.map((m) => m.key)}
              series={[
                { name: "فروش خالص", values: data.monthly.map((m) => m.revenue) },
                { name: "سود خالص", values: data.monthly.map((m) => m.profit) },
              ]}
              format={formatToman}
              ariaLabel="نمودار فروش و سود ماهانه در ۱۲ ماه اخیر"
            />
          </Panel>
          <Panel title="از فروش تا سود" subtitle="۳۰ روز اخیر" action={<Link href="/portal/finance" className="text-[11px] text-accent-primary">گزارش مالی</Link>}>
            <ul className="text-xs divide-y divide-border-hairline">
              {[
                { label: "فروش خالص", v: data.revenue, sign: "" },
                { label: "بهای تمام‌شده کالا", v: data.profit.cogs, sign: "−" },
                { label: "پورسانت سفیران", v: data.profit.commission, sign: "−" },
                { label: "هزینه‌های عملیاتی", v: data.profit.expenses, sign: "−" },
              ].map((r) => (
                <li key={r.label} className="flex justify-between py-2">
                  <span className="text-text-muted">{r.label}</span>
                  <span className="font-mono">
                    {r.sign} {formatToman(r.v)}
                  </span>
                </li>
              ))}
              <li className="flex justify-between py-2.5 font-black">
                <span>سود خالص</span>
                <span className={`font-mono ${data.profit.net < 0 ? "text-danger" : ""}`}>{formatToman(data.profit.net)}</span>
              </li>
            </ul>
          </Panel>
        </div>
      )}

      {/* رتبه‌بندی‌ها */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Panel title="وضعیت سفارش‌ها" subtitle="همه سفارش‌های ثبت‌شده در ۳۰ روز">
          {data.statuses.length ? (
            <BarList items={data.statuses.map((s) => ({ label: ORDER_STATUS_LABELS[s.status], value: s.count }))} format={(n) => toPersianDigits(n)} />
          ) : (
            <p className="text-xs text-text-muted">سفارشی ثبت نشده است.</p>
          )}
        </Panel>
        <Panel title="پرفروش‌ترین بسته‌ها" subtitle="بر اساس مبلغ فروش، ۳۰ روز">
          {data.topVariants.length ? (
            <BarList items={data.topVariants.map((v) => ({ label: v.title, value: v.revenue, hint: `${toPersianDigits(v.quantity)} عدد` }))} />
          ) : (
            <p className="text-xs text-text-muted">فروشی ثبت نشده است.</p>
          )}
        </Panel>
        <Panel title="فروش به تفکیک استان" subtitle="۳۰ روز اخیر">
          {data.provinces.length ? <BarList items={data.provinces} /> : <p className="text-xs text-text-muted">فروشی ثبت نشده است.</p>}
        </Panel>
      </div>

      {/* سفیران + پشتیبانی */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel title="برترین سفیران" subtitle="فروش ارجاعی ۳۰ روز اخیر" action={can("ambassadors") && <Link href="/portal/ambassadors" className="text-[11px] text-accent-primary">همه سفیران</Link>}>
          {data.topAmbassadors.length === 0 ? (
            <p className="text-xs text-text-muted">در این دوره فروشی از طریق سفیران ثبت نشده است.</p>
          ) : (
            <Table head={["سفیر", "سطح", "سفارش", "فروش", "پورسانت"]}>
              {data.topAmbassadors.map((a) => (
                <tr key={a.id}>
                  <Td>{can("contacts") ? <Link href={`/portal/contacts?id=${a.id}`} className="hover:text-accent-primary">{a.name}</Link> : a.name}</Td>
                  <Td>{TIER_LABELS[a.tier] ?? a.tier}</Td>
                  <Td className="font-mono">{toPersianDigits(a.orders)}</Td>
                  <Td className="font-mono">{compact(a.revenue)}</Td>
                  <Td className="font-mono">{compact(a.commission)}</Td>
                </tr>
              ))}
            </Table>
          )}
        </Panel>
        <Panel title="پشتیبانی و رضایت مشتری" action={can("tickets") && <Link href="/portal/tickets" className="text-[11px] text-accent-primary">کانبان تیکت‌ها</Link>}>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-bg-subtle p-3">
              <span className="text-[10.5px] text-text-muted block">تیکت باز</span>
              <b className="font-mono text-lg">{toPersianDigits(data.support.open)}</b>
            </div>
            <div className="rounded-lg bg-bg-subtle p-3">
              <span className="text-[10.5px] text-text-muted block">میانگین اولین پاسخ</span>
              <b className="font-mono text-sm">{minutes(data.support.avgFirstResponseMinutes)}</b>
            </div>
            <div className="rounded-lg bg-bg-subtle p-3">
              <span className="text-[10.5px] text-text-muted block">رضایت</span>
              <b className="font-mono text-lg">{data.support.satisfaction === null ? "—" : `${toPersianDigits(data.support.satisfaction)} از ۵`}</b>
            </div>
          </div>
          <Meter
            label="پاسخ در کمتر از ۲۴ ساعت"
            value={data.support.respondedWithinDay}
            hint={`میانگین زمان حل: ${data.support.avgResolutionHours === null ? "—" : `${toPersianDigits(data.support.avgResolutionHours)} ساعت`} · ${toPersianDigits(data.support.ratedCount)} امتیاز ثبت‌شده`}
          />
        </Panel>
      </div>

      <Panel title="آخرین سفارش‌های سازمان" action={can("orders") && <Link href="/portal/orders" className="text-[11px] text-accent-primary">همه سفارش‌ها</Link>}>
        {data.recent.length === 0 ? (
          <EmptyState text="هنوز سفارشی ثبت نشده است." />
        ) : (
          <Table head={["سفارش", "مشتری", "تاریخ", "مبلغ", "وضعیت"]}>
            {data.recent.map((o) => (
              <tr key={o.id}>
                <Td className="font-mono">{o.orderNumber}</Td>
                <Td>{o.customerName}</Td>
                <Td>{o.createdAt}</Td>
                <Td className="font-mono">{formatToman(o.totalAmount)}</Td>
                <Td>
                  <span className={`badge-status ${ORDER_STATUS_BADGE[o.status]}`}>{ORDER_STATUS_LABELS[o.status]}</span>
                </Td>
              </tr>
            ))}
          </Table>
        )}
      </Panel>
    </div>
  );
}
