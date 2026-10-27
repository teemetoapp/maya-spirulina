"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { LiveChatRow, LiveChatDetail } from "@/lib/livechat";
import { PageTitle, StatCard, EmptyState, apiCall } from "@/components/portal/ui";
import { SEGMENT_LABELS, SEGMENT_BADGE } from "@/lib/crm/insight";
import { formatToman, toPersianDigits } from "@/lib/currency";

// صندوق گفت‌وگوی آنلاین کارکنان، با کارت مشتری کنار هر گفت‌وگو

const TOPICS = { SUPPORT: "پشتیبانی", CONSULTATION: "مشاوره", SALES: "فروش" } as const;
const STATUS = {
  WAITING: { label: "در انتظار", badge: "badge-status-warning" },
  ACTIVE: { label: "فعال", badge: "badge-status-info" },
  CLOSED: { label: "بسته", badge: "badge-status-neutral" },
} as const;

interface Data {
  rows: LiveChatRow[];
  selected: LiveChatDetail | null;
  meId: string;
  stats: { waiting: number; active: number; mine: number };
}

export default function LiveChatInbox({
  initial,
  section,
  consultantOnly,
  canSeeContacts,
}: {
  initial: Data;
  section: string;
  consultantOnly: boolean;
  canSeeContacts: boolean;
}) {
  const router = useRouter();
  const [data, setData] = useState<Data>(initial);
  const [filter, setFilter] = useState<"open" | "mine" | "closed">("open");
  const selectedId = data.selected?.id ?? null;

  const refresh = useCallback(
    async (id: string | null = selectedId) => {
      const r = await apiCall<Data>(`/api/admin/livechat${id ? `?id=${id}` : ""}`);
      if (r.success) setData({ rows: r.rows, selected: r.selected, meId: r.meId, stats: r.stats });
    },
    [selectedId]
  );

  useEffect(() => {
    const t = setInterval(() => document.visibilityState === "visible" && refresh(), 4000);
    return () => clearInterval(t);
  }, [refresh]);

  const open = (id: string) => {
    router.replace(`/portal/${section}?id=${id}`, { scroll: false });
    refresh(id);
  };

  const rows = data.rows.filter((r) => (filter === "closed" ? r.status === "CLOSED" : filter === "mine" ? r.assigneeId === data.meId && r.status !== "CLOSED" : r.status !== "CLOSED"));

  return (
    <div className="space-y-5">
      <PageTitle
        title={consultantOnly ? "گفت‌وگوی آنلاین مشاوره" : "گفت‌وگوی آنلاین"}
        subtitle="پیام‌های بازدیدکنندگان سایت به‌صورت زنده. کنار هر گفت‌وگو سابقه خرید، رضایت و شکایت‌های مشتری را می‌بینید."
      />
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="منتظر پاسخ" value={toPersianDigits(data.stats.waiting)} />
        <StatCard label="گفت‌وگوهای باز" value={toPersianDigits(data.stats.active)} />
        <StatCard label="سپرده به من" value={toPersianDigits(data.stats.mine)} />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr_300px] gap-4 items-start">
        <aside className="studio-card overflow-hidden">
          <div className="flex gap-1 p-2 border-b border-border-hairline text-xs">
            {(
              [
                ["open", "باز"],
                ["mine", "مال من"],
                ["closed", "بسته‌شده"],
              ] as const
            ).map(([k, l]) => (
              <button key={k} onClick={() => setFilter(k)} className={`flex-1 rounded-md py-1.5 ${filter === k ? "bg-accent-soft text-accent-primary font-bold" : "text-text-muted"}`}>
                {l}
              </button>
            ))}
          </div>
          <div className="divide-y divide-border-hairline max-h-[65vh] overflow-y-auto">
            {rows.length === 0 && <p className="p-4 text-xs text-text-muted text-center">گفت‌وگویی نیست.</p>}
            {rows.map((r) => (
              <button
                key={r.id}
                onClick={() => open(r.id)}
                className={`w-full text-right p-3 space-y-1 transition-colors ${r.id === selectedId ? "bg-accent-soft" : "hover:bg-bg-subtle"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold truncate flex items-center gap-1.5">
                    {r.waitingForStaff && <span className="w-2 h-2 rounded-full bg-warning shrink-0" aria-label="منتظر پاسخ" />}
                    {r.name}
                  </span>
                  <span className="text-[10px] text-text-subtle shrink-0">{r.lastAt.split(" ").pop()}</span>
                </div>
                <div className="text-[11px] text-text-muted truncate">{r.last}</div>
                <div className="flex gap-1">
                  <span className={`badge-status ${STATUS[r.status].badge}`}>{STATUS[r.status].label}</span>
                  <span className="badge-status badge-status-neutral">{TOPICS[r.topic]}</span>
                  {r.rating && <span className="badge-status badge-status-neutral">★ {toPersianDigits(r.rating)}</span>}
                </div>
              </button>
            ))}
          </div>
        </aside>
        {data.selected ? (
          <Conversation key={data.selected.id} chat={data.selected} meId={data.meId} consultantOnly={consultantOnly} onChange={() => refresh()} />
        ) : (
          <EmptyState text="یک گفت‌وگو را از فهرست انتخاب کنید." />
        )}
        {data.selected && <ContactCard chat={data.selected} canSeeContacts={canSeeContacts} />}
      </div>
    </div>
  );
}

function Conversation({ chat, meId, consultantOnly, onChange }: { chat: LiveChatDetail; meId: string; consultantOnly: boolean; onChange: () => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [chat.messages.length]);

  const act = async (body: Record<string, unknown>) => {
    setBusy(true);
    const r = await apiCall<{ ticketId?: string }>("/api/admin/livechat", "POST", { id: chat.id, ...body });
    setBusy(false);
    setNote(r.success ? r.message ?? null : r.error ?? "انجام نشد.");
    onChange();
    return r.success;
  };
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText("");
    if (!(await act({ action: "reply", body }))) setText(body);
  };

  return (
    <section className="studio-card flex flex-col h-[72vh]">
      <header className="p-3 border-b border-border-hairline flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-black">{chat.name}</div>
          <div className="text-[11px] text-text-muted">
            <span className="font-mono">{toPersianDigits(chat.phone)}</span>
            {!chat.verified && chat.phone && " · شماره تأییدنشده (مهمان)"}
            {chat.page && <> · از صفحه <span className="font-mono">{chat.page}</span></>}
            {chat.assignee && <> · مسئول: {chat.assignee}</>}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {chat.assigneeId !== meId && chat.status !== "CLOSED" && (
            <button className="btn btn-ghost text-xs border border-border-hairline" disabled={busy} onClick={() => act({ action: "assign" })}>
              به من بسپار
            </button>
          )}
          {!consultantOnly && chat.status !== "CLOSED" && (
            <select className="input text-xs py-1" value={chat.topic} onChange={(e) => act({ action: "topic", topic: e.target.value })} aria-label="ارجاع به">
              {Object.entries(TOPICS).map(([k, l]) => (
                <option key={k} value={k}>
                  ارجاع: {l}
                </option>
              ))}
            </select>
          )}
          {chat.userId && (
            <button className="btn btn-ghost text-xs border border-border-hairline" disabled={busy} onClick={() => act({ action: "ticket" })}>
              تبدیل به تیکت پیگیری
            </button>
          )}
          {chat.status !== "CLOSED" && (
            <button className="btn btn-ghost text-xs text-danger border border-border-hairline" disabled={busy} onClick={() => act({ action: "close" })}>
              پایان گفت‌وگو
            </button>
          )}
        </div>
      </header>
      <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-bg-subtle">
        {chat.messages.map((m) => (
          <div key={m.id} className={`flex ${m.fromStaff ? "justify-start" : "justify-end"}`}>
            <div
              className={`max-w-[75%] rounded-2xl px-3 py-2 text-xs whitespace-pre-wrap break-words ${
                m.fromStaff ? "bg-accent-primary text-white rounded-br-sm" : "bg-bg-card border border-border-hairline rounded-bl-sm"
              }`}
            >
              <div className={`text-[10px] font-bold mb-0.5 ${m.fromStaff ? "text-white/85" : "text-accent-primary"}`}>{m.author}</div>
              {m.body}
              <div className={`text-[9.5px] mt-1 ${m.fromStaff ? "text-white/70" : "text-text-subtle"}`}>{m.at}</div>
            </div>
          </div>
        ))}
        {chat.status === "CLOSED" && (
          <p className="text-center text-[11px] text-text-muted py-2">
            گفت‌وگو بسته شده است{chat.rating ? ` · امتیاز ${toPersianDigits(chat.rating)} از ۵` : ""}
            {chat.ratingComment && ` · «${chat.ratingComment}»`}
          </p>
        )}
      </div>
      {note && <p className="text-[11px] text-text-muted px-3 pt-2">{note}</p>}
      {chat.status !== "CLOSED" && (
        <form onSubmit={send} className="p-2 border-t border-border-hairline flex gap-2 items-end">
          <textarea
            className="input text-xs flex-1 min-h-10 max-h-32 resize-none"
            placeholder="پاسخ… (Enter ارسال، Shift+Enter خط جدید)"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                (e.currentTarget.form as HTMLFormElement).requestSubmit();
              }
            }}
            aria-label="متن پاسخ"
          />
          <button className="btn btn-primary text-xs" disabled={busy || !text.trim()}>
            ارسال
          </button>
        </form>
      )}
    </section>
  );
}

function ContactCard({ chat, canSeeContacts }: { chat: LiveChatDetail; canSeeContacts: boolean }) {
  const c = chat.contact;
  if (!c)
    return (
      <aside className="studio-card p-4 text-xs space-y-2">
        <h3 className="text-sm font-black">بازدیدکننده جدید</h3>
        <p className="text-text-muted">این شماره هنوز حساب کاربری ندارد؛ پس از اولین خرید یا ثبت‌نام، پرونده‌اش ساخته می‌شود.</p>
      </aside>
    );
  const i = c.insight;
  return (
    <aside className="studio-card p-4 text-xs space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-black">{c.name || "بدون نام"}</h3>
          <p className="text-text-muted">
            {c.roles.join("، ")}
            {c.city && ` · ${c.city}`}
          </p>
        </div>
        <span className={`badge-status ${SEGMENT_BADGE[i.segment]} shrink-0`}>{SEGMENT_LABELS[i.segment]}</span>
      </div>
      {i.complaints.length > 0 && (
        <div className="rounded-lg border border-danger/40 bg-danger/5 p-2.5 space-y-1">
          <div className="font-bold text-danger">نارضایتی‌های اخیر</div>
          {i.complaints.map((x) => (
            <div key={x.topic} className="flex justify-between">
              <span>{x.label}</span>
              <span className="text-text-muted">
                {toPersianDigits(x.count)} بار · {x.last}
              </span>
            </div>
          ))}
        </div>
      )}
      <dl className="grid grid-cols-2 gap-2">
        <Stat k="سفارش موفق" v={toPersianDigits(i.orders)} />
        <Stat k="مجموع خرید" v={formatToman(i.totalSpent, false)} />
        <Stat k="آخرین خرید" v={i.lastOrderAt ?? "—"} />
        <Stat k="میانگین رضایت" v={i.avgRating ? `${toPersianDigits(i.avgRating)} از ۵` : "—"} />
        <Stat k="تیکت باز" v={toPersianDigits(i.openTickets)} />
        <Stat k="پیگیری سررسید" v={toPersianDigits(i.dueFollowUps)} />
      </dl>
      {c.recentOrders.length > 0 && (
        <div className="space-y-1">
          <div className="font-bold">سفارش‌های اخیر</div>
          {c.recentOrders.map((o) => (
            <div key={o.orderNumber} className="flex justify-between text-text-muted">
              <span className="font-mono">{o.orderNumber}</span>
              <span>
                {o.date} · {formatToman(o.amount, false)}
              </span>
            </div>
          ))}
        </div>
      )}
      {c.openTickets.length > 0 && (
        <div className="space-y-1">
          <div className="font-bold">تیکت‌های باز</div>
          {c.openTickets.map((t) => (
            <div key={t.id} className="truncate text-text-muted">
              • {t.subject}
            </div>
          ))}
        </div>
      )}
      {c.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {c.tags.map((t) => (
            <span key={t} className="badge-status badge-status-neutral">
              {t}
            </span>
          ))}
        </div>
      )}
      {c.crmNotes && <p className="rounded-lg bg-bg-subtle p-2 whitespace-pre-wrap">{c.crmNotes}</p>}
      {canSeeContacts && (
        <Link href={`/portal/contacts?id=${c.id}`} className="btn btn-ghost text-xs border border-border-hairline w-full justify-center">
          پرونده کامل مشتری
        </Link>
      )}
    </aside>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-lg bg-bg-subtle p-2">
      <dt className="text-[10.5px] text-text-muted">{k}</dt>
      <dd className="font-bold">{v}</dd>
    </div>
  );
}
