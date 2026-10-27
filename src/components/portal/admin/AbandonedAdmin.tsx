"use client";

import React from "react";
import type { OrderDTO } from "@/lib/commerce/dto";
import { PageTitle, Table, Td, EmptyState, StatCard } from "@/components/portal/ui";
import { formatToman, toPersianDigits } from "@/lib/currency";

type Row = OrderDTO & { accountName: string | null; accountPhone: string };

// Checkouts that were started but never paid. They are real orders in
// PENDING (or auto-cancelled) state, so the team can call the customer.
export default function AbandonedAdmin({ rows }: { rows: Row[] }) {
  const pending = rows.filter((r) => r.status === "PENDING");
  return (
    <div className="space-y-5">
      <PageTitle
        title="پرداخت‌های ناتمام"
        subtitle="مشتریانی که فرم خرید را پر کرده‌اند ولی پرداخت نکرده‌اند. سفارش پرداخت‌نشده پس از مدت تعیین‌شده در تنظیمات خودکار لغو می‌شود."
      />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard label="در انتظار پرداخت" value={toPersianDigits(pending.length)} />
        <StatCard label="ارزش در انتظار" value={formatToman(pending.reduce((s, r) => s + r.totalAmount, 0))} />
        <StatCard label="لغو شده بدون پرداخت" value={toPersianDigits(rows.length - pending.length)} />
      </div>
      {rows.length === 0 ? (
        <EmptyState text="پرداخت ناتمامی وجود ندارد." />
      ) : (
        <Table head={["تاریخ", "مشتری", "تماس", "اقلام", "مبلغ", "وضعیت"]}>
          {rows.map((r) => (
            <tr key={r.id}>
              <Td>{r.createdAt}</Td>
              <Td>{r.accountName ?? r.customerName}</Td>
              <Td>
                <a href={`tel:${r.accountPhone}`} className="font-mono text-accent-primary">{toPersianDigits(r.accountPhone)}</a>
              </Td>
              <Td className="max-w-56 truncate">{r.itemsSummary}</Td>
              <Td className="font-mono">{formatToman(r.totalAmount)}</Td>
              <Td><span className={`badge-status ${r.status === "PENDING" ? "badge-status-warning" : "badge-status-neutral"}`}>{r.status === "PENDING" ? "در انتظار پرداخت" : "لغو خودکار"}</span></Td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
