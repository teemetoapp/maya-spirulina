"use client";

import React, { useState } from "react";
import { PageTitle, Table, Td, EmptyState } from "@/components/portal/ui";

interface AuditRow {
  id: string;
  action: string;
  target: string | null;
  actor: string;
  details: string;
  createdAt: string;
}

const ACTION_LABELS: Record<string, string> = {
  "order.status": "تغییر وضعیت سفارش",
  "order.update": "ویرایش سفارش",
  "user.update": "ویرایش کاربر",
  "role.create": "ساخت نقش",
  "role.update": "تغییر دسترسی نقش",
  "role.delete": "حذف نقش",
  "settings.update": "تغییر تنظیمات",
  "product.create": "ساخت محصول",
  "product.update": "ویرایش محصول",
  "variant.create": "ساخت بسته",
  "variant.update": "ویرایش بسته/قیمت",
  "inventory.batch": "ورود بچ به انبار",
  "inventory.adjust": "اصلاح موجودی",
  "coupon.create": "ساخت کد تخفیف",
  "coupon.update": "ویرایش کد تخفیف",
  "coupon.delete": "حذف کد تخفیف",
  "ambassador.approve": "تأیید سفیر",
  "ambassador.reject": "رد درخواست سفیر",
  "settlement.approve": "تأیید تسویه",
  "settlement.pay": "ثبت واریز تسویه",
  "settlement.reject": "رد تسویه",
  "auth.login": "ورود به سامانه",
};

export default function AuditAdmin({ logs }: { logs: AuditRow[] }) {
  const [q, setQ] = useState("");
  const filtered = logs.filter((l) => !q || l.actor.includes(q) || (l.target ?? "").includes(q) || l.action.includes(q) || (ACTION_LABELS[l.action] ?? "").includes(q));
  return (
    <div className="space-y-5">
      <PageTitle title="لاگ امنیتی" subtitle="هر تغییر حساس (قیمت، نقش، وضعیت سفارش، تسویه، تنظیمات) با نام انجام‌دهنده ثبت می‌شود." />
      <input className="input w-full sm:w-80" placeholder="جستجو: کاربر، عملیات یا موضوع" value={q} onChange={(e) => setQ(e.target.value)} />
      {filtered.length === 0 ? (
        <EmptyState text="رویدادی ثبت نشده است." />
      ) : (
        <Table head={["زمان", "انجام‌دهنده", "عملیات", "موضوع", "جزئیات"]}>
          {filtered.map((l) => (
            <tr key={l.id}>
              <Td className="whitespace-nowrap">{l.createdAt}</Td>
              <Td>{l.actor}</Td>
              <Td>{ACTION_LABELS[l.action] ?? l.action}</Td>
              <Td className="font-mono">{l.target ?? "—"}</Td>
              <Td className="font-mono text-[10px] max-w-80 truncate" >
                <span title={l.details} dir="ltr">{l.details}</span>
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
