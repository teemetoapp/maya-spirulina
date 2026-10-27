"use client";

import React, { useState } from "react";
import type { AdminApplication, AdminAmbassador, AdminSettlement } from "@/lib/portal/ambassadors-admin";
import { apiCall, useMutation, PageTitle, MutationNotice, EmptyState, Table, Td, Modal, Field, StatCard } from "@/components/portal/ui";
import SectionTabs from "@/components/portal/SectionTabs";
import { formatToman, toPersianDigits } from "@/lib/currency";

const TIER_LABELS = { SILVER: "نقره‌ای", GOLD: "طلایی", DIAMOND: "الماس" } as const;
const APP_STATUS = {
  PENDING: { label: "در انتظار بررسی", badge: "badge-status-warning" },
  APPROVED: { label: "تأیید شد", badge: "badge-status-success" },
  REJECTED: { label: "رد شد", badge: "badge-status-danger" },
};
const SETTLEMENT_STATUS = {
  PENDING: { label: "در انتظار بررسی", badge: "badge-status-warning" },
  APPROVED: { label: "تأیید، در صف واریز", badge: "badge-status-info" },
  REJECTED: { label: "رد شد", badge: "badge-status-danger" },
  PAID: { label: "واریز شد", badge: "badge-status-success" },
};

function ApplicationsTab({ applications }: { applications: AdminApplication[] }) {
  const [open, setOpen] = useState<AdminApplication | null>(null);
  const [tier, setTier] = useState("SILVER");
  const [note, setNote] = useState("");
  const { run, busy, notice } = useMutation();

  async function decide(action: "approve" | "reject") {
    if (!open) return;
    const res = await run(() => apiCall("/api/admin/ambassador-applications", "PATCH", { id: open.id, action, tier, note }));
    if (res.success) setOpen(null);
  }

  return (
    <div className="space-y-3">
      <MutationNotice notice={notice} />
      {applications.length === 0 ? (
        <EmptyState text="درخواستی ثبت نشده است." />
      ) : (
        <Table head={["متقاضی", "حوزه", "شهر", "تاریخ", "وضعیت"]}>
          {applications.map((a) => (
            <tr key={a.id} className="cursor-pointer hover:bg-bg-subtle" onClick={() => { setOpen(a); setNote(""); setTier("SILVER"); }}>
              <Td>{a.fullName}<span className="block text-[11px] text-text-muted font-mono">{toPersianDigits(a.phone)}</span></Td>
              <Td>{a.profession}</Td>
              <Td>{a.city}</Td>
              <Td>{a.createdAt}</Td>
              <Td><span className={`badge-status ${APP_STATUS[a.status].badge}`}>{APP_STATUS[a.status].label}</span></Td>
            </tr>
          ))}
        </Table>
      )}
      {open && (
        <Modal title={`درخواست ${open.fullName}`} onClose={() => setOpen(null)}>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div><span className="text-text-muted block">حوزه</span>{open.profession}</div>
            <div><span className="text-text-muted block">شهر</span>{open.city}</div>
            <div><span className="text-text-muted block">شماره نظام/مجوز</span>{open.licenseNumber ?? "—"}</div>
            <div><span className="text-text-muted block">شبا</span><span dir="ltr" className="font-mono">{open.shebaNumber ?? "—"}</span></div>
            <div className="col-span-2"><span className="text-text-muted block">صفحه اجتماعی</span>{open.socialLink ?? "—"}</div>
            <div className="col-span-2"><span className="text-text-muted block">مخاطبان</span>{open.audience ?? "—"}</div>
            <div className="col-span-2"><span className="text-text-muted block">انگیزه</span>{open.motivation ?? "—"}</div>
            {open.reviewNote && <div className="col-span-2"><span className="text-text-muted block">یادداشت بررسی</span>{open.reviewNote}</div>}
          </div>
          {open.status === "PENDING" && (
            <div className="space-y-3 pt-3 border-t border-border-hairline text-xs">
              <div className="grid grid-cols-2 gap-3">
                <Field label="سطح شروع">
                  <select className="input w-full" value={tier} onChange={(e) => setTier(e.target.value)}>
                    {Object.entries(TIER_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </Field>
                <Field label="یادداشت (برای رد الزامی است)">
                  <input className="input w-full" value={note} onChange={(e) => setNote(e.target.value)} />
                </Field>
              </div>
              <div className="flex gap-2 justify-end">
                <button className="btn btn-ghost text-xs text-danger" disabled={busy} onClick={() => decide("reject")}>رد درخواست</button>
                <button className="btn btn-primary text-xs" disabled={busy} onClick={() => decide("approve")}>تأیید و فعال‌سازی سفیر</button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

function AmbassadorsTab({ ambassadors }: { ambassadors: AdminAmbassador[] }) {
  return ambassadors.length === 0 ? (
    <EmptyState text="هنوز سفیری فعال نیست." />
  ) : (
    <Table head={["سفیر", "سطح", "لینک", "سفارش", "فروش خالص", "پورسانت", "کیف پول", "کیت سمپل"]}>
      {ambassadors.map((a) => (
        <tr key={a.id}>
          <Td>{a.name}<span className="block text-[11px] text-text-muted font-mono">{toPersianDigits(a.phone)}</span></Td>
          <Td>{TIER_LABELS[a.tier]}</Td>
          <Td className="font-mono" >{a.slug ?? a.referralCode}</Td>
          <Td className="font-mono">{toPersianDigits(a.orders)}</Td>
          <Td className="font-mono">{formatToman(a.sales)}</Td>
          <Td className="font-mono">{formatToman(a.commission)}</Td>
          <Td className="font-mono">{formatToman(a.walletBalance)}</Td>
          <Td className="font-mono">{toPersianDigits(a.converted)}/{toPersianDigits(a.kits)}</Td>
        </tr>
      ))}
    </Table>
  );
}

function SettlementsTab({ settlements, canApprove }: { settlements: AdminSettlement[]; canApprove: boolean }) {
  const { run, busy, notice } = useMutation();
  function act(s: AdminSettlement, action: "approve" | "pay" | "reject") {
    let receipt = "";
    let note = "";
    if (action === "pay") {
      receipt = window.prompt(`شماره پیگیری واریز ${formatToman(s.amount)} به ${s.accountHolder}:`) ?? "";
      if (!receipt) return;
    }
    if (action === "reject") {
      note = window.prompt("دلیل رد (به سفیر نمایش داده می‌شود):") ?? "";
      if (!note) return;
    }
    run(() => apiCall("/api/admin/settlements", "PATCH", { id: s.id, action, receipt, note }));
  }
  const open = settlements.filter((s) => s.status === "PENDING" || s.status === "APPROVED");

  return (
    <div className="space-y-3">
      <MutationNotice notice={notice} />
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="درخواست‌های باز" value={toPersianDigits(open.length)} />
        <StatCard label="مبلغ در انتظار واریز" value={formatToman(open.reduce((n, s) => n + s.amount, 0))} />
      </div>
      {settlements.length === 0 ? (
        <EmptyState text="درخواست تسویه‌ای ثبت نشده است." />
      ) : (
        <Table head={["سفیر", "مبلغ", "حساب", "تاریخ", "وضعیت", ""]}>
          {settlements.map((s) => (
            <tr key={s.id}>
              <Td>{s.name}<span className="block text-[11px] text-text-muted font-mono">{toPersianDigits(s.phone)}</span></Td>
              <Td className="font-mono">{formatToman(s.amount)}</Td>
              <Td>{s.accountHolder} · {s.bankName}<span dir="ltr" className="block text-[11px] text-text-muted font-mono">{s.shebaNumber}</span></Td>
              <Td>{s.createdAt}</Td>
              <Td>
                <span className={`badge-status ${SETTLEMENT_STATUS[s.status].badge}`}>{SETTLEMENT_STATUS[s.status].label}</span>
                {(s.receipt || s.note) && <span className="block text-[11px] text-text-muted mt-1">{s.receipt ?? s.note}</span>}
              </Td>
              <Td className="whitespace-nowrap">
                {canApprove && s.status === "PENDING" && <button className="btn btn-ghost text-xs" disabled={busy} onClick={() => act(s, "approve")}>تأیید</button>}
                {canApprove && (s.status === "PENDING" || s.status === "APPROVED") && (
                  <>
                    <button className="btn btn-primary text-xs" disabled={busy} onClick={() => act(s, "pay")}>ثبت واریز</button>
                    <button className="btn btn-ghost text-xs text-danger" disabled={busy} onClick={() => act(s, "reject")}>رد</button>
                  </>
                )}
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}

export default function AmbassadorsAdmin({
  applications,
  ambassadors,
  settlements,
  perms,
}: {
  applications: AdminApplication[];
  ambassadors: AdminAmbassador[];
  settlements: AdminSettlement[];
  perms: { canManage: boolean; canApproveSettlements: boolean };
}) {
  const pending = applications.filter((a) => a.status === "PENDING").length;
  const tabs = [];
  if (perms.canManage) {
    tabs.push({ id: "ambassadors", label: "سفیران فعال", content: <AmbassadorsTab ambassadors={ambassadors} /> });
    tabs.push({ id: "applications", label: `درخواست‌ها${pending ? ` (${toPersianDigits(pending)})` : ""}`, content: <ApplicationsTab applications={applications} /> });
  }
  tabs.push({ id: "settlements", label: "تسویه پورسانت", content: <SettlementsTab settlements={settlements} canApprove={perms.canApproveSettlements} /> });

  return (
    <div className="space-y-5">
      <PageTitle title="سفیران و تسویه" subtitle="سطح سفیر از «کاربران و نقش‌ها» قابل تغییر است؛ درصد پورسانت هر سطح در تنظیمات تعیین می‌شود." />
      <SectionTabs tabs={tabs} />
    </div>
  );
}
