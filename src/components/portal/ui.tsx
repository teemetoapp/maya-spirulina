"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

// ==============================================================
// Shared building blocks for every portal view, so the customer,
// ambassador and staff areas look the same (DESIGN.md tokens only).
// ==============================================================

export async function apiCall<T = { success: boolean; error?: string; message?: string }>(
  url: string,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET",
  body?: unknown
): Promise<T & { success: boolean; error?: string; message?: string }> {
  try {
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    return await res.json();
  } catch {
    return { success: false, error: "ارتباط با سرور برقرار نشد." } as T & { success: boolean; error?: string };
  }
}

/**
 * Runs a mutation, shows its result and refreshes the server data.
 *   const { run, busy, notice } = useMutation();
 *   run(() => apiCall("/api/...", "PATCH", {...}))
 */
export function useMutation() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "danger"; text: string } | null>(null);

  async function run(fn: () => Promise<{ success: boolean; error?: string; message?: string }>, okText?: string) {
    setBusy(true);
    setNotice(null);
    const res = await fn();
    setBusy(false);
    if (res.success) {
      setNotice({ kind: "success", text: res.message || okText || "تغییرات ذخیره شد." });
      router.refresh();
    } else {
      setNotice({ kind: "danger", text: res.error || "عملیات انجام نشد." });
    }
    return res;
  }

  return { run, busy, notice, setNotice };
}

export function PageTitle({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
      <div>
        <h1 className="text-lg font-black">{title}</h1>
        {subtitle && <p className="text-xs text-text-muted mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Notice({ kind, children }: { kind: "success" | "danger" | "warning" | "info"; children: React.ReactNode }) {
  return <div className={`badge-status badge-status-${kind} w-full py-2.5 px-3 text-xs whitespace-normal`}>{children}</div>;
}

export function MutationNotice({ notice }: { notice: { kind: "success" | "danger"; text: string } | null }) {
  return notice ? <Notice kind={notice.kind}>{notice.text}</Notice> : null;
}

/** Shown above modules that still run on sample data, so nobody mistakes it for real numbers. */
export function SampleDataBanner({ note }: { note?: string }) {
  return (
    <Notice kind="warning">
      این بخش هنوز به دیتابیس وصل نیست و داده‌های آن نمونه است. {note ?? "تغییرات اینجا ذخیره نمی‌شوند."}
    </Notice>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: React.ReactNode; hint?: React.ReactNode }) {
  return (
    <div className="studio-card p-4">
      <span className="text-[11px] text-text-muted block">{label}</span>
      <span className="text-lg font-black font-mono block mt-1">{value}</span>
      {hint && <span className="text-[11px] text-text-muted block mt-1">{hint}</span>}
    </div>
  );
}

export function EmptyState({ text }: { text: string }) {
  return <div className="studio-card p-8 text-center text-xs text-text-muted">{text}</div>;
}

export function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="studio-card overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border-hairline text-text-muted">
            {head.map((h) => (
              <th key={h} className="text-right font-bold p-3 whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-hairline">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, className = "", colSpan }: { children: React.ReactNode; className?: string; colSpan?: number }) {
  return (
    <td colSpan={colSpan} className={`p-3 align-middle ${className}`}>
      {children}
    </td>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] text-text-muted font-bold">{label}</span>
      {children}
    </label>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="studio-card w-full max-w-xl max-h-[90vh] overflow-y-auto p-5 space-y-4 bg-bg-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black">{title}</h2>
          <button className="btn btn-ghost text-xs" onClick={onClose}>
            بستن
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
