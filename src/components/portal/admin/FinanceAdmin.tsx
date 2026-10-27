"use client";

import React, { useState } from "react";
import type { FinanceData } from "@/lib/portal/admin-loaders";
import { PageTitle, Table, Td, EmptyState, StatCard, Notice, Field, MutationNotice, apiCall, useMutation } from "@/components/portal/ui";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/portal/labels";
import { formatToman, toPersianDigits } from "@/lib/currency";

// Profit & loss per Jalali month from real orders. COGS uses the unit
// cost stored on each order line at the time of purchase.
export default function FinanceAdmin({ data, invoices = false }: { data: FinanceData; invoices?: boolean }) {
  const t = data.months.reduce(
    (a, m) => ({
      gross: a.gross + m.gross,
      discount: a.discount + m.discount,
      cogs: a.cogs + m.cogs,
      commission: a.commission + m.commission,
      refunds: a.refunds + m.refunds,
      shipping: a.shipping + m.shipping,
      expenses: a.expenses + m.expenses,
    }),
    { gross: 0, discount: 0, cogs: 0, commission: 0, refunds: 0, shipping: 0, expenses: 0 }
  );
  const net = t.gross - t.discount - t.refunds;
  const profit = net - t.cogs - t.commission;
  const netProfit = profit + t.shipping - t.expenses;

  return (
    <div className="space-y-5">
      <PageTitle
        title="حسابداری و سود"
        subtitle="۱۲ ماه اخیر، محاسبه‌شده از سفارش‌های پرداخت‌شده و هزینه‌های ثبت‌شده. هیچ عددی دستی وارد نمی‌شود."
        action={
          <div className="flex flex-wrap gap-2">
            <a href="/api/admin/finance/export?type=pnl" className="btn btn-outline text-xs" download>
              اکسل سود و زیان
            </a>
            <a href="/api/admin/finance/export?type=orders" className="btn btn-ghost text-xs" download>
              اکسل سفارش‌ها
            </a>
            <a href="/api/admin/finance/export?type=expenses" className="btn btn-ghost text-xs" download>
              اکسل هزینه‌ها
            </a>
            {invoices && (
              <a href="/api/admin/finance/invoices?days=31" className="btn btn-ghost text-xs" download title="صورتحساب‌های ۳۱ روز اخیر برای بارگذاری در سامانه مودیان؛ ستون‌ها را با حسابدار چک کنید">
                اکسل صورتحساب‌ها (مودیان)
              </a>
            )}
          </div>
        }
      />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard label="فروش خالص کالا" value={formatToman(net)} hint={`تخفیف‌ها ${formatToman(t.discount)} · مرجوعی ${formatToman(t.refunds)}`} />
        <StatCard label="بهای تمام‌شده کالا (COGS)" value={formatToman(t.cogs)} />
        <StatCard label="پورسانت سفیران" value={formatToman(t.commission)} hint={`پرداخت‌شده: ${formatToman(data.settlementsPaid)}`} />
        <StatCard label="سود ناخالص" value={formatToman(profit)} hint={net ? `حاشیه ${toPersianDigits(Math.round((profit / net) * 100))}٪` : undefined} />
        <StatCard label="هزینه‌های عملیاتی" value={formatToman(t.expenses)} hint={`دریافتی بابت ارسال: ${formatToman(t.shipping)}`} />
        <StatCard label="سود خالص" value={formatToman(netProfit)} hint={net ? `حاشیه ${toPersianDigits(Math.round((netProfit / net) * 100))}٪` : undefined} />
      </div>
      <Notice kind="info">سود خالص = سود ناخالص + دریافتی بابت ارسال − هزینه‌های عملیاتی. هزینه پست و پیک را در تب «هزینه‌ها» ثبت کنید تا در سود دیده شود.</Notice>
      {data.months.length === 0 ? (
        <EmptyState text="هنوز فروشی ثبت نشده است." />
      ) : (
        <Table head={["ماه", "سفارش", "فروش کالا", "تخفیف", "مرجوعی", "بهای تمام‌شده", "پورسانت", "سود ناخالص", "هزینه‌ها", "سود خالص"]}>
          {data.months.map((m) => {
            const p = m.gross - m.discount - m.refunds - m.cogs - m.commission;
            const np = p + m.shipping - m.expenses;
            return (
              <tr key={m.key}>
                <Td className="font-mono">{toPersianDigits(m.key)}</Td>
                <Td className="font-mono">{toPersianDigits(m.orders)}</Td>
                <Td className="font-mono">{formatToman(m.gross)}</Td>
                <Td className="font-mono">{formatToman(m.discount)}</Td>
                <Td className="font-mono">{formatToman(m.refunds)}</Td>
                <Td className="font-mono">{formatToman(m.cogs)}</Td>
                <Td className="font-mono">{formatToman(m.commission)}</Td>
                <Td className={`font-mono ${p < 0 ? "text-danger" : ""}`}>{formatToman(p)}</Td>
                <Td className="font-mono">{formatToman(m.expenses)}</Td>
                <Td className={`font-mono font-bold ${np < 0 ? "text-danger" : ""}`}>{formatToman(np)}</Td>
              </tr>
            );
          })}
        </Table>
      )}
    </div>
  );
}

