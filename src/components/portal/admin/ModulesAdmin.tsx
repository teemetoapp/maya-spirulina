"use client";

import React, { useMemo, useState } from "react";
import type { ModuleRow, ModuleRuleRow } from "@/lib/modules/admin";
import type { ModuleGroup } from "@/lib/modules/registry";
import { RULE_UNITS } from "@/lib/modules/registry";
import { apiCall, useMutation, PageTitle, MutationNotice, Modal, Field, StatCard, Notice } from "@/components/portal/ui";
import { toPersianDigits, toEnglishDigits } from "@/lib/currency";

// ==============================================================
// «ماژول‌ها و قوانین» — super admin switches every module on/off and
// edits its rules. Turning a module off hides its pages for everyone,
// strips its permissions and stops its automations.
// ==============================================================

function Switch({ on, onChange, disabled, label }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50 ${on ? "bg-accent-primary" : "bg-border-strong"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "right-0.5" : "right-[22px]"}`} />
    </button>
  );
}

function formatRule(rule: ModuleRuleRow, value: string): string {
  if (rule.type === "boolean") return value === "1" ? "بله" : "خیر";
  if (rule.type === "text") return value || "— (خالی)";
  const n = Number(value);
  const shown = rule.type === "toman" ? toPersianDigits(n.toLocaleString("en-US")) : toPersianDigits(value);
  const unit = RULE_UNITS[rule.type];
  return unit ? `${shown} ${unit}` : shown;
}

function RulesModal({ module, onClose }: { module: ModuleRow; onClose: () => void }) {
  const [values, setValues] = useState<Record<string, string>>(Object.fromEntries(module.rules.map((r) => [r.key, r.value])));
  const { run, busy, notice } = useMutation();
  const changed = module.rules.filter((r) => (r.type === "text" ? values[r.key] ?? "" : toEnglishDigits(values[r.key] ?? "")) !== r.value);
  const isDefault = module.rules.every((r) => r.value === r.defaultValue);

  return (
    <Modal title={`قوانین ${module.label}`} onClose={onClose}>
      <form
        className="space-y-4 text-xs"
        onSubmit={(e) => {
          e.preventDefault();
          run(() =>
            apiCall("/api/admin/modules", "PUT", {
              key: module.key,
              values: Object.fromEntries(changed.map((r) => [r.key, r.type === "text" ? values[r.key] : toEnglishDigits(values[r.key])])),
            })
          );
        }}
      >
        <MutationNotice notice={notice} />
        {module.rules.map((r) => (
          <Field key={r.key} label={r.label}>
            {r.type === "boolean" ? (
              <div className="flex items-center gap-3">
                <Switch on={values[r.key] === "1"} onChange={(v) => setValues({ ...values, [r.key]: v ? "1" : "0" })} label={r.label} />
                <span className="text-text-muted">{values[r.key] === "1" ? "بله" : "خیر"}</span>
              </div>
            ) : r.type === "text" ? (
              <input className="input w-full" value={values[r.key] ?? ""} onChange={(e) => setValues({ ...values, [r.key]: e.target.value })} />
            ) : (
              <div className="flex items-center gap-2">
                <input
                  inputMode="numeric"
                  dir="ltr"
                  className="input w-40 text-left font-mono"
                  value={values[r.key] ?? ""}
                  onChange={(e) => setValues({ ...values, [r.key]: e.target.value })}
                />
                <span className="text-text-muted">{RULE_UNITS[r.type]}</span>
              </div>
            )}
            <span className="block text-[11px] text-text-subtle mt-1">
              پیش‌فرض: {formatRule(r, r.defaultValue)}
              {r.min !== null && r.type !== "boolean" && r.type !== "text" && ` · حداقل ${toPersianDigits(r.min)}`}
              {r.max !== null && r.type !== "text" && ` · حداکثر ${toPersianDigits(r.max)}`}
            </span>
          </Field>
        ))}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border-hairline">
          <button
            type="button"
            className="btn btn-ghost text-xs"
            disabled={busy || isDefault}
            onClick={() => run(() => apiCall("/api/admin/modules", "PUT", { key: module.key, reset: true })).then((res) => res.success && onClose())}
          >
            بازگشت به پیش‌فرض
          </button>
          <button className="btn btn-primary text-xs" disabled={busy || changed.length === 0}>
            ذخیره {changed.length > 0 ? `(${toPersianDigits(changed.length)} تغییر)` : ""}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function OffConfirm({ module, onClose }: { module: ModuleRow; onClose: () => void }) {
  const [typed, setTyped] = useState("");
  const { run, busy, notice } = useMutation();
  const needsTyping = module.core;
  const ready = !needsTyping || typed.trim() === "خاموش";

  return (
    <Modal title={`خاموش کردن «${module.label}»`} onClose={onClose}>
      <div className="space-y-4 text-xs leading-6">
        <MutationNotice notice={notice} />
        <p>{module.offEffect}</p>
        {module.dependents.length > 0 && (
          <Notice kind="warning">
            این ماژول‌ها هم به آن وابسته‌اند و همراهش از کار می‌افتند: {module.dependents.map((d) => `«${d.label}»`).join("، ")}
          </Notice>
        )}
        {module.core && <Notice kind="danger">این ماژول جزو هسته فروشگاه است. برای ادامه، کلمه «خاموش» را بنویسید.</Notice>}
        {needsTyping && <input className="input w-full" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="خاموش" />}
        <p className="text-text-muted">هر زمان دوباره روشنش کنید، همه چیز با داده‌های قبلی برمی‌گردد.</p>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-ghost text-xs" onClick={onClose}>
            انصراف
          </button>
          <button
            type="button"
            className="btn btn-primary text-xs"
            disabled={busy || !ready}
            onClick={() =>
              run(() => apiCall("/api/admin/modules", "PATCH", { key: module.key, enabled: false, confirm: module.key })).then((res) => res.success && onClose())
            }
          >
            خاموش شود
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ModuleCard({ m, busy, onToggleOn, onAskOff, onRules }: { m: ModuleRow; busy: boolean; onToggleOn: () => void; onAskOff: () => void; onRules: () => void }) {
  const blockedBy = m.enabled && !m.effective ? m.dependsOn.map((d) => `«${d.label}»`).join("، ") : null;
  return (
    <div className={`studio-card p-4 flex flex-col gap-3 ${m.effective ? "" : "opacity-80"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-black">{m.label}</span>
            {m.core && <span className="badge-status badge-status-info">هسته</span>}
            <span className={`badge-status ${m.effective ? "badge-status-success" : "badge-status-neutral"}`}>{m.effective ? "روشن" : "خاموش"}</span>
          </div>
          <p className="text-xs text-text-muted leading-6">{m.description}</p>
        </div>
        <Switch on={m.enabled} disabled={busy} label={`${m.enabled ? "خاموش" : "روشن"} کردن ${m.label}`} onChange={(v) => (v ? onToggleOn() : onAskOff())} />
      </div>

      {blockedBy && <Notice kind="warning">روشن است ولی تا وقتی {blockedBy} خاموش است کار نمی‌کند.</Notice>}

      {m.rules.length > 0 && (
        <ul className="text-[11px] space-y-1 rounded-lg bg-bg-subtle p-3">
          {m.rules.map((r) => (
            <li key={r.key} className="flex justify-between gap-3">
              <span className="text-text-muted truncate">{r.label}</span>
              <span className={`shrink-0 font-bold ${r.value !== r.defaultValue ? "text-accent-primary" : ""}`}>{formatRule(r, r.value)}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 text-[11px] text-text-subtle">
        <span>
          {m.dependsOn.length > 0 && <>نیازمند {m.dependsOn.map((d) => `«${d.label}»`).join("، ")} · </>}
          {m.updatedAt ? `آخرین تغییر: ${m.updatedAt}${m.updatedBy ? ` توسط ${m.updatedBy}` : ""}` : "بدون تغییر از ابتدا"}
        </span>
        {m.rules.length > 0 && (
          <button type="button" className="btn btn-ghost text-xs" onClick={onRules}>
            ویرایش قوانین
          </button>
        )}
      </div>
    </div>
  );
}

export default function ModulesAdmin({ data }: { data: { groups: { id: ModuleGroup; label: string }[]; modules: ModuleRow[] } }) {
  const [group, setGroup] = useState<ModuleGroup | "ALL" | "OFF">("ALL");
  const [query, setQuery] = useState("");
  const [rulesKey, setRulesKey] = useState<string | null>(null);
  const [offKey, setOffKey] = useState<string | null>(null);
  const { run, busy, notice } = useMutation();

  const on = data.modules.filter((m) => m.effective).length;
  const customised = data.modules.reduce((n, m) => n + m.rules.filter((r) => r.value !== r.defaultValue).length, 0);
  const visible = useMemo(
    () =>
      data.modules.filter(
        (m) =>
          (group === "ALL" || (group === "OFF" ? !m.effective : m.group === group)) &&
          (!query.trim() || m.label.includes(query.trim()) || m.description.includes(query.trim()))
      ),
    [data.modules, group, query]
  );
  const rulesModule = data.modules.find((m) => m.key === rulesKey) ?? null;
  const offModule = data.modules.find((m) => m.key === offKey) ?? null;

  return (
    <div className="space-y-5">
      <PageTitle
        title="ماژول‌ها و قوانین"
        subtitle="هر بخش سایت یک ماژول است. با خاموش کردن، صفحه‌ها و دسترسی‌های آن برای همه پنهان و خودکارسازی‌هایش متوقف می‌شود؛ داده‌ها حذف نمی‌شوند."
      />
      <MutationNotice notice={notice} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="ماژول روشن" value={`${toPersianDigits(on)} از ${toPersianDigits(data.modules.length)}`} />
        <StatCard label="ماژول خاموش" value={toPersianDigits(data.modules.length - on)} />
        <StatCard label="قانون تغییریافته" value={toPersianDigits(customised)} hint="نسبت به مقدار پیش‌فرض" />
        <StatCard label="ماژول‌های هسته" value={toPersianDigits(data.modules.filter((m) => m.core).length)} hint="خاموش کردن نیاز به تأیید دارد" />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
        <div className="flex flex-wrap gap-1.5 text-xs">
          {[{ id: "ALL" as const, label: "همه" }, ...data.groups, { id: "OFF" as const, label: "خاموش‌ها" }].map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setGroup(g.id)}
              className={`rounded-full px-3 py-1.5 border transition ${group === g.id ? "border-accent-primary bg-accent-soft text-accent-primary font-bold" : "border-border-hairline text-text-muted"}`}
            >
              {g.label}
            </button>
          ))}
        </div>
        <input className="input text-xs sm:w-56 sm:mr-auto" placeholder="جست‌وجوی ماژول…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      {data.groups
        .filter((g) => visible.some((m) => m.group === g.id))
        .map((g) => (
          <section key={g.id} className="space-y-3">
            <h2 className="text-xs font-black text-text-muted">{g.label}</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {visible
                .filter((m) => m.group === g.id)
                .map((m) => (
                  <ModuleCard
                    key={m.key}
                    m={m}
                    busy={busy}
                    onToggleOn={() => run(() => apiCall("/api/admin/modules", "PATCH", { key: m.key, enabled: true }))}
                    onAskOff={() => setOffKey(m.key)}
                    onRules={() => setRulesKey(m.key)}
                  />
                ))}
            </div>
          </section>
        ))}
      {visible.length === 0 && <p className="text-xs text-text-subtle text-center py-8">ماژولی پیدا نشد.</p>}

      {rulesModule && <RulesModal key={rulesModule.key + rulesModule.rules.map((r) => r.value).join()} module={rulesModule} onClose={() => setRulesKey(null)} />}
      {offModule && <OffConfirm module={offModule} onClose={() => setOffKey(null)} />}
    </div>
  );
}
