"use client";

import React, { useState } from "react";
import { apiCall, useMutation, MutationNotice, EmptyState, Table, Td, Field, Modal } from "@/components/portal/ui";
import { formatToman, toPersianDigits, toEnglishDigits } from "@/lib/currency";

export interface AdminCoupon {
  id: string;
  code: string;
  description: string;
  type: "PERCENT" | "FIXED";
  value: number;
  minAmount: number;
  maxDiscount: number | null;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string; // YYYY-MM-DD یا خالی
  expiresLabel: string;
  isExpired: boolean;
  isActive: boolean;
}

const num = (v: string) => Number(toEnglishDigits(v || "0")) || 0;

function CouponForm({ coupon, onDone }: { coupon: AdminCoupon | null; onDone: () => void }) {
  const [f, setF] = useState({
    code: coupon?.code ?? "",
    description: coupon?.description ?? "",
    type: coupon?.type ?? "PERCENT",
    value: String(coupon?.value ?? ""),
    minAmount: String(coupon?.minAmount ?? 0),
    maxDiscount: String(coupon?.maxDiscount ?? ""),
    maxUses: String(coupon?.maxUses ?? ""),
    expiresAt: coupon?.expiresAt ?? "",
    isActive: coupon?.isActive ?? true,
  });
  const { run, busy, notice } = useMutation();
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  return (
    <Modal title={coupon ? `کد ${coupon.code}` : "کد تخفیف جدید"} onClose={onDone}>
      <MutationNotice notice={notice} />
      <form
        className="space-y-3 text-xs"
        onSubmit={async (e) => {
          e.preventDefault();
          const res = await run(() =>
            apiCall("/api/admin/coupons", coupon ? "PATCH" : "POST", {
              ...f,
              id: coupon?.id,
              value: num(f.value),
              minAmount: num(f.minAmount),
              maxDiscount: num(f.maxDiscount),
              maxUses: num(f.maxUses),
            })
          );
          if (res.success) onDone();
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="کد"><input required dir="ltr" disabled={!!coupon} className="input w-full font-mono" value={f.code} onChange={set("code")} /></Field>
          <Field label="نوع">
            <select className="input w-full" value={f.type} onChange={set("type")}>
              <option value="PERCENT">درصدی</option>
              <option value="FIXED">مبلغ ثابت (تومان)</option>
            </select>
          </Field>
          <Field label={f.type === "PERCENT" ? "درصد" : "مبلغ (تومان)"}><input required dir="ltr" className="input w-full font-mono" value={f.value} onChange={set("value")} /></Field>
          <Field label="حداقل مبلغ سبد"><input dir="ltr" className="input w-full font-mono" value={f.minAmount} onChange={set("minAmount")} /></Field>
          {f.type === "PERCENT" && <Field label="سقف تخفیف (تومان)"><input dir="ltr" className="input w-full font-mono" value={f.maxDiscount} onChange={set("maxDiscount")} /></Field>}
          <Field label="حداکثر دفعات استفاده"><input dir="ltr" className="input w-full font-mono" value={f.maxUses} onChange={set("maxUses")} /></Field>
          <Field label="تاریخ انقضا"><input type="date" className="input w-full" value={f.expiresAt} onChange={set("expiresAt")} /></Field>
        </div>
        <Field label="توضیح (داخلی)"><input className="input w-full" value={f.description} onChange={set("description")} /></Field>
        <label className="flex items-center gap-2"><input type="checkbox" checked={f.isActive} onChange={(e) => setF({ ...f, isActive: e.target.checked })} /> فعال</label>
        <p className="text-text-muted">کد تخفیف با تخفیف سفیر جمع نمی‌شود؛ هر کدام بیشتر باشد اعمال می‌شود.</p>
        <div className="flex justify-end"><button className="btn btn-primary text-xs" disabled={busy}>ذخیره</button></div>
      </form>
    </Modal>
  );
}

export default function CouponsAdmin({ coupons }: { coupons: AdminCoupon[] }) {
  const [edit, setEdit] = useState<AdminCoupon | null | "new">(null);
  const { run, busy, notice } = useMutation();
  return (
    <div className="space-y-3">
      <MutationNotice notice={notice} />
      <div className="flex justify-end"><button className="btn btn-outline text-xs" onClick={() => setEdit("new")}>کد تخفیف جدید</button></div>
      {coupons.length === 0 ? (
        <EmptyState text="کد تخفیفی ساخته نشده است." />
      ) : (
        <Table head={["کد", "تخفیف", "شرط", "استفاده", "انقضا", "وضعیت", ""]}>
          {coupons.map((c) => (
            <tr key={c.id}>
              <Td className="font-mono font-bold">{c.code}<span className="block text-[11px] text-text-muted font-sans font-normal">{c.description}</span></Td>
              <Td>{c.type === "PERCENT" ? `${toPersianDigits(c.value)}٪${c.maxDiscount ? ` تا ${formatToman(c.maxDiscount)}` : ""}` : formatToman(c.value)}</Td>
              <Td>{c.minAmount ? `خرید بالای ${formatToman(c.minAmount)}` : "—"}</Td>
              <Td className="font-mono">{toPersianDigits(c.usedCount)}{c.maxUses ? ` / ${toPersianDigits(c.maxUses)}` : ""}</Td>
              <Td>{c.expiresLabel || "—"}</Td>
              <Td>
                <span className={`badge-status ${c.isActive && !c.isExpired ? "badge-status-success" : "badge-status-neutral"}`}>
                  {!c.isActive ? "غیرفعال" : c.isExpired ? "منقضی" : "فعال"}
                </span>
              </Td>
              <Td className="whitespace-nowrap">
                <button className="btn btn-ghost text-xs" onClick={() => setEdit(c)}>ویرایش</button>
                <button className="btn btn-ghost text-xs text-danger" disabled={busy} onClick={() => window.confirm(`کد ${c.code} حذف شود؟`) && run(() => apiCall("/api/admin/coupons", "DELETE", { id: c.id }))}>حذف</button>
              </Td>
            </tr>
          ))}
        </Table>
      )}
      {edit && <CouponForm coupon={edit === "new" ? null : edit} onDone={() => setEdit(null)} />}
    </div>
  );
}
