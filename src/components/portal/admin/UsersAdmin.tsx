"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { PORTAL_AREAS, PORTAL_SECTIONS, getAllowedSections, type PortalSection } from "@/lib/portal/sections";
import { moduleToken, moduleForSection } from "@/lib/modules/registry";
import type { AdminUser, AdminRole } from "@/lib/portal/users-admin";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { apiCall, useMutation, PageTitle, MutationNotice, Field, Modal, StatCard, Notice } from "@/components/portal/ui";
import SectionTabs from "@/components/portal/SectionTabs";
import { toPersianDigits } from "@/lib/currency";

// ==============================================================
// Users & roles — one list for every person (customers, ambassadors,
// staff). Roles are bundles of permissions; the super admin edits them
// here and the sidebar of each user follows automatically.
// ==============================================================


function RoleEditor({ role, onDone }: { role: AdminRole | null; onDone: () => void }) {
  const [f, setF] = useState({ key: role?.key ?? "", name: role?.name ?? "", description: role?.description ?? "" });
  const [perms, setPerms] = useState<string[]>(role?.permissions ?? ["portal.customer"]);
  const { run, busy, notice } = useMutation();
  const locked = role?.key === "super_admin";
  const groups = useMemo(() => [...new Set(PERMISSIONS.map((p) => p.group))], []);

  return (
    <Modal title={role ? `نقش «${role.name}»` : "نقش جدید"} onClose={onDone}>
      <MutationNotice notice={notice} />
      {locked && <Notice kind="info">مدیر ارشد همیشه همه دسترسی‌ها را دارد و قابل محدودکردن نیست.</Notice>}
      <form
        className="space-y-4 text-xs"
        onSubmit={async (e) => {
          e.preventDefault();
          const res = await run(() => apiCall("/api/admin/roles", role ? "PATCH" : "POST", { ...f, id: role?.id, permissions: perms }));
          if (res.success) onDone();
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="نام نقش"><input required className="input w-full" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="شناسه لاتین"><input required dir="ltr" disabled={!!role} className="input w-full font-mono" value={f.key} onChange={(e) => setF({ ...f, key: e.target.value })} /></Field>
        </div>
        <Field label="توضیح"><input className="input w-full" value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        {groups.map((g) => (
          <fieldset key={g} className="space-y-1.5">
            <legend className="font-bold mb-1">{g}</legend>
            {PERMISSIONS.filter((p) => p.group === g).map((p) => (
              <label key={p.key} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  disabled={locked}
                  checked={perms.includes(p.key)}
                  onChange={(e) => setPerms(e.target.checked ? [...perms, p.key] : perms.filter((k) => k !== p.key))}
                />
                {p.label}
                <span className="text-text-subtle font-mono text-[10px]" dir="ltr">{p.key}</span>
              </label>
            ))}
          </fieldset>
        ))}
        {!locked && <div className="flex justify-end"><button className="btn btn-primary text-xs" disabled={busy}>ذخیره نقش</button></div>}
      </form>
    </Modal>
  );
}

function RolesTab({ roles }: { roles: AdminRole[] }) {
  const [edit, setEdit] = useState<AdminRole | null | "new">(null);
  const { run, busy, notice } = useMutation();
  return (
    <div className="space-y-4">
      <MutationNotice notice={notice} />
      <div className="flex justify-between items-center">
        <p className="text-xs text-text-muted">هر کاربر می‌تواند چند نقش داشته باشد؛ دسترسی او مجموع مجوزهای نقش‌هایش است.</p>
        <button className="btn btn-outline text-xs" onClick={() => setEdit("new")}>نقش جدید</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {roles.map((r) => (
          <div key={r.id} className="studio-card p-4 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-black text-sm">{r.name}</span>
              <span className="text-text-muted">{toPersianDigits(r.userCount)} کاربر</span>
            </div>
            <p className="text-text-muted">{r.description}</p>
            <p className="text-text-muted">{toPersianDigits(r.permissions.length)} مجوز {r.isSystem && "· نقش سیستمی"}</p>
            <div className="flex gap-2">
              <button className="btn btn-ghost text-xs" onClick={() => setEdit(r)}>ویرایش دسترسی‌ها</button>
              {!r.isSystem && r.userCount === 0 && (
                <button className="btn btn-ghost text-xs text-danger" disabled={busy} onClick={() => window.confirm(`نقش «${r.name}» حذف شود؟`) && run(() => apiCall("/api/admin/roles", "DELETE", { id: r.id }))}>
                  حذف
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      {edit && <RoleEditor role={edit === "new" ? null : edit} onDone={() => setEdit(null)} />}
    </div>
  );
}

// منوی هر نقش: نشان می‌دهد هر نقش در کدام پرتال‌ها چه بخش‌هایی می‌بیند
const PERM_LABEL = Object.fromEntries(PERMISSIONS.map((p) => [p.key, p.label])) as Record<string, string>;

// منوی هر نقش؛ با دسترسی roles.manage قابل ویرایش است. روشن‌کردن یک بخش اولین
// مجوز لازم آن را به نقش می‌دهد و خاموش‌کردن، همه مجوزهای بازکننده آن را برمی‌دارد.
function MenuPreview({ roles, moduleTokens, canEdit }: { roles: AdminRole[]; moduleTokens: string[]; canEdit: boolean }) {
  const [key, setKey] = useState(roles.find((r) => r.key !== "super_admin")?.key ?? roles[0]?.key ?? "");
  const role = roles.find((r) => r.key === key);
  const [draft, setDraft] = useState<string[]>(role?.permissions ?? []);
  const { run, busy, notice } = useMutation();
  const locked = !canEdit || role?.key === "super_admin";
  const switchRole = (k: string) => {
    setKey(k);
    setDraft(roles.find((r) => r.key === k)?.permissions ?? []);
  };
  const tokens = [...draft, ...moduleTokens];
  const allowed = new Set(getAllowedSections(tokens).map((s) => s.id));
  const before = new Set(role ? getAllowedSections([...role.permissions, ...moduleTokens]).map((s) => s.id) : []);
  const dirty = role ? [...draft].sort().join() !== [...role.permissions].sort().join() : false;
  const moduleOn = (id: string) => {
    const mod = moduleForSection(id);
    return !mod || moduleTokens.includes(moduleToken(mod.key));
  };

  const toggle = (sec: PortalSection, on: boolean) => {
    if (on) {
      if (!sec.anyOf.some((p) => draft.includes(p))) setDraft([...draft, sec.anyOf[0]]);
      return;
    }
    const removed = sec.anyOf.filter((p) => draft.includes(p));
    const next = draft.filter((p) => !(removed as string[]).includes(p));
    // بخش‌های دیگری که با این کار از منو حذف می‌شوند
    const nextAllowed = new Set(getAllowedSections([...next, ...moduleTokens]).map((s) => s.id));
    const lost = PORTAL_SECTIONS.filter((s) => s.id !== sec.id && allowed.has(s.id) && !nextAllowed.has(s.id));
    if (lost.length && !window.confirm(`با برداشتن «${sec.label}» این بخش‌ها هم از منوی این نقش حذف می‌شوند:\n${lost.map((l) => `• ${l.label}`).join("\n")}\nادامه می‌دهید؟`)) return;
    setDraft(next);
  };

  const added = [...allowed].filter((id) => !before.has(id)).length;
  const removedCount = [...before].filter((id) => !allowed.has(id)).length;

  return (
    <div className="space-y-4 text-xs">
      <p className="text-text-muted leading-6">
        منوی هر پنل از دسترسی‌های نقش ساخته می‌شود.
        {canEdit
          ? " تیک هر بخش را بزنید یا بردارید و «ذخیره منو» را بزنید؛ دسترسی لازم همان بخش به نقش داده یا از آن گرفته می‌شود. برای یک شخص خاص هم از «مخاطبان» دسترسی فردی بدهید."
          : " فقط مدیر نقش‌ها می‌تواند منو را تغییر دهد."}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <select className="input w-full sm:w-64" value={key} onChange={(e) => switchRole(e.target.value)} aria-label="نقش">
          {roles.map((r) => (
            <option key={r.key} value={r.key}>
              {r.name} ({toPersianDigits(r.userCount)} نفر)
            </option>
          ))}
        </select>
        {role?.key === "super_admin" && <span className="text-text-muted">مدیر ارشد همه بخش‌ها را می‌بیند.</span>}
        {!locked && dirty && (
          <>
            <span className="text-warning">
              {toPersianDigits(added)} بخش اضافه · {toPersianDigits(removedCount)} بخش حذف
            </span>
            <button
              className="btn btn-primary text-xs"
              disabled={busy}
              onClick={() => run(() => apiCall("/api/admin/roles", "PATCH", { id: role!.id, name: role!.name, description: role!.description, permissions: draft }))}
            >
              ذخیره منو
            </button>
            <button className="btn btn-ghost text-xs" onClick={() => setDraft(role!.permissions)}>
              بازگردانی
            </button>
          </>
        )}
      </div>
      <MutationNotice notice={notice} />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {PORTAL_AREAS.map((a) => {
          const items = PORTAL_SECTIONS.filter((s) => s.area === a.id && (!locked || allowed.has(s.id)));
          return (
            <div key={a.id} className="studio-card p-4 space-y-2">
              <span className="font-black text-sm">{a.label}</span>
              {items.length === 0 ? (
                <p className="text-text-subtle">دسترسی ندارد</p>
              ) : (
                <ul className="space-y-1.5">
                  {items.map((s) => {
                    const on = allowed.has(s.id);
                    const off = !moduleOn(s.id);
                    const hidden = !!s.hideIf && draft.includes(s.hideIf);
                    const changed = on !== before.has(s.id);
                    return (
                      <li key={s.id} className="flex items-start justify-between gap-2">
                        <label className={`flex items-start gap-2 ${locked || off || hidden ? "" : "cursor-pointer"}`}>
                          {!locked && (
                            <input
                              type="checkbox"
                              className="mt-0.5"
                              checked={on}
                              disabled={off || hidden || busy}
                              onChange={(e) => toggle(s, e.target.checked)}
                            />
                          )}
                          <span className={on ? "" : "text-text-muted"}>
                            {s.label}
                            {!locked && (
                              <span className="block text-[10px] text-text-subtle">
                                {off ? "ماژول خاموش است" : hidden ? "برای این نقش پنهان است" : `با دسترسی «${PERM_LABEL[s.anyOf[0]] ?? s.anyOf[0]}»`}
                              </span>
                            )}
                          </span>
                        </label>
                        <span className="text-text-subtle shrink-0 flex items-center gap-1">
                          {changed && <span className="badge-status badge-status-warning">{on ? "جدید" : "حذف"}</span>}
                          {s.group}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function UsersAdmin({
  users,
  roles,
  perms,
  moduleTokens,
}: {
  users: AdminUser[];
  roles: AdminRole[];
  perms: { canManageRoles: boolean };
  moduleTokens: string[];
}) {
  const staffKeys = roles.filter((r) => r.key !== "customer" && r.key !== "ambassador").map((r) => r.key);
  const tabs = [{ id: "menus", label: "منوی هر نقش", content: <MenuPreview roles={roles} moduleTokens={moduleTokens} canEdit={perms.canManageRoles} /> }];
  if (perms.canManageRoles) tabs.unshift({ id: "roles", label: "نقش‌ها", content: <RolesTab roles={roles} /> });

  return (
    <div className="space-y-5">
      <PageTitle
        title="نقش‌ها و دسترسی‌ها"
        subtitle="هر نقش مجموعه‌ای از دسترسی‌هاست و منوی پنل‌ها از آن ساخته می‌شود. افراد را از «مخاطبان» به نقش‌ها اضافه کنید."
        action={
          <Link href="/portal/contacts" className="btn btn-outline text-xs">
            رفتن به مخاطبان
          </Link>
        }
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="نقش‌ها" value={toPersianDigits(roles.length)} />
        <StatCard label="کل کاربران" value={toPersianDigits(users.length)} />
        <StatCard label="سفیران" value={toPersianDigits(users.filter((u) => u.roleKeys.includes("ambassador")).length)} />
        <StatCard label="کارکنان" value={toPersianDigits(users.filter((u) => u.roleKeys.some((k) => staffKeys.includes(k))).length)} />
      </div>
      <SectionTabs tabs={tabs} />
    </div>
  );
}
