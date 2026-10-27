"use client";

import React, { useState } from "react";
import type { NotificationsAdminData, IntegrationStatus } from "@/lib/portal/admin-loaders";
import { apiCall, useMutation, PageTitle, MutationNotice, Table, Td, Field, Modal, StatCard, Notice, EmptyState } from "@/components/portal/ui";
import SectionTabs from "@/components/portal/SectionTabs";
import { toPersianDigits, toEnglishDigits } from "@/lib/currency";

// ==============================================================
// Business rules + notification centre. Every rule the storefront,
// checkout and ambassador programme use is edited here.
// ==============================================================

interface SettingRow {
  key: string;
  value: string;
  defaultValue: string;
  description: string;
}

const GROUPS: { title: string; keys: string[] }[] = [
  { title: "ارسال", keys: ["FREE_SHIPPING_THRESHOLD", "SHIPPING_FEE_POST", "SHIPPING_ZONES", "SHIPPING_FEE_EXPRESS", "PENDING_ORDER_EXPIRY_HOURS"] },
  { title: "سفیران", keys: ["COMMISSION_SILVER", "COMMISSION_GOLD", "COMMISSION_DIAMOND", "AMBASSADOR_CUSTOMER_DISCOUNT", "REFERRAL_COOKIE_DAYS", "MIN_SETTLEMENT_TOMAN", "SAMPLE_KIT_FOLLOWUP_DAYS"] },
  { title: "باشگاه مشتریان", keys: ["SIGNUP_REWARD_POINTS", "PURCHASE_POINTS_PER_100K", "POINTS_TO_TOMAN_RATIO", "MIN_POINTS_TO_REDEEM"] },
  { title: "انبار", keys: ["EXPIRY_ALERT_DAYS"] },
];

const CHANNEL_LABELS = { SMS: "پیامک", TELEGRAM: "تلگرام", EMAIL: "ایمیل" } as const;
const AUDIENCE_LABELS = { CUSTOMER: "مشتری", AMBASSADOR: "سفیر", ROLE: "اعضای نقش", TELEGRAM_GROUP: "گروه تلگرام" } as const;
const LOG_STATUS: Record<string, { label: string; badge: string }> = {
  QUEUED: { label: "در صف", badge: "badge-status-neutral" },
  SENDING: { label: "در حال ارسال", badge: "badge-status-info" },
  SENT: { label: "ارسال شد", badge: "badge-status-success" },
  FAILED: { label: "ناموفق", badge: "badge-status-danger" },
  SKIPPED: { label: "رد شد", badge: "badge-status-neutral" },
};

function BusinessRules({ settings }: { settings: SettingRow[] }) {
  const [values, setValues] = useState<Record<string, string>>(Object.fromEntries(settings.map((s) => [s.key, s.value])));
  const { run, busy, notice } = useMutation();
  const byKey = new Map(settings.map((s) => [s.key, s]));
  const changed = settings.filter((s) => toEnglishDigits(values[s.key]) !== s.value);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => apiCall("/api/admin/settings", "PATCH", { values: Object.fromEntries(changed.map((s) => [s.key, toEnglishDigits(values[s.key])])) }));
      }}
    >
      <MutationNotice notice={notice} />
      {GROUPS.map((g) => (
        <div key={g.title} className="studio-card p-5 space-y-3">
          <h2 className="text-sm font-black">{g.title}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {g.keys.map((k) => {
              const s = byKey.get(k);
              if (!s) return null;
              return (
                <Field key={k} label={s.description}>
                  <input dir="ltr" className="input w-full font-mono" value={values[k]} onChange={(e) => setValues({ ...values, [k]: e.target.value })} />
                  {s.value !== s.defaultValue && <span className="text-[10px] text-text-subtle">پیش‌فرض: {toPersianDigits(s.defaultValue)}</span>}
                </Field>
              );
            })}
          </div>
        </div>
      ))}
      <div className="flex justify-end">
        <button className="btn btn-primary text-xs" disabled={busy || changed.length === 0}>
          ذخیره {changed.length > 0 ? `(${toPersianDigits(changed.length)} تغییر)` : ""}
        </button>
      </div>
    </form>
  );
}

