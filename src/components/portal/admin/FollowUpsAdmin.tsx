"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { FollowUpsData } from "@/lib/crm/followups";
import { SEGMENT_LABELS, SEGMENT_BADGE } from "@/lib/crm/insight";
import { PageTitle, StatCard, EmptyState, MutationNotice, useMutation, apiCall } from "@/components/portal/ui";
import { toPersianDigits } from "@/lib/currency";

// «پیگیری‌ها» — یادآوری‌های تماس، به ترتیب سررسید، و پیشنهادهای سیستم

export default function FollowUpsAdmin({ data, canOpenContacts }: { data: FollowUpsData; canOpenContacts: boolean }) {
  const [scope, setScope] = useState<"mine" | "all">(data.stats.mine ? "mine" : "all");
  const { run, busy, notice } = useMutation();
  const rows = data.rows.filter((r) => scope === "all" || r.mine);
  const contactLink = (id: string, label: string) =>
    canOpenContacts ? (
      <Link href={`/portal/contacts?id=${id}`} className="font-bold text-accent-primary">
        {label}
      </Link>
    ) : (
      <span className="font-bold">{label}</span>
    );

  return (
    <div className="space-y-5">
      <PageTitle title="پیگیری‌ها" subtitle="تماس‌هایی که باید دوباره گرفته شوند، به ترتیب سررسید؛ و مشتریانی که سیستم پیشنهاد می‌کند پیگیری شوند." />
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="عقب‌افتاده" value={toPersianDigits(data.stats.overdue)} />
        <StatCard label="سررسید تا ۲۴ ساعت" value={toPersianDigits(data.stats.today)} />
        <StatCard label="پیگیری‌های من" value={toPersianDigits(data.stats.mine)} />
      </div>
      <MutationNotice notice={notice} />
      <div className="flex gap-1.5 text-xs">
        {(
          [
            ["mine", "مال من"],
            ["all", "همه"],
          ] as const
        ).map(([k, l]) => (
          <button key={k} onClick={() => setScope(k)} className={`nav-tab-base ${scope === k ? "nav-tab-active" : "nav-tab-inactive"}`}>
            {l}
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <EmptyState text="پیگیری بازی نیست. هنگام ثبت تماس در پرونده مخاطب می‌توانید یادآوری بگذارید." />
      ) : (
        <div className="studio-card divide-y divide-border-hairline">
          {rows.map((r) => (
            <div key={r.id} className="p-3 flex flex-wrap items-center gap-3 text-xs">
              <div className="flex-1 min-w-56 space-y-0.5">
                <div className="flex items-center gap-2">
                  {contactLink(r.contactId, r.contact)}
                  <a href={`tel:${r.phone}`} className="font-mono text-text-muted" dir="ltr">
                    {toPersianDigits(r.phone)}
                  </a>
                </div>
                <p className="text-text-muted">
                  {r.channel}
                  {r.topic && ` · ${r.topic}`} · ثبت: {r.author}
                  {r.owner && ` · مسئول: ${r.owner}`}
                </p>
                <p className="whitespace-pre-wrap">{r.summary}</p>
              </div>
              <span className={`badge-status ${r.overdue ? "badge-status-danger" : "badge-status-info"}`}>{r.overdue ? `عقب‌افتاده · ${r.dueAt}` : r.dueAt}</span>
              <div className="flex gap-1">
                <button className="btn btn-primary text-xs" disabled={busy} onClick={() => run(() => apiCall("/api/admin/crm/interactions", "PATCH", { id: r.id }))}>
                  انجام شد
                </button>
                <button className="btn btn-ghost text-xs border border-border-hairline" disabled={busy} onClick={() => run(() => apiCall("/api/admin/crm/interactions", "PATCH", { id: r.id, postponeDays: 3 }))}>
                  ۳ روز بعد
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-black">پیشنهاد سیستم برای تماس</h2>
        <p className="text-[11px] text-text-muted">مشتریان ناراضی یا در خطر ریزش که هنوز پیگیری بازی ندارند (به ترتیب اهمیت).</p>
        {data.suggestions.length === 0 ? (
          <EmptyState text="فعلاً مشتری ناراضی یا در خطر ریزشی بدون پیگیری نیست." />
        ) : (
          <div className="studio-card divide-y divide-border-hairline">
            {data.suggestions.map((s) => (
              <div key={s.contactId} className="p-3 flex flex-wrap items-center gap-3 text-xs">
                <span className={`badge-status ${SEGMENT_BADGE[s.segment]}`}>{SEGMENT_LABELS[s.segment]}</span>
                {contactLink(s.contactId, s.name)}
                <span className="font-mono text-text-muted" dir="ltr">
                  {toPersianDigits(s.phone)}
                </span>
                <span className="text-text-muted flex-1">{toPersianDigits(s.reason)}</span>
                <span className="text-text-subtle">{s.owner ? `مسئول: ${s.owner}` : "بدون مسئول"}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
