"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PageTitle, StatCard, Table, Td, EmptyState, MutationNotice, useMutation, apiCall } from "@/components/portal/ui";
import { toPersianDigits } from "@/lib/currency";
import type { ReviewRow } from "@/lib/portal/reviews";

// نظرسنجی بعد از تحویل و نظرهای قابل انتشار؛ فقط خریدار واقعی همان سفارش می‌تواند نظر بدهد

const STATUS = { PENDING: "در انتظار تأیید", APPROVED: "تأییدشده", REJECTED: "ردشده" } as const;

export default function ReviewsAdmin({ data, canOpenContacts }: { data: { rows: ReviewRow[]; avg: number | null; dist: number[]; pending: number }; canOpenContacts: boolean }) {
  const [filter, setFilter] = useState<"pending" | "low" | "all">(data.pending ? "pending" : "all");
  const [replies, setReplies] = useState<Record<string, string>>({});
  const { run, busy, notice } = useMutation();
  const rows = data.rows.filter((r) => (filter === "pending" ? r.publish && r.status === "PENDING" : filter === "low" ? r.rating <= 2 : true));
  const total = data.dist.reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-5">
      <PageTitle title="نظرات و رضایت خریداران" subtitle="چند روز بعد از تحویل، پیامک نظرسنجی می‌رود. نظرهایی که خریدار اجازه انتشار داده بعد از تأیید با برچسب «خرید تأییدشده» در سایت نمایش داده می‌شوند." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="میانگین رضایت" value={data.avg ? `${toPersianDigits(data.avg)} از ۵` : "—"} hint={`${toPersianDigits(total)} پاسخ`} />
        <StatCard label="ناراضی (۱ و ۲ ستاره)" value={toPersianDigits(data.dist[0] + data.dist[1])} />
        <StatCard label="راضی (۴ و ۵ ستاره)" value={toPersianDigits(data.dist[3] + data.dist[4])} />
        <StatCard label="در انتظار تأیید انتشار" value={toPersianDigits(data.pending)} />
      </div>
      <MutationNotice notice={notice} />
      <div className="flex gap-1.5 text-xs">
        {(
          [
            ["pending", "در انتظار انتشار"],
            ["low", "ناراضی‌ها"],
            ["all", "همه"],
          ] as const
        ).map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} className={`nav-tab-base ${filter === k ? "nav-tab-active" : "nav-tab-inactive"}`}>
            {l}
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <EmptyState text="موردی نیست." />
      ) : (
        <Table head={["خریدار", "امتیاز", "نظر", "انتشار", ""]}>
          {rows.map((r) => (
            <tr key={r.id}>
              <Td>
                {canOpenContacts ? (
                  <Link href={`/portal/contacts?id=${r.customerId}`} className="font-bold text-accent-primary">{r.customer}</Link>
                ) : (
                  r.customer
                )}
                <span className="block text-[10px] text-text-muted font-mono">{r.orderNumber} · {r.at}</span>
              </Td>
              <Td className={r.rating <= 2 ? "text-danger font-bold" : ""}>
                <span aria-label={`${r.rating} از ۵`}>{"★".repeat(r.rating)}</span>
              </Td>
              <Td className="max-w-80 whitespace-pre-wrap">{r.body ?? <span className="text-text-muted">بدون متن</span>}</Td>
              <Td>{r.publish ? `${STATUS[r.status]} · ${r.displayName ?? ""}` : <span className="text-text-muted">فقط نظرسنجی</span>}</Td>
              <Td className="min-w-56 space-y-1">
                {r.publish && (
                  <div className="flex gap-1">
                    {r.status !== "APPROVED" && (
                      <button className="btn btn-primary text-xs" disabled={busy} onClick={() => run(() => apiCall("/api/admin/reviews", "PATCH", { id: r.id, status: "APPROVED" }))}>تأیید انتشار</button>
                    )}
                    {r.status !== "REJECTED" && (
                      <button className="btn btn-ghost text-xs text-danger" disabled={busy} onClick={() => run(() => apiCall("/api/admin/reviews", "PATCH", { id: r.id, status: "REJECTED" }))}>عدم انتشار</button>
                    )}
                  </div>
                )}
                {r.publish && (
                  <div className="flex gap-1">
                    <input className="input text-xs flex-1" placeholder="پاسخ برند (نمایش در سایت)" value={replies[r.id] ?? r.reply ?? ""} onChange={(e) => setReplies({ ...replies, [r.id]: e.target.value })} />
                    <button className="btn btn-outline text-xs" disabled={busy || replies[r.id] === undefined} onClick={() => run(() => apiCall("/api/admin/reviews", "PATCH", { id: r.id, reply: replies[r.id] }))}>ثبت</button>
                  </div>
                )}
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