function Templates({ data }: { data: NotificationsAdminData }) {
  const [edit, setEdit] = useState<{ event: string; channel: keyof typeof CHANNEL_LABELS } | null>(null);
  const [form, setForm] = useState({ subject: "", body: "" });
  const { run, busy, notice } = useMutation();
  const find = (event: string, channel: string) => data.templates.find((t) => t.event === event && t.channel === channel);

  function open(event: string, channel: keyof typeof CHANNEL_LABELS) {
    const t = find(event, channel);
    setForm({ subject: t?.subject ?? "", body: t?.body ?? "" });
    setEdit({ event, channel });
  }
  const editEvent = data.events.find((e) => e.key === edit?.event);

  return (
    <div className="space-y-3">
      <MutationNotice notice={notice} />
      <Table head={["رویداد", "پیامک", "تلگرام", "ایمیل"]}>
        {data.events.map((e) => (
          <tr key={e.key}>
            <Td>{e.label}<span className="block text-[10px] text-text-subtle font-mono" dir="ltr">{e.key}</span></Td>
            {(["SMS", "TELEGRAM", "EMAIL"] as const).map((ch) => {
              const t = find(e.key, ch);
              return (
                <Td key={ch}>
                  <button className={`badge-status ${t ? (t.isActive ? "badge-status-success" : "badge-status-neutral") : "badge-status-neutral"}`} onClick={() => open(e.key, ch)}>
                    {t ? (t.isActive ? "فعال · ویرایش" : "غیرفعال") : "+ قالب"}
                  </button>
                </Td>
              );
            })}
          </tr>
        ))}
      </Table>
      {edit && editEvent && (
        <Modal title={`${editEvent.label} · ${CHANNEL_LABELS[edit.channel]}`} onClose={() => setEdit(null)}>
          <p className="text-xs text-text-muted">
            متغیرها: {editEvent.variables.map((v) => <code key={v} className="mx-1 font-mono" dir="ltr">{`{{${v}}}`}</code>)}
          </p>
          <form
            className="space-y-3 text-xs"
            onSubmit={async (e) => {
              e.preventDefault();
              const res = await run(() => apiCall("/api/admin/notifications", "POST", { kind: "template", event: edit.event, channel: edit.channel, ...form }));
              if (res.success) setEdit(null);
            }}
          >
            {edit.channel === "EMAIL" && <Field label="عنوان ایمیل"><input className="input w-full" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></Field>}
            <Field label="متن پیام"><textarea required rows={5} className="input w-full" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></Field>
            <div className="flex justify-between">
              {find(edit.event, edit.channel) ? (
                <button
                  type="button"
                  className="btn btn-ghost text-xs"
                  disabled={busy}
                  onClick={() => {
                    const t = find(edit.event, edit.channel)!;
                    run(() => apiCall("/api/admin/notifications", "PATCH", { kind: "template", id: t.id, isActive: !t.isActive })).then(() => setEdit(null));
                  }}
                >
                  {find(edit.event, edit.channel)!.isActive ? "غیرفعال‌کردن قالب" : "فعال‌کردن قالب"}
                </button>
              ) : <span />}
              <button className="btn btn-primary text-xs" disabled={busy}>ذخیره قالب</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Rules({ data }: { data: NotificationsAdminData }) {
  const [form, setForm] = useState({ event: (data.events[0]?.key ?? "") as string, channel: "SMS", audience: "CUSTOMER", roleKey: data.roles[0]?.key ?? "", target: "" });
  const { run, busy, notice } = useMutation();
  const eventLabel = (k: string) => data.events.find((e) => e.key === k)?.label ?? k;
  const roleName = (k: string | null) => data.roles.find((r) => r.key === k)?.name ?? k;

  return (
    <div className="space-y-4">
      <MutationNotice notice={notice} />
      <p className="text-xs text-text-muted">قانون تعیین می‌کند هر رویداد از چه کانالی به چه کسی برسد. هر کاربر می‌تواند در پروفایلش کانال‌ها را خاموش کند.</p>
      <form
        className="studio-card p-4 grid grid-cols-2 lg:grid-cols-6 gap-2 items-end text-xs"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => apiCall("/api/admin/notifications", "POST", { kind: "rule", ...form }));
        }}
      >
        <Field label="رویداد">
          <select className="input w-full" value={form.event} onChange={(e) => setForm({ ...form, event: e.target.value })}>
            {data.events.map((e) => <option key={e.key} value={e.key}>{e.label}</option>)}
          </select>
        </Field>
        <Field label="کانال">
          <select className="input w-full" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
            {Object.entries(CHANNEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="گیرنده">
          <select className="input w-full" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
            {Object.entries(AUDIENCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        {form.audience === "ROLE" && (
          <Field label="نقش">
            <select className="input w-full" value={form.roleKey} onChange={(e) => setForm({ ...form, roleKey: e.target.value })}>
              {data.roles.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
            </select>
          </Field>
        )}
        {form.audience === "TELEGRAM_GROUP" && (
          <Field label="شناسه گروه (خالی = پیش‌فرض)">
            <input dir="ltr" className="input w-full" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} />
          </Field>
        )}
        <button className="btn btn-primary text-xs" disabled={busy}>افزودن قانون</button>
      </form>
      <Table head={["رویداد", "کانال", "گیرنده", "وضعیت", ""]}>
        {data.rules.map((r) => (
          <tr key={r.id}>
            <Td>{eventLabel(r.event)}</Td>
            <Td>{CHANNEL_LABELS[r.channel]}</Td>
            <Td>{AUDIENCE_LABELS[r.audience]}{r.audience === "ROLE" ? `: ${roleName(r.roleKey)}` : ""}{r.target ? ` (${r.target})` : ""}</Td>
            <Td>
              <button className={`badge-status ${r.isActive ? "badge-status-success" : "badge-status-neutral"}`} disabled={busy} onClick={() => run(() => apiCall("/api/admin/notifications", "PATCH", { kind: "rule", id: r.id, isActive: !r.isActive }))}>
                {r.isActive ? "فعال" : "خاموش"}
              </button>
            </Td>
            <Td><button className="btn btn-ghost text-xs text-danger" disabled={busy} onClick={() => window.confirm("این قانون حذف شود؟") && run(() => apiCall("/api/admin/notifications", "DELETE", { id: r.id }))}>حذف</button></Td>
          </tr>
        ))}
      </Table>
    </div>
  );
}

function Logs({ data }: { data: NotificationsAdminData }) {
  const [test, setTest] = useState({ channel: "SMS", recipient: "" });
  const { run, busy, notice } = useMutation();
  return (
    <div className="space-y-4">
      <MutationNotice notice={notice} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {(["SMS", "TELEGRAM", "EMAIL"] as const).map((ch) => (
          <StatCard key={ch} label={`کانال ${CHANNEL_LABELS[ch]}`} value={data.channels[ch] ? "پیکربندی شده" : "تنظیم نشده"} hint={data.channels[ch] ? undefined : "کلیدهای آن در فایل .env خالی است"} />
        ))}
        <StatCard label="۷ روز اخیر" value={`${toPersianDigits(data.weekStats.SENT ?? 0)} ارسال`} hint={`${toPersianDigits(data.weekStats.FAILED ?? 0)} ناموفق`} />
      </div>
      <div className="studio-card p-4 flex flex-col sm:flex-row gap-2 items-end text-xs">
        <Field label="ارسال آزمایشی">
          <select className="input w-full" value={test.channel} onChange={(e) => setTest({ ...test, channel: e.target.value })}>
            {Object.entries(CHANNEL_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </Field>
        <Field label="گیرنده (موبایل، chat id یا ایمیل)">
          <input dir="ltr" className="input w-full sm:w-64" value={test.recipient} onChange={(e) => setTest({ ...test, recipient: e.target.value })} />
        </Field>
        <button className="btn btn-outline text-xs" disabled={busy} onClick={() => run(() => apiCall("/api/admin/notifications", "POST", { kind: "test", ...test }))}>ارسال آزمایشی</button>
        <button className="btn btn-ghost text-xs" disabled={busy} onClick={() => run(() => apiCall("/api/admin/notifications", "POST", { kind: "retry" }))}>ارسال مجدد ناموفق‌ها</button>
      </div>
      {data.logs.length === 0 ? (
        <EmptyState text="هنوز پیامی ارسال نشده است." />
      ) : (
        <Table head={["زمان", "رویداد", "کانال", "گیرنده", "متن", "وضعیت"]}>
          {data.logs.map((l) => (
            <tr key={l.id}>
              <Td className="whitespace-nowrap">{l.createdAt}</Td>
              <Td className="font-mono text-[10px]" >{l.event}</Td>
              <Td>{CHANNEL_LABELS[l.channel]}</Td>
              <Td className="font-mono" >{l.recipient}</Td>
              <Td className="max-w-64 truncate" >{l.body}</Td>
              <Td>
                <span className={`badge-status ${LOG_STATUS[l.status].badge}`}>{LOG_STATUS[l.status].label}</span>
                {l.error && <span className="block text-[10px] text-danger mt-1 max-w-48 truncate" title={l.error}>{l.error}</span>}
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}

function StatusRow({ label, ok, value, hint }: { label: string; ok: boolean; value: string; hint?: string }) {
  return (
    <tr>
      <Td className="font-bold">{label}</Td>
      <Td>
        <span className={`badge-status ${ok ? "badge-status-success" : "badge-status-warning"}`}>{value}</span>
      </Td>
      <Td className="text-text-muted">{hint ?? ""}</Td>
    </tr>
  );
}

const PAYMENT_MODE_LABELS = { production: "زرین‌پال (واقعی)", sandbox: "زرین‌پال (آزمایشی)", mock: "درگاه نمایشی داخلی" } as const;

function Integrations({ status }: { status: IntegrationStatus }) {
  const p = status.payment;
  return (
    <div className="space-y-4">
      <Notice kind="info">
        کلیدها و رمزها برای امنیت فقط در فایل .env سرور نگهداری می‌شوند و این‌جا نمایش داده نمی‌شوند. پس از تغییر .env سرور را دوباره راه‌اندازی کنید.
      </Notice>
      <Table head={["سرویس", "وضعیت", "توضیح"]}>
        <StatusRow
          label="درگاه پرداخت"
          ok={p.mode !== "mock" && p.merchantSet}
          value={PAYMENT_MODE_LABELS[p.mode]}
          hint={p.mode === "mock" ? (p.mockAllowed ? "فقط برای توسعه و تست؛ پرداخت واقعی انجام نمی‌شود." : "در محیط اصلی غیرفعال است؛ PAYMENT_GATEWAY_MODE را تنظیم کنید.") : p.merchantSet ? "کد پذیرنده تنظیم شده است." : "ZARINPAL_MERCHANT_ID تنظیم نشده است."}
        />
        <tr>
          <Td className="font-bold">آدرس بازگشت درگاه</Td>
          <Td colSpan={2}>
            <span dir="ltr" className="font-mono text-[11px]">{p.callbackUrl}</span>
          </Td>
        </tr>
        <StatusRow label="پیامک" ok={status.sms.provider !== "mock"} value={status.sms.provider === "mock" ? "نمایشی (کنسول)" : status.sms.provider} />
        <StatusRow
          label="ربات تلگرام"
          ok={status.telegram.botSet}
          value={status.telegram.botSet ? (status.telegram.botUsername ? `@${status.telegram.botUsername}` : "متصل") : "تنظیم نشده"}
          hint={status.telegram.adminChatSet ? "گروه مدیران متصل است." : "TELEGRAM_ADMIN_CHAT_ID برای اعلان‌های مدیران تنظیم نشده است."}
        />
        <StatusRow label="ایمیل (SMTP)" ok={status.email.smtpSet} value={status.email.smtpSet ? "متصل" : "تنظیم نشده"} hint={status.email.from ?? undefined} />
        <StatusRow label="کارهای زمان‌بندی‌شده" ok={status.cronSecretSet} value={status.cronSecretSet ? "کلید تنظیم شده" : "CRON_SECRET تنظیم نشده"} hint="راهنما: docs/NOTIFICATIONS.md" />
      </Table>
    </div>
  );
}

export default function SettingsAdmin({
  settings,
  notifications,
  integrations,
  perms,
}: {
  settings: SettingRow[] | null;
  notifications: NotificationsAdminData | null;
  integrations: IntegrationStatus | null;
  perms: { canManageSettings: boolean; canManageNotifications: boolean };
}) {
  const tabs = [];
  if (perms.canManageSettings && settings) tabs.push({ id: "store", label: "فروشگاه", content: <BusinessRules settings={settings} /> });
  if (perms.canManageNotifications && notifications) {
    tabs.push({ id: "templates", label: "قالب پیام‌ها", content: <Templates data={notifications} /> });
    tabs.push({ id: "routing", label: "قوانین ارسال", content: <Rules data={notifications} /> });
    tabs.push({ id: "logs", label: "گزارش ارسال", content: <Logs data={notifications} /> });
  }
  if (perms.canManageSettings && integrations) tabs.push({ id: "gateway", label: "درگاه و سرویس‌ها", content: <Integrations status={integrations} /> });
  return (
    <div className="space-y-5">
      <PageTitle title="تنظیمات" subtitle="فروشگاه، اعلان‌ها و درگاه. تغییرات فوراً در فروشگاه، صفحه پرداخت و پرتال سفیران اعمال می‌شود." />
      {notifications && !notifications.channels.SMS && <Notice kind="warning">سرویس پیامک تنظیم نشده است؛ در محیط واقعی پیامک‌ها ارسال نمی‌شوند (SMS_PROVIDER در .env).</Notice>}
      <SectionTabs tabs={tabs} />
    </div>
  );
}
