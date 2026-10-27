"use client";

import React, { useState } from "react";
import { apiCall, useMutation, PageTitle, MutationNotice, Table, Td, EmptyState, StatCard } from "@/components/portal/ui";
import { SAMPLE_KIT_STATUS_LABELS } from "@/lib/portal/labels";
import { toPersianDigits } from "@/lib/currency";

interface KitRow {
  id: string;
  code: string;
  ambassador: string;
  recipientName: string;
  recipientPhone: string;
  status: keyof typeof SAMPLE_KIT_STATUS_LABELS;
  deliveredAt: string;
  followUpAt: string;
  followUpDue: boolean;
  convertedOrderNumber: string | null;
  notes: string;
}

export default function SampleKitsAdmin({ kits }: { kits: KitRow[] }) {
  const [filter, setFilter] = useState<"ALL" | KitRow["status"]>("ALL");
  const { run, busy, notice } = useMutation();
  const converted = kits.filter((k) => k.status === "CONVERTED").length;
  const shown = kits.filter((k) => filter === "ALL" || k.status === filter);

  return (
    <div className="space-y-5">
      <PageTitle title="کیت سمپل و پیگیری" subtitle="سفیران کیت‌هایی که تحویل می‌دهند را ثبت می‌کنند؛ روز پیگیری یادآوری به سفیر ارسال می‌شود." />
      <MutationNotice notice={notice} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="کل کیت‌ها" value={toPersianDigits(kits.length)} />
        <StatCard label="منتظر پیگیری" value={toPersianDigits(kits.filter((k) => k.followUpDue).length)} />
        <StatCard label="به خرید رسیده" value={toPersianDigits(converted)} />
        <StatCard label="نرخ تبدیل" value={kits.length ? `${toPersianDigits(Math.round((converted / kits.length) * 100))}٪` : "—"} />
      </div>
      <div className="flex flex-wrap gap-2">
        {(["ALL", ...Object.keys(SAMPLE_KIT_STATUS_LABELS)] as const).map((f) => (
          <button key={f} className={`nav-tab-base ${filter === f ? "nav-tab-active" : "nav-tab-inactive"}`} onClick={() => setFilter(f as typeof filter)}>
            {f === "ALL" ? "همه" : SAMPLE_KIT_STATUS_LABELS[f as KitRow["status"]]}
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <EmptyState text="کیتی ثبت نشده است." />
      ) : (
        <Table head={["کد", "سفیر", "دریافت‌کننده", "تحویل", "پیگیری", "وضعیت", "سفارش"]}>
          {shown.map((k) => (
            <tr key={k.id}>
              <Td className="font-mono">{k.code}</Td>
              <Td>{k.ambassador}</Td>
              <Td>{k.recipientName}<span className="block text-[11px] text-text-muted font-mono">{toPersianDigits(k.recipientPhone)}</span></Td>
              <Td>{k.deliveredAt}</Td>
              <Td className={k.followUpDue ? "text-warning font-bold" : ""}>{k.followUpAt}</Td>
              <Td>
                <select className="input text-xs w-auto" value={k.status} disabled={busy} onChange={(e) => run(() => apiCall("/api/portal/ambassador/samples", "PATCH", { id: k.id, status: e.target.value }))}>
                  {Object.entries(SAMPLE_KIT_STATUS_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
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
