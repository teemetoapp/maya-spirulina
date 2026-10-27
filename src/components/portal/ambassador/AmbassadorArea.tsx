"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  apiCall,
  useMutation,
  PageTitle,
  MutationNotice,
  StatCard,
  EmptyState,
  Table,
  Td,
  Field,
  Notice,
} from "@/components/portal/ui";
import { formatToman, toPersianDigits, toEnglishDigits } from "@/lib/currency";
import { TIER_LABELS, SAMPLE_KIT_STATUS_LABELS, SETTLEMENT_STATUS_LABELS } from "@/lib/portal/labels";
import type { AmbassadorData } from "@/lib/portal/ambassador-data";

// ==============================================================
// Ambassador area — dashboard, referral link, sample kits and payouts.
// Everything is read from the database; commission is released to the
// wallet only after the referred order is delivered.
// ==============================================================

export type AmbassadorView = "ambassador" | "ambassador-links" | "ambassador-referrals" | "ambassador-samples" | "ambassador-settlements";

const ORDER_BADGE: Record<string, string> = {
  PAID: "badge-status-info",
  PROCESSING: "badge-status-info",
  SHIPPED: "badge-status-warning",
  DELIVERED: "badge-status-success",
  CANCELLED: "badge-status-danger",
  REFUNDED: "badge-status-danger",
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn btn-outline text-xs"
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
    >
      {copied ? "کپی شد" : "کپی"}
    </button>
  );
}

