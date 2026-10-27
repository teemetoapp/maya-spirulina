"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ContactRow, ContactDetail, ContactKind, TimelineEntry } from "@/lib/crm/contacts";
import {
  SEGMENT_LABELS,
  SEGMENT_BADGE,
  STAGE_LABELS,
  CHANNEL_LABELS,
  SENTIMENT_LABELS,
  TOPIC_LABELS,
  type SegmentKey,
} from "@/lib/crm/insight";
import type { AdminRole } from "@/lib/portal/users-admin";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { PROFILE_FIELDS, PROFILE_GROUPS, GENDER_LABELS } from "@/lib/crm/profile-fields";
import { TIER_LABELS } from "@/lib/portal/labels";
import { ORDER_STATUS_BADGE } from "@/lib/commerce/dto";
import { apiCall, useMutation, PageTitle, MutationNotice, EmptyState, Table, Td, Field, StatCard, Notice } from "@/components/portal/ui";
import { TICKET_STATUS } from "@/components/portal/TicketsBoard";
import { formatToman, toPersianDigits, toEnglishDigits } from "@/lib/currency";

// ==============================================================
// «مخاطبان» — an advanced phone book / CRM of every person. The profile
// part is filled by the person themself; staff add tags and notes, see
// orders and tickets in one place, and the super admin sets roles and
// individual permissions (e.g. "may create groups in messages").
// ==============================================================

export interface ContactsPerms {
  canManage: boolean; // users.manage
  canManageRoles: boolean; // roles.manage
  isSuper: boolean;
  canModerateChat: boolean;
  canManageAmbassadors: boolean;
  canFollowUp: boolean; // crm.followup
  meId: string;
  staff: { id: string; name: string }[];
}

const KIND: Record<ContactKind, { label: string; badge: string }> = {
  staff: { label: "کارکنان", badge: "badge-status-info" },
  ambassador: { label: "سفیر", badge: "badge-status-success" },
  customer: { label: "مشتری", badge: "badge-status-neutral" },
  lead: { label: "بدون خرید", badge: "badge-status-warning" },
};

function Info({ label, value, ltr }: { label: string; value: React.ReactNode; ltr?: boolean }) {
  return (
    <div className="min-w-0">
      <span className="text-[11px] text-text-muted block">{label}</span>
      <span className={`font-medium break-words ${ltr ? "font-mono" : ""}`} dir={ltr ? "ltr" : undefined}>
        {value || "—"}
      </span>
    </div>
  );
}

// پیشنهاد اقدام بر اساس بخش مشتری
const SEGMENT_HINT: Record<SegmentKey, string> = {
  lead: "هنوز خرید نکرده؛ تماس معرفی و کد تخفیف اولین خرید پیشنهاد می‌شود.",
  new: "اولین خرید را داشته؛ چند روز بعد از تحویل تماس بگیرید و تجربه مصرف را بپرسید.",
  active: "خرید دوم را انجام داده؛ پیشنهاد بسته بزرگ‌تر یا عضویت در باشگاه.",
  loyal: "مشتری وفادار؛ پیشنهاد سفیر شدن یا هدیه وفاداری.",
  promoter: "راضی و مروج؛ بهترین گزینه برای دعوت به برنامه سفیران و ثبت نظر.",
  at_risk: "مدتی خرید نکرده؛ تماس پیگیری و یادآوری با کد تمدید.",
  dissatisfied: "ناراضی است؛ پیش از هر پیشنهاد فروش، مشکلش را پیگیری و حل کنید.",
};

const TONE: Record<TimelineEntry["tone"], string> = {
  neutral: "bg-text-subtle",
  info: "bg-accent-primary",
  positive: "bg-success",
  negative: "bg-danger",
};
const KIND_LABEL: Record<TimelineEntry["kind"], string> = {
  order: "سفارش",
  ticket: "تیکت",
  consult: "مشاوره",
  livechat: "چت آنلاین",
  interaction: "ارتباط",
};

