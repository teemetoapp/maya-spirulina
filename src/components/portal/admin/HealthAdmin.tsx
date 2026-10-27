"use client";

import { useState } from "react";
import type { CheckResult } from "@/lib/monitoring";
import { PageTitle, Table, Td, MutationNotice, useMutation, apiCall, Notice } from "@/components/portal/ui";
import { formatJalaliDateTime } from "@/lib/jalali";

export default function HealthAdmin({ last, telegramReady }: { last: { at: string; results: CheckResult[] } | null; telegramReady: boolean }) {
  const [data, setData] = useState(last);
  const { run, busy, notice } = useMutation();

  const check = async () => {
    const res = (await run(() => apiCall("/api/admin/health", "POST", {}))) as { success: boolean; results?: CheckResult[] };
    if (res.results) setData({ at: new Date().toISOString(), results: res.results });
  };

  return (
    <div className="space-y-5 text-xs">
      <PageTitle
        title="سلامت سرویس‌ها"
        subtitle="با هر اجرای کار زمان‌بندی‌شده (هر ۱۰ دقیقه) بررسی می‌شود؛ خرابی و رفع آن در گروه تلگرام مدیران اعلام می‌شود."
        action={
          <div className="flex gap-2">
            <button type="button" className="btn btn-primary text-xs" disabled={busy} onClick={check}>بررسی الان</button>
            <button type="button" className="btn btn-outline text-xs" disabled={busy} onClick={() => run(() => apiCall("/api/admin/health", "POST", { action: "test" }))}>پیام آزمایشی تلگرام</button>
          </div>
        }
      />
      <MutationNotice notice={notice} />
      {!telegramReady && <Notice kind="warning">ربات تلگرام یا شناسه گروه مدیران (TELEGRAM_ADMIN_CHAT_ID) در .env تنظیم نشده؛ هشدارها فقط در لاگ سرور ثبت می‌شوند.</Notice>}
      {data ? (
        <>
          <p className="text-text-muted">آخرین بررسی: {formatJalaliDateTime(data.at)}</p>
          <Table head={["سرویس", "وضعیت", "جزئیات"]}>
            {data.results.map((r) => (
              <tr key={r.key}>
                <Td>{r.label}</Td>
                <Td>
                  <span className={`badge-status ${r.ok ? "badge-status-success" : "badge-status-danger"}`}>{r.ok ? "سالم" : "مشکل"}</span>
                </Td>
                <Td>{r.detail}</Td>
              </tr>
            ))}
          </Table>
        </>
      ) : (
        <p className="text-text-muted">از زمان روشن شدن سرور هنوز بررسی‌ای انجام نشده؛ «بررسی الان» را بزنید.</p>
      )}
      <Notice kind="info">اگر کل سرور خاموش شود، خودش نمی‌تواند هشدار بدهد. برای این حالت آدرس /api/health را در یک سرویس پایش بیرونی (مثل UptimeRobot) ثبت کنید.</Notice>
    </div>
  );
}