function Dashboard({ data }: { data: AmbassadorData }) {
  return (
    <div className="space-y-6">
      <PageTitle
        title={`سلام ${data.name}`}
        subtitle={`سطح سفیر: ${TIER_LABELS[data.tier]} · پورسانت شما ${toPersianDigits(data.commissionPercent)}٪ از مبلغ خالص هر سفارش معرفی‌شده`}
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="موجودی قابل تسویه" value={formatToman(data.walletBalance)} />
        <StatCard label="پورسانت در انتظار تحویل سفارش" value={formatToman(data.pendingCommission)} />
        <StatCard label="کل پورسانت کسب‌شده" value={formatToman(data.totalEarned)} />
        <StatCard label="فروش معرفی‌شده" value={formatToman(data.stats.sales)} hint={`${toPersianDigits(data.stats.orders)} سفارش · ${toPersianDigits(data.stats.customers)} مشتری`} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="سفارش تحویل‌شده" value={toPersianDigits(data.stats.delivered)} />
        <StatCard label="کیت سمپل تحویل‌شده" value={toPersianDigits(data.stats.kits)} />
        <StatCard
          label="نرخ تبدیل کیت به خرید"
          value={data.stats.kits ? `${toPersianDigits(Math.round((data.stats.converted / data.stats.kits) * 100))}٪` : "—"}
        />
        <StatCard label="کل تسویه‌شده" value={formatToman(data.totalWithdrawn)} />
      </div>
      {data.next && (
        <div className="studio-card p-5 space-y-2 text-xs">
          <div className="flex items-center justify-between gap-3">
            <span className="font-bold">
              تا سطح {TIER_LABELS[data.next.tier]} (پورسانت {toPersianDigits(data.next.percent)}٪)
            </span>
            <span className="text-text-muted">{formatToman(data.next.remaining)} فروش تحویل‌شده دیگر</span>
          </div>
          <div className="w-full h-2 rounded-full bg-bg-subtle overflow-hidden">
            <div
              className="h-full bg-accent-primary rounded-full"
              style={{ width: `${Math.min(100, Math.round(((data.next.threshold - data.next.remaining) / data.next.threshold) * 100))}%` }}
            />
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black">آخرین سفارش‌های معرفی‌شده</h2>
          <Link href="/portal/ambassador-referrals" className="text-xs text-accent-primary font-bold">همه زیرمجموعه‌ها</Link>
        </div>
        {data.referredOrders.length === 0 ? (
          <EmptyState text="هنوز سفارشی با کد معرفی شما ثبت نشده است. لینک معرفی را از بخش «لینک و QR» بردارید." />
        ) : (
          <OrdersTable orders={data.referredOrders.slice(0, 5)} />
        )}
      </div>
    </div>
  );
}

function OrdersTable({ orders }: { orders: AmbassadorData["referredOrders"] }) {
  return (
          <Table head={["سفارش", "تاریخ", "مشتری", "مبلغ خالص", "پورسانت", "وضعیت"]}>
            {orders.map((o) => (
              <tr key={o.id}>
                <Td className="font-mono">{o.orderNumber}</Td>
                <Td>{o.date}</Td>
                <Td>{o.customer}</Td>
                <Td className="font-mono">{formatToman(o.amount)}</Td>
                <Td className="font-mono">
                  {formatToman(o.commission)}
                  <span className="block text-[10px] text-text-muted">{o.released ? "واریز شد" : "پس از تحویل"}</span>
                </Td>
                <Td>
                  <span className={`badge-status ${ORDER_BADGE[o.status] ?? "badge-status-neutral"}`}>{o.statusLabel}</span>
                </Td>
              </tr>
            ))}
          </Table>
  );
}

function Referrals({ data }: { data: AmbassadorData }) {
  return (
    <div className="space-y-6">
      <PageTitle
        title="زیرمجموعه‌ها"
        subtitle={`${toPersianDigits(data.referredCustomers.length)} مشتری با لینک یا کد شما خرید کرده‌اند. نام مشتری برای حفظ حریم خصوصی کوتاه نمایش داده می‌شود.`}
      />
      {data.referredCustomers.length === 0 ? (
        <EmptyState text="هنوز مشتری‌ای از طریق شما خرید نکرده است." />
      ) : (
        <Table head={["مشتری", "تعداد سفارش", "مبلغ خرید", "پورسانت شما", "آخرین سفارش"]}>
          {data.referredCustomers.map((c) => (
            <tr key={c.key}>
              <Td>{c.customer}</Td>
              <Td className="font-mono">{toPersianDigits(c.orders)}</Td>
              <Td className="font-mono">{formatToman(c.amount)}</Td>
              <Td className="font-mono">{formatToman(c.commission)}</Td>
              <Td>{c.lastOrder}</Td>
            </tr>
          ))}
        </Table>
      )}
      {data.referredOrders.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-black">همه سفارش‌های معرفی‌شده</h2>
          <OrdersTable orders={data.referredOrders} />
        </div>
      )}
    </div>
  );
}

function Links({ data }: { data: AmbassadorData }) {
  const [slug, setSlug] = useState(data.slug ?? "");
  const { run, busy, notice } = useMutation();
  return (
    <div className="space-y-6 max-w-3xl">
      <PageTitle
        title="لینک و QR"
        subtitle={`مشتریانی که از لینک شما وارد شوند تا ${toPersianDigits(30)} روز به شما منتسب می‌شوند و ${toPersianDigits(data.customerDiscount)}٪ تخفیف می‌گیرند.`}
      />
      <MutationNotice notice={notice} />
      <div className="studio-card p-5 space-y-4 text-xs">
        <Field label="لینک معرفی اختصاصی">
          <div className="flex gap-2">
            <input readOnly dir="ltr" className="input w-full font-mono" value={data.refLink} />
            <CopyButton text={data.refLink} />
          </div>
        </Field>
        <Field label="کد معرفی (برای واردکردن در صفحه پرداخت)">
          <div className="flex gap-2">
            <input readOnly dir="ltr" className="input w-full font-mono" value={data.referralCode} />
            <CopyButton text={data.referralCode} />
          </div>
        </Field>
        <Field label="کد QR لینک معرفی (برای چاپ روی کارت ویزیت یا میز مطب)">
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={data.refQr} alt="QR لینک معرفی" width={160} height={160} className="rounded-lg border border-border-hairline bg-white p-1" />
            <a href={data.refQr} download={`maya-ref-${data.slug ?? data.referralCode}.png`} className="btn btn-outline text-xs">
              دانلود QR
            </a>
          </div>
        </Field>
        {data.storyLink && (
          <Field label="صفحه داستان شما">
            <a href={data.storyLink} target="_blank" rel="noreferrer" dir="ltr" className="text-accent-primary underline font-mono block">
              {data.storyLink}
            </a>
          </Field>
        )}
      </div>
      <form
        className="studio-card p-5 space-y-3 text-xs"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => apiCall("/api/portal/ambassador/profile", "PATCH", { slug }));
        }}
      >
        <h2 className="text-sm font-bold">آدرس کوتاه لینک</h2>
        <p className="text-text-muted">مثلاً dr-rahimi تا لینک شما به شکل …/ref/dr-rahimi باشد.</p>
        <div className="flex gap-2">
          <input dir="ltr" className="input w-full font-mono" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="dr-name" />
          <button className="btn btn-primary text-xs" disabled={busy}>
            ذخیره
          </button>
        </div>
      </form>
    </div>
  );
}