// ---------------------------------------------------------------- 360° history
function HistoryTab({ c, perms }: { c: ContactDetail; perms: ContactsPerms }) {
  const [kind, setKind] = useState<"ALL" | TimelineEntry["kind"]>("ALL");
  const [open, setOpen] = useState<string | null>(null);
  const items = c.timeline.filter((t) => kind === "ALL" || t.kind === kind);
  return (
    <div className="grid grid-cols-1 2xl:grid-cols-[1fr_300px] gap-4 items-start text-xs">
      {(perms.canFollowUp || perms.canManage) && (
        <div className="2xl:order-2">
          <LogInteraction c={c} />
        </div>
      )}
      <div className="space-y-3 2xl:order-1">
        <div className="flex flex-wrap gap-1.5">
          {(["ALL", "interaction", "order", "ticket", "consult", "livechat"] as const).map((k) => (
            <button key={k} type="button" onClick={() => setKind(k)} className={`nav-tab-base ${kind === k ? "nav-tab-active" : "nav-tab-inactive"}`}>
              {k === "ALL" ? "همه" : KIND_LABEL[k]} ({toPersianDigits(k === "ALL" ? c.timeline.length : c.timeline.filter((t) => t.kind === k).length)})
            </button>
          ))}
        </div>
        {items.length === 0 ? (
          <EmptyState text="سابقه‌ای ثبت نشده است." />
        ) : (
          <ol className="relative border-r-2 border-border-hairline pr-4 space-y-3">
            {items.map((t) => (
              <li key={t.id} className="relative">
                <span className={`absolute -right-[23px] top-1.5 size-3 rounded-full ring-4 ring-[var(--bg-card)] ${TONE[t.tone]}`} />
                <div className="studio-card p-3 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold">
                      <span className="badge-status badge-status-neutral me-1.5">{KIND_LABEL[t.kind]}</span>
                      {t.title}
                    </span>
                    <span className="text-[10.5px] text-text-subtle">{t.date}</span>
                  </div>
                  {t.meta && <p className={t.tone === "negative" ? "text-danger" : "text-text-muted"}>{t.meta}</p>}
                  <div className="flex gap-3">
                    {t.thread && t.thread.length > 0 && (
                      <button type="button" className="text-accent-primary font-bold" onClick={() => setOpen(open === t.id ? null : t.id)}>
                        {open === t.id ? "بستن گفت‌وگو" : `نمایش گفت‌وگو (${toPersianDigits(t.thread.length)} پیام)`}
                      </button>
                    )}
                    {t.href && (
                      <Link href={t.href} className="text-text-muted hover:text-accent-primary">
                        باز کردن
                      </Link>
                    )}
                  </div>
                  {open === t.id && t.thread && (
                    <div className="mt-2 space-y-1.5 rounded-lg bg-bg-subtle p-2 max-h-80 overflow-y-auto">
                      {t.thread.map((m, n) => (
                        <div key={n} className={`rounded-lg px-2.5 py-1.5 ${m.staff ? "bg-accent-soft" : "bg-bg-card"}`}>
                          <div className="text-[10px] text-text-muted">
                            {m.author} · {m.at}
                          </div>
                          <div className="whitespace-pre-wrap break-words">{m.body}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

const FOLLOW_OPTIONS = [
  { d: 0, l: "بدون یادآوری" },
  { d: 1, l: "فردا" },
  { d: 3, l: "۳ روز بعد" },
  { d: 7, l: "یک هفته بعد" },
  { d: 14, l: "دو هفته بعد" },
  { d: 30, l: "یک ماه بعد" },
];

function LogInteraction({ c }: { c: ContactDetail }) {
  const blank = { channel: "CALL", sentiment: "NEUTRAL", topic: "", summary: "", followUpDays: 0, leadStage: "" };
  const [f, setF] = useState(blank);
  const { run, busy, notice } = useMutation();
  const due = c.interactions.filter((x) => x.followUpAt && !x.followUpDone);
  return (
    <div className="space-y-3">
      <form
        className="studio-card p-4 space-y-2.5"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await run(() => apiCall("/api/admin/crm/interactions", "POST", { contactId: c.id, ...f }));
          if (r.success) setF(blank);
        }}
      >
        <h3 className="font-bold text-sm">ثبت تماس یا ارتباط</h3>
        <div className="grid grid-cols-2 gap-2">
          <select className="input text-xs" value={f.channel} onChange={(e) => setF({ ...f, channel: e.target.value })} aria-label="کانال">
            {Object.entries(CHANNEL_LABELS).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
          <select className="input text-xs" value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })} aria-label="موضوع">
            <option value="">موضوع…</option>
            {Object.entries(TOPIC_LABELS).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-1" role="radiogroup" aria-label="رضایت">
          {Object.entries(SENTIMENT_LABELS).map(([k, l]) => (
            <button
              key={k}
              type="button"
              onClick={() => setF({ ...f, sentiment: k })}
              className={`flex-1 rounded-md border py-1.5 ${
                f.sentiment === k
                  ? k === "NEGATIVE"
                    ? "border-danger text-danger font-bold"
                    : k === "POSITIVE"
                      ? "border-success text-success font-bold"
                      : "border-accent-primary text-accent-primary font-bold"
                  : "border-border-hairline text-text-muted"
              }`}
            >
              {l}
            </button>
          ))}
        </div>
        <textarea
          className="input text-xs w-full min-h-20"
          placeholder="خلاصه گفت‌وگو: چه گفت، چه خواست، چه قولی دادیم…"
          value={f.summary}
          onChange={(e) => setF({ ...f, summary: e.target.value })}
          aria-label="خلاصه"
          required
        />
        <div className="grid grid-cols-2 gap-2">
          <select className="input text-xs" value={f.followUpDays} onChange={(e) => setF({ ...f, followUpDays: Number(e.target.value) })} aria-label="یادآوری پیگیری">
            {FOLLOW_OPTIONS.map((o) => (
              <option key={o.d} value={o.d}>
                پیگیری: {o.l}
              </option>
            ))}
          </select>
          <select className="input text-xs" value={f.leadStage} onChange={(e) => setF({ ...f, leadStage: e.target.value })} aria-label="مرحله">
            <option value="">مرحله بدون تغییر</option>
            {Object.entries(STAGE_LABELS).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </div>
        <MutationNotice notice={notice} />
        <button className="btn btn-primary text-xs w-full" disabled={busy || !f.summary.trim()}>
          ثبت در پرونده
        </button>
      </form>
      {due.length > 0 && (
        <div className="studio-card p-4 space-y-2">
          <h3 className="font-bold">پیگیری‌های باز</h3>
          {due.map((x) => (
            <div key={x.id} className="flex items-center justify-between gap-2">
              <span className={x.followUpOverdue ? "text-danger" : "text-text-muted"}>
                {x.followUpAt} · {x.summary.slice(0, 40)}
              </span>
              <button type="button" className="btn btn-ghost text-xs" disabled={busy} onClick={() => run(() => apiCall("/api/admin/crm/interactions", "PATCH", { id: x.id }))}>
                انجام شد
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- detail tabs
function Summary({ c }: { c: ContactDetail }) {
  const i = c.insight;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div className={`studio-card p-4 space-y-2 ${i.complaints.length ? "border-danger/40" : ""}`}>
          <div className="flex items-center justify-between">
            <span className="font-bold">نارضایتی‌های ۹۰ روز اخیر</span>
            <span className={`badge-status ${i.complaints.length ? "badge-status-danger" : "badge-status-success"}`}>
              {i.complaints.length ? `${toPersianDigits(i.negatives)} مورد` : "موردی نیست"}
            </span>
          </div>
          {i.complaints.map((x) => (
            <div key={x.topic} className="flex justify-between">
              <span>{x.label}</span>
              <span className="text-text-muted">
                {toPersianDigits(x.count)} بار · آخرین {x.last}
              </span>
            </div>
          ))}
          {!i.complaints.length && <p className="text-text-muted">از ارسال، تسویه، محصول یا پشتیبانی شکایتی ثبت نشده است.</p>}
        </div>
        <div className="studio-card p-4 space-y-2">
          <span className="font-bold">رضایت و وفاداری</span>
          <div className="flex justify-between">
            <span>میانگین امتیاز (تیکت، مشاوره، چت)</span>
            <span className="font-bold">{i.avgRating ? `${toPersianDigits(i.avgRating)} از ۵ (${toPersianDigits(i.ratings)} امتیاز)` : "—"}</span>
          </div>
          <div className="flex justify-between">
            <span>بازخورد مثبت ثبت‌شده</span>
            <span className="font-bold">{toPersianDigits(i.praises)}</span>
          </div>
          <div className="flex justify-between">
            <span>روز از آخرین خرید</span>
            <span className="font-bold">{i.daysSinceOrder === null ? "—" : toPersianDigits(i.daysSinceOrder)}</span>
          </div>
          <p className="text-text-muted">{SEGMENT_HINT[i.segment]}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="خرید موفق" value={toPersianDigits(c.stats.orders)} hint={c.stats.lastOrderAt ? `آخرین: ${c.stats.lastOrderAt}` : undefined} />
        <StatCard label="مجموع خرید" value={formatToman(c.stats.totalSpent)} hint={`میانگین ${formatToman(c.stats.avgOrder)}`} />
        <StatCard label="کیف پول و امتیاز" value={formatToman(c.walletBalance)} hint={`${toPersianDigits(c.points)} امتیاز`} />
        <StatCard
          label="تیکت باز"
          value={toPersianDigits(c.stats.openTickets)}
          hint={c.stats.avgRating ? `رضایت ${toPersianDigits(c.stats.avgRating)} از ۵` : `${toPersianDigits(c.tickets.length)} تیکت`}
        />
      </div>
      {c.ambassador && (
        <div className="studio-card p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <Info label="سطح سفیر" value={TIER_LABELS[c.ambassador.tier]} />
          <Info label="فروش تحویل‌شده" value={formatToman(c.ambassador.deliveredSales)} />
          <Info label="کل پورسانت" value={formatToman(c.ambassador.commissionEarned)} />
          <Info label="زیرمجموعه / سفارش معرفی‌شده" value={`${toPersianDigits(c.ambassador.referrals)} / ${toPersianDigits(c.ambassador.referredOrders)}`} />
          <Info label="کیت سمپل" value={toPersianDigits(c.ambassador.sampleKits)} />
          <Info label="صفحه داستان" value={c.ambassador.slug} ltr />
          <Info label="شبا" value={c.ambassador.sheba} ltr />
        </div>
      )}
      <div className="studio-card p-4 grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
        <Info label="موبایل" value={toPersianDigits(c.phone)} ltr />
        <Info label="ایمیل" value={c.email} ltr />
        <Info label="شهر" value={[c.extra.province, c.extra.city].filter(Boolean).join("، ")} />
        <Info label="شغل" value={c.extra.occupation} />
        <Info label="معرف" value={c.referredBy ? <Link className="text-accent-primary" href={`/portal/contacts?id=${c.referredBy.id}`}>{c.referredBy.name}</Link> : null} />
        <Info label="کد معرفی" value={c.referralCode} ltr />
        <Info label="عضویت" value={c.joinedAt} />
        <Info label="تلگرام" value={c.telegramLinked ? "متصل" : "متصل نیست"} />
        <Info
          label="اعلان‌ها"
          value={[c.notify.sms && "پیامک", c.notify.telegram && "تلگرام", c.notify.email && "ایمیل"].filter(Boolean).join("، ")}
        />
      </div>
      {c.addresses.length > 0 && (
        <div className="studio-card p-4 space-y-2 text-xs">
          <span className="font-bold">آدرس‌ها</span>
          {c.addresses.map((a) => (
            <p key={a.id} className="text-text-muted">
              <span className="font-semibold text-text-main">{a.title}{a.isDefault ? " (پیش‌فرض)" : ""}: </span>
              {a.text} · کدپستی <span className="font-mono">{toPersianDigits(a.postalCode)}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileTab({ c, canManage }: { c: ContactDetail; canManage: boolean }) {
  const [f, setF] = useState({ email: c.email, birthDate: c.birthDate, gender: c.gender ?? "", ...c.extra });
  const { run, busy, notice } = useMutation();
  return (
    <form
      className="space-y-4 text-xs"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => apiCall(`/api/admin/users/${c.id}`, "PATCH", { profile: { ...f, birthDate: toEnglishDigits(f.birthDate) } }));
      }}
    >
      <MutationNotice notice={notice} />
      <Notice kind="info">
        این اطلاعات را خود کاربر در «پروفایل» پر می‌کند و هر تغییری این‌جا هم دیده می‌شود.
        {c.profileUpdatedAt ? ` آخرین به‌روزرسانی توسط کاربر: ${c.profileUpdatedAt}.` : " کاربر هنوز پروفایلش را تکمیل نکرده است."} تکمیل:{" "}
        {toPersianDigits(c.completeness)}٪
      </Notice>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="نام">
          <input className="input w-full" value={c.name} disabled />
        </Field>
        <Field label="کد ملی">
          <input className="input w-full font-mono" dir="ltr" value={c.nationalCode} disabled />
        </Field>
        <Field label="ایمیل">
          <input className="input w-full" dir="ltr" disabled={!canManage} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        </Field>
        <Field label="تاریخ تولد">
          <input className="input w-full font-mono" dir="ltr" disabled={!canManage} value={f.birthDate} onChange={(e) => setF({ ...f, birthDate: e.target.value })} />
        </Field>
        <Field label="جنسیت">
          <select className="input w-full" disabled={!canManage} value={f.gender} onChange={(e) => setF({ ...f, gender: e.target.value })}>
            <option value="">—</option>
            {Object.entries(GENDER_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {(Object.keys(PROFILE_GROUPS) as (keyof typeof PROFILE_GROUPS)[]).map((g) => (
        <fieldset key={g} className="space-y-2">
          <legend className="font-bold text-sm mb-1">{PROFILE_GROUPS[g]}</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PROFILE_FIELDS.filter((p) => p.group === g).map((p) => (
              <div key={p.key} className={p.wide ? "sm:col-span-2" : ""}>
                <Field label={p.label}>
                  {p.options ? (
                    <select
                      className="input w-full"
                      disabled={!canManage}
                      value={(f as Record<string, string>)[p.key] ?? ""}
                      onChange={(e) => setF({ ...f, [p.key]: e.target.value })}
                    >
                      <option value="">—</option>
                      {[...new Set([...(p.options ?? []), (f as Record<string, string>)[p.key]].filter(Boolean))].map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="input w-full"
                      dir={p.ltr ? "ltr" : undefined}
                      disabled={!canManage}
                      placeholder={p.placeholder}
                      value={(f as Record<string, string>)[p.key] ?? ""}
                      onChange={(e) => setF({ ...f, [p.key]: e.target.value })}
                    />
                  )}
                </Field>
              </div>
            ))}
          </div>
        </fieldset>
      ))}
      {canManage && (
        <div className="flex justify-end">
          <button className="btn btn-primary text-xs" disabled={busy}>
            ذخیره اصلاحات
          </button>
        </div>
      )}
    </form>
  );
}

function OrdersTab({ c }: { c: ContactDetail }) {
  if (c.orders.length === 0) return <EmptyState text="این مخاطب سفارشی ندارد." />;
  return (
    <Table head={["سفارش", "تاریخ", "اقلام", "مبلغ", "وضعیت"]}>
      {c.orders.map((o) => (
        <tr key={o.id}>
          <Td className="font-mono">
            <Link className="text-accent-primary" href={`/portal/orders?q=${o.orderNumber}`}>
              {o.orderNumber}
            </Link>
          </Td>
          <Td>{o.date}</Td>
          <Td className="text-text-muted">{o.items}</Td>
          <Td className="font-mono">{formatToman(o.amount)}</Td>
          <Td>
            <span className={`badge-status ${ORDER_STATUS_BADGE[o.status] ?? "badge-status-neutral"}`}>{o.statusLabel}</span>
          </Td>
        </tr>
      ))}
    </Table>
  );
}

function TicketsTab({ c }: { c: ContactDetail }) {
  if (c.tickets.length === 0) return <EmptyState text="این مخاطب تیکتی ثبت نکرده است." />;
  return (
    <Table head={["موضوع", "تاریخ", "پیام‌ها", "وضعیت", "رضایت"]}>
      {c.tickets.map((t) => (
        <tr key={t.id}>
          <Td>
            <Link className="text-accent-primary" href="/portal/tickets">
              {t.subject}
            </Link>
          </Td>
          <Td>{t.date}</Td>
          <Td className="font-mono">{toPersianDigits(t.messages)}</Td>
          <Td>
            <span className={`badge-status ${TICKET_STATUS[t.status].badge}`}>{TICKET_STATUS[t.status].label}</span>
          </Td>
          <Td>{t.rating ? `${toPersianDigits(t.rating)} از ۵` : "—"}</Td>
        </tr>
      ))}
    </Table>
  );
}

function AccessTab({ c, roles, perms }: { c: ContactDetail; roles: AdminRole[]; perms: ContactsPerms }) {
  const [roleKeys, setRoleKeys] = useState(c.roleKeys);
  const [extra, setExtra] = useState(c.extraPermissions);
  const [revoked, setRevoked] = useState(c.revokedPermissions);
  const { run, busy, notice } = useMutation();
  const url = `/api/admin/users/${c.id}`;
  const groups = useMemo(() => [...new Set(PERMISSIONS.map((p) => p.group))], []);
  const fromRole = (k: string) => c.rolePermissions.includes(k as never);
  const effective = (k: string) => (fromRole(k) || extra.includes(k)) && !revoked.includes(k);

  // تیک زدن یعنی «این شخص این دسترسی را داشته باشد»؛ تفاوت با نقش‌ها جداگانه ذخیره می‌شود
  const toggle = (k: string, on: boolean) => {
    if (on) {
      setRevoked(revoked.filter((x) => x !== k));
      if (!fromRole(k) && !extra.includes(k)) setExtra([...extra, k]);
    } else {
      setExtra(extra.filter((x) => x !== k));
      if (fromRole(k) && !revoked.includes(k)) setRevoked([...revoked, k]);
    }
  };

  return (
    <div className="space-y-5 text-xs">
      <MutationNotice notice={notice} />
      {perms.canManageRoles && (
        <div className="studio-card p-4 space-y-3">
          <h3 className="font-bold text-sm">نقش‌ها</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {roles.map((r) => (
              <label key={r.key} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={roleKeys.includes(r.key)}
                  onChange={(e) => setRoleKeys(e.target.checked ? [...roleKeys, r.key] : roleKeys.filter((k) => k !== r.key))}
                />
                {r.name}
              </label>
            ))}
          </div>
          <button className="btn btn-outline text-xs" disabled={busy} onClick={() => run(() => apiCall(url, "PATCH", { roleKeys }))}>
            ذخیره نقش‌ها
          </button>
        </div>
      )}

      <div className="studio-card p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-bold text-sm">دسترسی‌های این شخص</h3>
          <span className="text-text-muted">{toPersianDigits(c.effectivePermissions.length)} دسترسی فعال</span>
        </div>
        {c.isSuper ? (
          <Notice kind="info">مدیر ارشد همه دسترسی‌ها را دارد.</Notice>
        ) : (
          <>
            <p className="text-text-muted leading-6">
              دسترسی‌هایی که از نقش‌ها می‌آیند با برچسب «از نقش» مشخص‌اند. می‌توانید برای همین شخص دسترسی اضافه کنید (مثلاً ساخت گروه در پیام‌ها) یا
              دسترسی نقش را از او بگیرید.
            </p>
            {groups.map((g) => (
              <fieldset key={g} className="space-y-1.5">
                <legend className="font-bold mb-1">{g}</legend>
                {PERMISSIONS.filter((p) => p.group === g).map((p) => {
                  const on = effective(p.key);
                  const changed = extra.includes(p.key) || revoked.includes(p.key);
                  return (
                    <label key={p.key} className="flex items-center gap-2">
                      <input type="checkbox" disabled={!perms.isSuper} checked={on} onChange={(e) => toggle(p.key, e.target.checked)} />
                      <span className={on ? "" : "text-text-muted"}>{p.label}</span>
                      {fromRole(p.key) && <span className="badge-status badge-status-neutral">از نقش</span>}
                      {changed && <span className="badge-status badge-status-warning">{extra.includes(p.key) ? "اضافه شده" : "گرفته شده"}</span>}
                    </label>
                  );
                })}
              </fieldset>
            ))}
            {perms.isSuper ? (
              <button
                className="btn btn-primary text-xs"
                disabled={busy}
                onClick={() => run(() => apiCall(url, "PATCH", { extraPermissions: extra, revokedPermissions: revoked }))}
              >
                ذخیره دسترسی‌ها
              </button>
            ) : (
              <p className="text-text-subtle">فقط مدیر ارشد می‌تواند دسترسی فردی تعیین کند.</p>
            )}
          </>
        )}
      </div>

      {(perms.canModerateChat || perms.canManage) && (
        <div className="studio-card p-4 flex flex-wrap gap-2 items-center">
          {perms.canModerateChat && !c.isSuper && (
            <button
              className={`btn text-xs ${c.chatBlocked ? "btn-primary" : "btn-outline"}`}
              disabled={busy}
              onClick={() => run(() => apiCall(url, "PATCH", { chatBlocked: !c.chatBlocked }))}
            >
              {c.chatBlocked ? "رفع بلاک در پیام‌ها" : "بلاک در پیام‌ها"}
            </button>
          )}
          {c.chatBlocked && <span className="text-danger">از {c.chatBlockedAt} در پیام‌ها بلاک است.</span>}
          {perms.canManage && (
            <button
              className={`btn text-xs ${c.isActive ? "btn-ghost text-danger" : "btn-primary"}`}
              disabled={busy}
              onClick={() => window.confirm(c.isActive ? "حساب این شخص غیرفعال شود؟ دیگر نمی‌تواند وارد شود." : "حساب فعال شود؟") && run(() => apiCall(url, "PATCH", { isActive: !c.isActive }))}
            >
              {c.isActive ? "غیرفعال‌کردن حساب" : "فعال‌کردن حساب"}
            </button>
          )}
          {perms.canManageAmbassadors && c.ambassador && (
            <select
              className="input w-auto text-xs"
              value={c.ambassador.tier}
              disabled={busy}
              onChange={(e) => run(() => apiCall(url, "PATCH", { ambassadorTier: e.target.value }))}
            >
              {Object.entries(TIER_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  سفیر {v}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  );
}

function NotesTab({ c, canManage }: { c: ContactDetail; canManage: boolean }) {
  const [notes, setNotes] = useState(c.crmNotes);
  const [tags, setTags] = useState(c.tags.join("، "));
  const [wallet, setWallet] = useState({ delta: "", reason: "" });
  const { run, busy, notice } = useMutation();
  const url = `/api/admin/users/${c.id}`;
  return (
    <div className="space-y-4 text-xs">
      <MutationNotice notice={notice} />
      {canManage && (
        <form
          className="studio-card p-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => apiCall(url, "PATCH", { crmNotes: notes, tags: tags.split(/[،,]/).map((t) => t.trim()).filter(Boolean) }));
          }}
        >
          <Field label="برچسب‌ها (با ویرگول جدا کنید)">
            <input className="input w-full" placeholder="مثلاً پزشک، خرید عمده، VIP" value={tags} onChange={(e) => setTags(e.target.value)} />
          </Field>
          <Field label="یادداشت داخلی (کاربر این را نمی‌بیند)">
            <textarea rows={5} className="input w-full" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <div className="flex justify-end">
            <button className="btn btn-primary text-xs" disabled={busy}>
              ذخیره
            </button>
          </div>
        </form>
      )}
      {canManage && (
        <form
          className="studio-card p-4 grid grid-cols-1 sm:grid-cols-3 gap-2 items-end"
          onSubmit={async (e) => {
            e.preventDefault();
            const res = await run(() => apiCall(url, "PATCH", { walletDelta: Number(toEnglishDigits(wallet.delta)), walletReason: wallet.reason }));
            if (res.success) setWallet({ delta: "", reason: "" });
          }}
        >
          <Field label="اصلاح کیف پول (+/−)">
            <input dir="ltr" className="input w-full font-mono" value={wallet.delta} onChange={(e) => setWallet({ ...wallet, delta: e.target.value })} />
          </Field>
          <Field label="دلیل">
            <input className="input w-full" value={wallet.reason} onChange={(e) => setWallet({ ...wallet, reason: e.target.value })} />
          </Field>
          <button className="btn btn-outline text-xs" disabled={busy}>
            ثبت
          </button>
        </form>
      )}
      <div className="studio-card p-4 space-y-2">
        <span className="font-bold">فعالیت‌های اخیر</span>
        {c.activity.length === 0 ? (
          <p className="text-text-muted">فعالیتی ثبت نشده است.</p>
        ) : (
          c.activity.map((a) => (
            <div key={a.id} className="flex flex-wrap justify-between gap-2 border-b border-border-hairline last:border-0 py-1.5">
              <span className="font-mono" dir="ltr">
                {a.action}
              </span>
              <span className="text-text-muted">
                {a.actor} · {a.date}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ContactCard({ c, roles, perms }: { c: ContactDetail; roles: AdminRole[]; perms: ContactsPerms }) {
  const [tab, setTab] = useState<"history" | "summary" | "profile" | "orders" | "tickets" | "access" | "notes">("history");
  const { run, busy } = useMutation();
  const canEditCrm = perms.canFollowUp || perms.canManage;
  const tabs = [
    { id: "history", label: `تاریخچه و ارتباط (${toPersianDigits(c.timeline.length)})` },
    { id: "summary", label: "خلاصه" },
    { id: "profile", label: "پروفایل" },
    { id: "orders", label: `سفارش‌ها (${toPersianDigits(c.orders.length)})` },
    { id: "tickets", label: `تیکت‌ها (${toPersianDigits(c.tickets.length)})` },
    { id: "access", label: "دسترسی‌ها" },
    { id: "notes", label: "یادداشت و فعالیت" },
  ] as const;
  return (
    <div className="studio-card p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-full bg-accent-soft text-accent-primary font-black text-lg">{c.name ? c.name[0] : "؟"}</div>
          <div>
            <h2 className="text-base font-black">{c.name || "بدون نام"}</h2>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <span className={`badge-status ${KIND[c.kind].badge}`}>{KIND[c.kind].label}</span>
              {roles
                .filter((r) => c.roleKeys.includes(r.key))
                .map((r) => (
                  <span key={r.key} className="badge-status badge-status-neutral">
                    {r.name}
                  </span>
                ))}
              {c.tags.map((t) => (
                <span key={t} className="badge-status badge-status-info">
                  #{t}
                </span>
              ))}
              <span className={`badge-status ${SEGMENT_BADGE[c.insight.segment]}`}>{SEGMENT_LABELS[c.insight.segment]}</span>
              {!c.isActive && <span className="badge-status badge-status-danger">غیرفعال</span>}
              {c.chatBlocked && <span className="badge-status badge-status-danger">بلاک در پیام‌ها</span>}
            </div>
          </div>
        </div>
        <div className="flex gap-2 text-xs">
          <a href={`tel:${c.phone}`} className="btn btn-outline text-xs">
            تماس
          </a>
          <a href={`sms:${c.phone}`} className="btn btn-outline text-xs">
            پیامک
          </a>
          {(c.extra.whatsapp || c.phone) && (
            <a href={`https://wa.me/98${(c.extra.whatsapp || c.phone).replace(/^0/, "")}`} target="_blank" rel="noreferrer" className="btn btn-outline text-xs">
              واتساپ
            </a>
          )}
          {c.email && (
            <a href={`mailto:${c.email}`} className="btn btn-outline text-xs">
              ایمیل
            </a>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs rounded-lg bg-bg-subtle p-3">
        <label className="space-y-1">
          <span className="text-text-muted block">مرحله در قیف فروش</span>
          <select
            className="input w-full text-xs"
            disabled={!canEditCrm || busy}
            value={c.leadStage ?? ""}
            onChange={(e) => run(() => apiCall(`/api/admin/users/${c.id}`, "PATCH", { leadStage: e.target.value }))}
          >
            <option value="">تعیین نشده</option>
            {Object.entries(STAGE_LABELS).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-text-muted block">مسئول ارتباط</span>
          <select
            className="input w-full text-xs"
            disabled={!canEditCrm || busy}
            value={c.owner?.id ?? ""}
            onChange={(e) => run(() => apiCall(`/api/admin/users/${c.id}`, "PATCH", { ownerId: e.target.value }))}
          >
            <option value="">بدون مسئول</option>
            {[...perms.staff, ...(c.owner && !perms.staff.some((s) => s.id === c.owner!.id) ? [c.owner] : [])].map((s) => (
              <option key={s.id} value={s.id}>
                {s.id === perms.meId ? `${s.name} (من)` : s.name}
              </option>
            ))}
          </select>
        </label>
        <div className="space-y-1">
          <span className="text-text-muted block">ارتباط ترجیحی</span>
          <span className="font-bold block py-1.5">
            {[c.extra.preferredContact, c.extra.bestCallTime].filter(Boolean).join(" · ") || "اعلام نشده"}
          </span>
        </div>
      </div>
      {c.insight.complaints.length > 0 && tab !== "summary" && (
        <Notice kind="danger">
          نارضایتی اخیر: {c.insight.complaints.map((x) => `${x.label} (${toPersianDigits(x.count)})`).join("، ")} — قبل از پیشنهاد فروش پیگیری شود.
        </Notice>
      )}
      <div className="flex flex-wrap gap-1.5 border-b border-border-hairline pb-2">
        {tabs.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)} className={`nav-tab-base ${tab === t.id ? "nav-tab-active" : "nav-tab-inactive"}`}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === "history" && <HistoryTab c={c} perms={perms} />}
      {tab === "summary" && <Summary c={c} />}
      {tab === "profile" && <ProfileTab c={c} canManage={perms.canManage} />}
      {tab === "orders" && <OrdersTab c={c} />}
      {tab === "tickets" && <TicketsTab c={c} />}
      {tab === "access" && <AccessTab c={c} roles={roles} perms={perms} />}
      {tab === "notes" && <NotesTab c={c} canManage={perms.canManage} />}
    </div>
  );
}

export default function ContactsAdmin({
  rows,
  tags,
  roles,
  detail,
  perms,
}: {
  rows: ContactRow[];
  tags: string[];
  roles: AdminRole[];
  detail: ContactDetail | null;
  perms: ContactsPerms;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"ALL" | ContactKind>("ALL");
  const [tag, setTag] = useState("");
  const [segment, setSegment] = useState<"" | SegmentKey>("");
  const [owner, setOwner] = useState<"" | "mine" | "none" | "due">("");
  const query = toEnglishDigits(q.trim());
  const filtered = rows.filter(
    (r) =>
      (kind === "ALL" || r.kind === kind) &&
      (!tag || r.tags.includes(tag)) &&
      (!segment || r.segment === segment) &&
      (!owner || (owner === "mine" ? r.ownerId === perms.meId : owner === "none" ? !r.ownerId : r.dueFollowUps > 0)) &&
      (!query ||
        r.name.includes(q.trim()) ||
        r.phone.includes(query) ||
        r.email.toLowerCase().includes(query.toLowerCase()) ||
        r.city.includes(q.trim()) ||
        r.occupation.includes(q.trim()))
  );
  const count = (k: ContactKind) => rows.filter((r) => r.kind === k).length;

  return (
    <div className="space-y-5">
      <PageTitle
        title="مخاطبان و ارتباط با مشتری"
        subtitle="پرونده ۳۶۰ درجه هر شخص: اطلاعات تماس و فردی، تاریخچه یکپارچه سفارش، تیکت، مشاوره، چت و تماس‌ها، رضایت و نارضایتی، مسئول و پیگیری."
        action={
          perms.canManage ? (
            <a href="/api/admin/contacts/export" className="btn btn-outline text-xs">
              خروجی اکسل مخاطبان
            </a>
          ) : undefined
        }
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="مشتریان" value={toPersianDigits(count("customer"))} hint={`${toPersianDigits(count("lead"))} بدون خرید`} />
        <StatCard label="سفیران" value={toPersianDigits(count("ambassador"))} />
        <StatCard label="کارکنان" value={toPersianDigits(count("staff"))} />
        <StatCard
          label="پروفایل کامل‌شده"
          value={`${toPersianDigits(rows.length ? Math.round(rows.reduce((s, r) => s + r.completeness, 0) / rows.length) : 0)}٪`}
          hint="میانگین تکمیل پروفایل"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <div className="xl:col-span-2 space-y-3">
          <input className="input w-full" placeholder="جستجو: نام، موبایل، ایمیل، شهر یا شغل" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="flex flex-wrap gap-1.5">
            {(["ALL", "customer", "lead", "ambassador", "staff"] as const).map((k) => (
              <button key={k} type="button" onClick={() => setKind(k)} className={`nav-tab-base ${kind === k ? "nav-tab-active" : "nav-tab-inactive"}`}>
                {k === "ALL" ? "همه" : KIND[k].label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <select className="input w-auto text-xs" value={segment} onChange={(e) => setSegment(e.target.value as SegmentKey | "")} aria-label="بخش مشتری">
              <option value="">همه بخش‌ها</option>
              {Object.entries(SEGMENT_LABELS).map(([k, l]) => (
                <option key={k} value={k}>
                  {l} ({toPersianDigits(rows.filter((r) => r.segment === k).length)})
                </option>
              ))}
            </select>
            <select className="input w-auto text-xs" value={owner} onChange={(e) => setOwner(e.target.value as typeof owner)} aria-label="مسئول">
              <option value="">همه مسئولان</option>
              <option value="mine">مخاطبان من</option>
              <option value="none">بدون مسئول</option>
              <option value="due">پیگیری سررسید</option>
            </select>
            {tags.length > 0 && (
              <select className="input w-auto text-xs" value={tag} onChange={(e) => setTag(e.target.value)}>
                <option value="">همه برچسب‌ها</option>
                {tags.map((t) => (
                  <option key={t} value={t}>
                    #{t}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="studio-card divide-y divide-[var(--border-hairline)] max-h-[70vh] overflow-y-auto">
            {filtered.length === 0 && <p className="p-5 text-center text-xs text-text-muted">مخاطبی پیدا نشد.</p>}
            {filtered.slice(0, 400).map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => router.push(`/portal/contacts?id=${r.id}`, { scroll: false })}
                className={`w-full text-right p-3 flex items-center gap-3 hover:bg-bg-subtle transition ${detail?.id === r.id ? "bg-bg-subtle" : ""}`}
              >
                <div className="grid size-9 shrink-0 place-items-center rounded-full bg-bg-subtle font-bold text-xs">{r.name ? r.name[0] : "؟"}</div>
                <div className="min-w-0 flex-1 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold truncate">{r.name || "بدون نام"}</span>
                    <span className="flex gap-1 shrink-0">
                      <span className={`badge-status ${SEGMENT_BADGE[r.segment]}`}>{SEGMENT_LABELS[r.segment]}</span>
                      <span className={`badge-status ${KIND[r.kind].badge}`}>{KIND[r.kind].label}</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[11px] text-text-muted mt-0.5">
                    <span className="font-mono" dir="ltr">
                      {toPersianDigits(r.phone)}
                    </span>
                    <span className="truncate">{[r.occupation, r.city].filter(Boolean).join(" · ")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-text-subtle mt-0.5">
                    <span>{toPersianDigits(r.orders)} خرید</span>
                    {r.openTickets > 0 && <span className="text-warning">{toPersianDigits(r.openTickets)} تیکت باز</span>}
                    {r.complaints > 0 && <span className="text-danger">{toPersianDigits(r.complaints)} نارضایتی</span>}
                    {r.dueFollowUps > 0 && <span className="text-accent-primary">پیگیری سررسید</span>}
                    {!r.isActive && <span className="text-danger">غیرفعال</span>}
                    {r.chatBlocked && <span className="text-danger">بلاک</span>}
                    <span className="ms-auto">پروفایل {toPersianDigits(r.completeness)}٪</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="xl:col-span-3">
          {detail ? (
            <ContactCard key={detail.id + detail.roleKeys.join() + detail.extraPermissions.join() + detail.revokedPermissions.join() + detail.leadStage + detail.owner?.id} c={detail} roles={roles} perms={perms} />
          ) : (
            <EmptyState text="یک مخاطب را از فهرست انتخاب کنید." />
          )}
        </div>
      </div>
    </div>
  );
}
