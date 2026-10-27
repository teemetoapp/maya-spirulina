"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import type { CampaignsData } from "@/lib/marketing/campaigns";
import { PageTitle, StatCard, Table, Td, EmptyState, Field, MutationNotice, useMutation, apiCall, Notice } from "@/components/portal/ui";
import { toPersianDigits } from "@/lib/currency";
import { formatJalaliDateTime } from "@/lib/jalali";

// کمپین پیامکی گروهی؛ فقط به دارندگان رضایت، همیشه با «لغو۱۱»

export default function CampaignsAdmin({ data }: { data: CampaignsData }) {
  const [form, setForm] = useState({ title: "", body: "", audience: "all" });
  const [count, setCount] = useState<number | null>(null);
  const { run, busy, notice } = useMutation();

  useEffect(() => {
    let live = true;
    apiCall<{ success: boolean; count?: number }>(`/api/admin/campaigns?audience=${encodeURIComponent(form.audience)}`, "GET").then((r) => {
      if (live) setCount(r.success ? (r.count ?? 0) : null);
    });
    return () => {
      live = false;
    };
  }, [form.audience]);

  const preview = `${form.body.replace(/\{\{\s*name\s*\}\}/g, "مریم")}\nلغو۱۱`;
  const parts = Math.max(1, Math.ceil(preview.length / 70));

  return (
    <div className="space-y-6">
      <PageTitle title="کمپین پیامکی" subtitle="پیامک تبلیغاتی فقط برای کسانی ارسال می‌شود که رضایت داده‌اند؛ «لغو۱۱» خودکار به انتهای هر پیام اضافه می‌شود." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="دارای رضایت پیامک" value={toPersianDigits(data.consent.consented)} hint={`از ${toPersianDigits(data.consent.customers)} کاربر فعال`} />
        <StatCard label="لغو کرده‌اند" value={toPersianDigits(data.consent.optedOut)} />
        <StatCard label="پیامک بازگشت (۳۰ روز)" value={data.winback.enabled ? toPersianDigits(data.winback.sent30) : "خاموش"} hint={<Link href="/portal/modules" className="underline">تنظیم در ماژول‌ها</Link>} />
        <StatCard label="خرید با کد بازگشت" value={toPersianDigits(data.winback.used)} />
      </div>

      <form
        className="studio-card p-5 space-y-3 text-xs max-w-2xl"
        onSubmit={(e) => {
          e.preventDefault();
          if (!window.confirm(`پیامک برای ${toPersianDigits(count ?? 0)} نفر ارسال شود؟ این کار قابل برگشت نیست.`)) return;
          run(() => apiCall("/api/admin/campaigns", "POST", form)).then(() => setForm({ ...form, title: "", body: "" }));
        }}
      >
        <MutationNotice notice={notice} />
        <Field label="عنوان داخلی کمپین">
          <input className="input w-full" maxLength={80} required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="مثلاً جشنواره یلدا" />
        </Field>
        <Field label="گیرندگان">
          <select className="input w-full" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
            {data.audiences.map((a) => (
              <option key={a.key} value={a.key}>{a.label}</option>
            ))}
          </select>
        </Field>
        <p className="text-text-muted">{count === null ? "در حال شمارش…" : `${toPersianDigits(count)} نفر با رضایت پیامک در این گروه`}</p>
        <Field label="متن پیامک ({{name}} = نام مشتری)">
          <textarea className="input w-full min-h-24" maxLength={300} required value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        </Field>
        {form.body && (
          <Notice kind="info">
            <span className="whitespace-pre-wrap">{preview}</span>
            <span className="block text-[11px] mt-1">حدود {toPersianDigits(parts)} پیامک برای هر نفر</span>
          </Notice>
        )}
        <button className="btn btn-primary text-xs" disabled={busy || !count}>ارسال کمپین</button>
      </form>

      <section className="space-y-2">
        <h2 className="text-sm font-black">کمپین‌های قبلی</h2>
        {data.campaigns.length === 0 ? (
          <EmptyState text="هنوز کمپینی ارسال نشده است." />
        ) : (
          <Table head={["کمپین", "گروه", "گیرنده", "ارسال‌شده", "ناموفق", "تاریخ"]}>
            {data.campaigns.map((c) => (
              <tr key={c.id}>
                <Td>{c.title}<span className="block text-[11px] text-text-muted max-w-72 truncate">{c.body}</span></Td>
                <Td>{c.segment}</Td>
                <Td>{toPersianDigits(c.recipients)}</Td>
                <Td>{toPersianDigits(c.sent)}</Td>
                <Td className={c.failed ? "text-danger" : ""}>{toPersianDigits(c.failed)}</Td>
                <Td>{formatJalaliDateTime(c.at)}</Td>
              </tr>
            ))}
          </Table>
        )}
      </section>
    </div>
  );
}