function Samples({ data }: { data: AmbassadorData }) {
  const [form, setForm] = useState({ recipientName: "", recipientPhone: "", notes: "" });
  const { run, busy, notice } = useMutation();
  const due = data.sampleKits.filter((k) => k.followUpDue);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const res = await run(() =>
      apiCall("/api/portal/ambassador/samples", "POST", { ...form, recipientPhone: toEnglishDigits(form.recipientPhone) })
    );
    if (res.success) setForm({ recipientName: "", recipientPhone: "", notes: "" });
  }

  function setStatus(id: string, status: string) {
    const orderNumber = status === "CONVERTED" ? window.prompt("شماره سفارش خرید (اختیاری):") ?? "" : "";
    run(() => apiCall("/api/portal/ambassador/samples", "PATCH", { id, status, orderNumber }));
  }

  return (
    <div className="space-y-6">
      <PageTitle
        title="کیت‌های سمپل من"
        subtitle={`هر کیتی که به کسی می‌دهید را ثبت کنید؛ ${toPersianDigits(data.followUpDays)} روز بعد برای پیگیری به شما یادآوری می‌شود.`}
      />
      <MutationNotice notice={notice} />
      {due.length > 0 && (
        <Notice kind="warning">
          امروز {toPersianDigits(due.length)} کیت منتظر پیگیری شماست: {due.map((k) => k.recipientName).join("، ")}
        </Notice>
      )}
      <form onSubmit={add} className="studio-card p-5 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end text-xs">
        <Field label="نام دریافت‌کننده">
          <input required className="input w-full" value={form.recipientName} onChange={(e) => setForm({ ...form, recipientName: e.target.value })} />
        </Field>
        <Field label="موبایل">
          <input required dir="ltr" className="input w-full" value={form.recipientPhone} onChange={(e) => setForm({ ...form, recipientPhone: e.target.value })} />
        </Field>
        <Field label="یادداشت">
          <input className="input w-full" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>
        <button className="btn btn-primary text-xs" disabled={busy}>
          ثبت کیت
        </button>
      </form>
      {data.sampleKits.length === 0 ? (
        <EmptyState text="هنوز کیتی ثبت نکرده‌اید." />
      ) : (
        <Table head={["کد", "دریافت‌کننده", "تحویل", "پیگیری", "وضعیت", "سفارش"]}>
          {data.sampleKits.map((k) => (
            <tr key={k.id}>
              <Td className="font-mono">{k.code}</Td>
              <Td>
                {k.recipientName}
                <span className="block text-[11px] text-text-muted font-mono">{toPersianDigits(k.recipientPhone)}</span>
              </Td>
              <Td>{k.deliveredAt}</Td>
              <Td>
                <span className={k.followUpDue ? "text-warning font-bold" : ""}>{k.followUpAt}</span>
              </Td>
              <Td>
                <select className="input text-xs w-auto" value={k.status} disabled={busy} onChange={(e) => setStatus(k.id, e.target.value)}>
                  {Object.entries(SAMPLE_KIT_STATUS_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </Td>
              <Td className="font-mono">{k.convertedOrderNumber ?? "—"}</Td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}

function Settlements({ data }: { data: AmbassadorData }) {
  const [form, setForm] = useState({ amount: String(data.walletBalance), shebaNumber: data.shebaNumber, accountHolder: data.name });
  const { run, busy, notice } = useMutation();
  const hasOpen = data.settlements.some((s) => s.status === "PENDING" || s.status === "APPROVED");

  return (
    <div className="space-y-6">
      <PageTitle
        title="تسویه پورسانت"
        subtitle={`حداقل مبلغ تسویه ${formatToman(data.minSettlement)}. مبلغ درخواستی تا زمان واریز از موجودی کسر و نگه داشته می‌شود.`}
      />
      <MutationNotice notice={notice} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard label="موجودی قابل تسویه" value={formatToman(data.walletBalance)} />
        <StatCard label="در انتظار تحویل سفارش" value={formatToman(data.pendingCommission)} />
        <StatCard label="کل تسویه‌شده" value={formatToman(data.totalWithdrawn)} />
      </div>
      {hasOpen ? (
        <Notice kind="info">یک درخواست تسویه در جریان دارید. پس از واریز آن می‌توانید درخواست جدید ثبت کنید.</Notice>
      ) : (
        <form
          className="studio-card p-5 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end text-xs"
          onSubmit={(e) => {
            e.preventDefault();
            run(() =>
              apiCall("/api/portal/ambassador/settlements", "POST", {
                ...form,
                amount: Number(toEnglishDigits(form.amount)),
                shebaNumber: toEnglishDigits(form.shebaNumber),
              })
            );
          }}
        >
          <Field label="مبلغ (تومان)">
            <input required dir="ltr" className="input w-full font-mono" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </Field>
          <Field label="شماره شبا">
            <input required dir="ltr" className="input w-full font-mono" placeholder="IR..." value={form.shebaNumber} onChange={(e) => setForm({ ...form, shebaNumber: e.target.value })} />
          </Field>
          <Field label="نام صاحب حساب">
            <input required className="input w-full" value={form.accountHolder} onChange={(e) => setForm({ ...form, accountHolder: e.target.value })} />
          </Field>
          <button className="btn btn-primary text-xs" disabled={busy || data.walletBalance < data.minSettlement}>
            درخواست تسویه
          </button>
        </form>
      )}
      {data.settlements.length === 0 ? (
        <EmptyState text="هنوز درخواست تسویه‌ای ثبت نکرده‌اید." />
      ) : (
        <Table head={["تاریخ", "مبلغ", "حساب", "وضعیت", "پیگیری بانکی / توضیح"]}>
          {data.settlements.map((s) => (
            <tr key={s.id}>
              <Td>{s.date}</Td>
              <Td className="font-mono">{formatToman(s.amount)}</Td>
              <Td>
                {s.bankName}
                <span className="block text-[11px] text-text-muted font-mono" dir="ltr">
                  {s.shebaNumber}
                </span>
              </Td>
              <Td>
                <span
                  className={`badge-status ${
                    s.status === "PAID" ? "badge-status-success" : s.status === "REJECTED" ? "badge-status-danger" : "badge-status-warning"
                  }`}
                >
                  {SETTLEMENT_STATUS_LABELS[s.status]}
                </span>
              </Td>
              <Td className="font-mono">{s.receipt ?? s.note ?? "—"}</Td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}

export default function AmbassadorArea({ view, data }: { view: AmbassadorView; data: AmbassadorData }) {
  switch (view) {
    case "ambassador":
      return <Dashboard data={data} />;
    case "ambassador-links":
      return <Links data={data} />;
    case "ambassador-referrals":
      return <Referrals data={data} />;
    case "ambassador-samples":
      return <Samples data={data} />;
    case "ambassador-settlements":
      return <Settlements data={data} />;
  }
}
