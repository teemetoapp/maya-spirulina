"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { RefillRow } from "@/lib/commerce/refill";
import { PageTitle, StatCard, Table, Td, EmptyState } from "@/components/portal/ui";
import { toPersianDigits } from "@/lib/currency";

// «تمدیدهای پیش رو» — مشتریانی که دوره مصرفشان رو به پایان است

const STATUS: Record<RefillRow["status"], { label: string; badge: string }> = {
  UPCOMING: { label: "در انتظار یادآوری", badge: "badge-status-neutral" },
  REMINDED: { label: "یادآوری ارسال شد", badge: "badge-status-info" },
  REORDERED: { label: "دوباره سفارش داد", badge: "badge-status-success" },
  OVERDUE: { label: "تمام شده، بدون سفارش", badge: "badge-status-warning" },
};

const FILTERS: { id: RefillRow["status"] | "ALL"; label: string }[] = [
  { id: "ALL", label: "همه" },
  { id: "UPCOMING", label: "در انتظار" },
  { id: "REMINDED", label: "یادآوری‌شده" },
  { id: "OVERDUE", label: "تمام‌شده" },
  { id: "REORDERED", label: "تمدیدشده" },
];

export default function RefillsAdmin({
  data,
  linkContacts,
}: {
  data: { rows: RefillRow[]; stats: { dueWeek: number; reminded30: number; reordered30: number; conversion: number | null } };
  linkContacts: boolean;
}) {
  const [filter, setFilter] = useState<RefillRow["status"] | "ALL">("ALL");
  const rows = data.rows.filter((r) => filter === "ALL" || r.status === filter);

  return (
    <div className="space-y-5">
      <PageTitle
        title="تمدیدهای پیش رو"
        subtitle="پایان دوره مصرف هر سفارش تحویل‌شده از روی مدت بسته‌ها محاسبه می‌شود. یادآوری و کد تخفیف طبق قوانین ماژول «یادآوری تمدید مصرف» ارسال می‌شود."
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="پایان دوره تا ۷ روز آینده" value={toPersianDigits(data.stats.dueWeek)} />
        <StatCard label="یادآوری ۳۰ روز اخیر" value={toPersianDigits(data.stats.reminded30)} />
        <StatCard label="سفارش دوباره پس از یادآوری" value={toPersianDigits(data.stats.reordered30)} />
        <StatCard label="نرخ تمدید" value={data.stats.conversion === null ? "—" : `${toPersianDigits(data.stats.conversion)}٪`} hint="از یادآوری‌های ۳۰ روز اخیر" />
      </div>

      <div className="flex flex-wrap gap-1.5 text-xs">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rounded-full px-3 py-1.5 border transition ${filter === f.id ? "border-accent-primary bg-accent-soft text-accent-primary font-bold" : "border-border-hairline text-text-muted"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState text="موردی در این بازه نیست." />
      ) : (
        <Table head={["مشتری", "محصول", "سفارش", "پایان دوره", "مانده", "وضعیت"]}>
          {rows.map((r) => (
            <tr key={r.orderNumber}>
              <Td>
                {linkContacts ? (
                  <Link href={`/portal/contacts?id=${r.customerId}`} className="font-bold text-accent-primary">
                    {r.customer}
                  </Link>
                ) : (
                  <span className="font-bold">{r.customer}</span>
                )}
                <span className="block text-[11px] text-text-muted font-mono">{toPersianDigits(r.phone)}</span>
              </Td>
              <Td className="max-w-56 truncate">{r.product}</Td>
              <Td>
                <Link href={`/portal/orders?q=${encodeURIComponent(r.orderNumber)}`} className="font-mono text-accent-primary">
                  {r.orderNumber}
                </Link>
              </Td>
              <Td>{r.dueDate}</Td>
              <Td className={r.daysLeft < 0 ? "text-warning font-bold" : ""}>
                {r.daysLeft >= 0 ? `${toPersianDigits(r.daysLeft)} روز` : `${toPersianDigits(-r.daysLeft)} روز گذشته`}
              </Td>
              <Td>
                <span className={`badge-status ${STATUS[r.status].badge}`}>{STATUS[r.status].label}</span>
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