const CATEGORIES = Object.entries(EXPENSE_CATEGORY_LABELS) as [keyof typeof EXPENSE_CATEGORY_LABELS, string][];

// Operating expenses: entered once here, then every report computes from them.
export function ExpensesAdmin({ data, canManage }: { data: FinanceData; canManage: boolean }) {
  const empty = { title: "", amount: "", category: "OTHER", spentAt: "", note: "" };
  const [form, setForm] = useState(empty);
  const { run, busy, notice } = useMutation();
  const total = data.expenses.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-5">
      <PageTitle title="هزینه‌ها" subtitle={`مجموع ۱۲ ماه اخیر: ${formatToman(total)}`} />
      <MutationNotice notice={notice} />
      {canManage && (
        <form
          className="studio-card p-5 grid grid-cols-1 md:grid-cols-5 gap-3 text-xs items-end"
          onSubmit={async (e) => {
            e.preventDefault();
            const res = await run(() => apiCall("/api/admin/expenses", "POST", { ...form, amount: Number(form.amount) }));
            if (res.success) setForm(empty);
          }}
        >
          <Field label="عنوان">
            <input className="input w-full" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="مثلاً تبلیغ اینستاگرام" />
          </Field>
          <Field label="دسته">
            <select className="input w-full" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map(([k, l]) => (
                <option key={k} value={k}>{l}</option>
              ))}
            </select>
          </Field>
          <Field label="مبلغ (تومان)">
            <input className="input w-full font-mono" dir="ltr" inputMode="numeric" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/[^0-9]/g, "") })} />
          </Field>
          <Field label="تاریخ (خالی = امروز)">
            <input className="input w-full font-mono" dir="ltr" placeholder="۱۴۰۵/۰۸/۰۴" value={form.spentAt} onChange={(e) => setForm({ ...form, spentAt: e.target.value })} />
          </Field>
          <button className="btn btn-primary text-xs" disabled={busy}>ثبت هزینه</button>
        </form>
      )}
      {data.expenses.length === 0 ? (
        <EmptyState text="هنوز هزینه‌ای ثبت نشده است." />
      ) : (
        <Table head={canManage ? ["تاریخ", "عنوان", "دسته", "مبلغ", ""] : ["تاریخ", "عنوان", "دسته", "مبلغ"]}>
          {data.expenses.map((e) => (
            <tr key={e.id}>
              <Td>{e.date}</Td>
              <Td>{e.title}</Td>
              <Td>{EXPENSE_CATEGORY_LABELS[e.category]}</Td>
              <Td className="font-mono">{formatToman(e.amount)}</Td>
              {canManage && (
                <Td>
                  <button
                    type="button"
                    className="btn btn-ghost text-xs text-danger"
                    disabled={busy}
                    onClick={() => confirm("این هزینه حذف شود؟") && run(() => apiCall("/api/admin/expenses", "DELETE", { id: e.id }))}
                  >
                    حذف
                  </button>
                </Td>
              )}
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
