"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { TicketDTO, TicketStats, TicketStatusKey, TicketPriorityKey, TicketKindKey } from "@/lib/portal/tickets";
import { apiCall, useMutation, PageTitle, MutationNotice, EmptyState, Field, Modal, StatCard, Notice } from "@/components/portal/ui";
import { toPersianDigits } from "@/lib/currency";

// Tickets: customers and ambassadors see their own tickets as a list and
// rate the answer; support staff (tickets.manage) work on a kanban board
// with response-time and satisfaction KPIs.
// The same board serves nutrition consultations (kind CONSULTATION):
// customers fill an intake form, consultants answer in their portal.

export interface ConsultInfo {
  canRequest: boolean;
  reason: string | null;
  responseHours: number;
  goals: string[];
}

const COPY: Record<TicketKindKey, Record<string, string>> = {
  SUPPORT: {
    staffTitle: "تیکت‌ها",
    staffSubtitle: "کارت‌ها را بین ستون‌ها بکشید تا وضعیت تغییر کند. پاسخ شما با پیامک یا تلگرام به کاربر اطلاع داده می‌شود.",
    agent: "کارشناس",
    ownTitle: "تیکت",
    ownSubtitle: "سؤال یا مشکلی دارید؟ تیکت ثبت کنید؛ پاسخ با پیامک یا تلگرام به شما اطلاع داده می‌شود.",
    newButton: "تیکت جدید",
    empty: "شما هنوز تیکتی ثبت نکرده‌اید.",
    pick: "یک تیکت را انتخاب کنید.",
    rate: "از پاسخ پشتیبانی راضی بودید؟ با امتیاز دادن، تیکت بسته می‌شود.",
    open: "تیکت باز",
  },
  CONSULTATION: {
    staffTitle: "درخواست‌های مشاوره",
    staffSubtitle: "درخواست‌های مشاوره تغذیه مشتریان. با اولین پاسخ، درخواست به نام شما ثبت می‌شود و پاسخ با پیامک به مراجع اطلاع داده می‌شود.",
    agent: "مشاور",
    ownTitle: "مشاوره تغذیه",
    ownSubtitle: "سؤال تغذیه‌ای دارید؟ فرم را پر کنید تا مشاور تغذیه مایا پاسخ دهد.",
    newButton: "درخواست مشاوره",
    empty: "هنوز درخواست مشاوره‌ای ثبت نکرده‌اید.",
    pick: "یک درخواست را انتخاب کنید.",
    rate: "از پاسخ مشاور راضی بودید؟ با امتیاز دادن، گفت‌وگو بسته می‌شود.",
    open: "درخواست باز",
  },
};

export const TICKET_STATUS: Record<TicketStatusKey, { label: string; badge: string }> = {
  OPEN: { label: "جدید", badge: "badge-status-warning" },
  IN_PROGRESS: { label: "در حال بررسی", badge: "badge-status-info" },
  ANSWERED: { label: "پاسخ داده شد", badge: "badge-status-success" },
  CLOSED: { label: "بسته", badge: "badge-status-neutral" },
};

const PRIORITY: Record<TicketPriorityKey, { label: string; badge: string }> = {
  LOW: { label: "کم", badge: "badge-status-neutral" },
  NORMAL: { label: "عادی", badge: "badge-status-info" },
  HIGH: { label: "بالا", badge: "badge-status-warning" },
  URGENT: { label: "فوری", badge: "badge-status-danger" },
};

const COLUMNS: TicketStatusKey[] = ["OPEN", "IN_PROGRESS", "ANSWERED", "CLOSED"];

function formatDuration(minutes: number | null): string {
  if (minutes === null) return "—";
  if (minutes < 60) return `${toPersianDigits(minutes)} دقیقه`;
  const h = minutes / 60;
  if (h < 48) return `${toPersianDigits(Math.round(h * 10) / 10)} ساعت`;
  return `${toPersianDigits(Math.round(h / 24))} روز`;
}

function Stars({ value, onPick, size = "text-base" }: { value: number; onPick?: (n: number) => void; size?: string }) {
  // فقط‌خواندنی: span (این ستاره‌ها داخل کارت‌های دکمه‌ای کانبان هم می‌آیند)
  if (!onPick) {
    return (
      <span className={`inline-flex gap-0.5 ${size}`} dir="ltr" role="img" aria-label={`${toPersianDigits(value)} از ۵`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={n <= value ? "text-warning" : "text-text-subtle"}>
            ★
          </span>
        ))}
      </span>
    );
  }
  return (
    <span className={`inline-flex gap-0.5 ${size}`} dir="ltr" aria-label={`${toPersianDigits(value)} از ۵`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onPick(n)}
          aria-label={`${toPersianDigits(n)} ستاره`}
          className={`${n <= value ? "text-warning" : "text-text-subtle"} cursor-pointer hover:scale-110 transition`}
        >
          ★
        </button>
      ))}
    </span>
  );
}

function Thread({ ticket }: { ticket: TicketDTO }) {
  return (
    <div className="space-y-3">
      {ticket.messages.map((m) => (
        <div key={m.id} className={`rounded-xl p-3 text-xs space-y-1 ${m.isStaff ? "bg-accent-soft border border-accent-border" : "bg-bg-subtle"}`}>
          <div className="flex justify-between text-[11px] text-text-muted">
            <span className="font-bold">{m.authorName}</span>
            <span>{m.createdAt}</span>
          </div>
          <p className="whitespace-pre-wrap leading-6">{m.body}</p>
        </div>
      ))}
    </div>
  );
}

function ReplyBox({ ticketId, run, busy }: { ticketId: string; run: ReturnType<typeof useMutation>["run"]; busy: boolean }) {
  const [reply, setReply] = useState("");
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const res = await run(() => apiCall(`/api/portal/tickets/${ticketId}`, "POST", { body: reply }));
        if (res.success) setReply("");
      }}
      className="space-y-2"
    >
      <textarea required rows={3} className="input w-full" placeholder="پاسخ خود را بنویسید…" value={reply} onChange={(e) => setReply(e.target.value)} />
      <div className="flex justify-end">
        <button className="btn btn-primary text-xs" disabled={busy}>
          ارسال پاسخ
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------- staff
function StaffBoard({
  tickets,
  stats,
  agents,
  kind,
  linkContacts,
}: {
  tickets: TicketDTO[];
  stats: TicketStats;
  agents: { id: string; name: string }[];
  kind: TicketKindKey;
  linkContacts: boolean;
}) {
  const copy = COPY[kind];
  const [openId, setOpenId] = useState<string | null>(null);
  const [mine, setMine] = useState<string>("ALL");
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<TicketStatusKey | null>(null);
  const { run, busy, notice } = useMutation();
  const open = tickets.find((t) => t.id === openId) ?? null;
  const visible = tickets.filter((t) => mine === "ALL" || (mine === "NONE" ? !t.assigneeId : t.assigneeId === mine));
  const ratedTotal = stats.ratingDistribution.reduce((a, b) => a + b, 0);

  const move = (id: string, status: TicketStatusKey) => {
    const t = tickets.find((x) => x.id === id);
    if (!t || t.status === status) return;
    run(() => apiCall(`/api/portal/tickets/${id}`, "PATCH", { status }));
  };

  return (
    <div className="space-y-5">
      <PageTitle title={copy.staffTitle} subtitle={copy.staffSubtitle} />
      <MutationNotice notice={notice} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label={copy.open} value={toPersianDigits(stats.open)} />
        <StatCard
          label="میانگین زمان اولین پاسخ"
          value={formatDuration(stats.avgFirstResponseMinutes)}
          hint={stats.respondedWithinDay !== null ? `${toPersianDigits(stats.respondedWithinDay)}٪ زیر ۲۴ ساعت · ۳۰ روز اخیر` : "۳۰ روز اخیر"}
        />
        <StatCard label="میانگین زمان حل" value={stats.avgResolutionHours === null ? "—" : formatDuration(Math.round(stats.avgResolutionHours * 60))} hint="از ثبت تا بسته شدن" />
        <StatCard
          label="رضایت کاربران"
          value={
            stats.satisfaction === null ? (
              "—"
            ) : (
              <span className="flex items-center gap-2">
                {toPersianDigits(stats.satisfaction)} <Stars value={Math.round(stats.satisfaction)} size="text-sm" />
              </span>
            )
          }
          hint={`${toPersianDigits(stats.ratedCount)} امتیاز ثبت‌شده`}
        />
      </div>

      {ratedTotal > 0 && (
        <div className="studio-card p-4 space-y-2 text-xs">
          <span className="font-bold">توزیع امتیاز رضایت</span>
          {[5, 4, 3, 2, 1].map((n) => {
            const c = stats.ratingDistribution[n - 1];
            return (
              <div key={n} className="flex items-center gap-3">
                <span className="w-10 text-text-muted">{toPersianDigits(n)} ستاره</span>
                <div className="flex-1 h-2 rounded-full bg-bg-subtle overflow-hidden">
                  <div className="h-full rounded-full bg-accent-primary" style={{ width: `${(c / ratedTotal) * 100}%` }} />
                </div>
                <span className="w-8 text-text-muted font-mono">{toPersianDigits(c)}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-text-muted">{copy.agent}:</span>
        <select className="input w-auto text-xs" value={mine} onChange={(e) => setMine(e.target.value)}>
          <option value="ALL">همه</option>
          <option value="NONE">ارجاع‌نشده</option>
          {agents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {COLUMNS.map((col) => {
          const items = visible.filter((t) => t.status === col);
          return (
            <div
              key={col}
              onDragOver={(e) => {
                e.preventDefault();
                setOverCol(col);
              }}
              onDragLeave={() => setOverCol(null)}
              onDrop={() => {
                if (dragId) move(dragId, col);
                setDragId(null);
                setOverCol(null);
              }}
              className={`rounded-xl border p-2 space-y-2 min-h-40 transition ${overCol === col ? "border-accent-primary bg-accent-soft" : "border-border-hairline bg-bg-subtle/50"}`}
            >
              <div className="flex items-center justify-between px-1.5 py-1">
                <span className="text-xs font-black">{TICKET_STATUS[col].label}</span>
                <span className={`badge-status ${TICKET_STATUS[col].badge}`}>{toPersianDigits(items.length)}</span>
              </div>
              {items.length === 0 && <p className="text-[11px] text-text-subtle text-center py-4">خالی</p>}
              {items.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  draggable
                  onDragStart={() => setDragId(t.id)}
                  onClick={() => setOpenId(t.id)}
                  className="studio-card w-full text-right p-3 space-y-2 cursor-grab active:cursor-grabbing"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold leading-5">{t.subject}</span>
                    <span className={`badge-status shrink-0 ${PRIORITY[t.priority].badge}`}>{PRIORITY[t.priority].label}</span>
                  </div>
                  <div className="text-[11px] text-text-muted flex flex-wrap gap-x-2">
                    <span>{t.customerName}</span>
                    {t.orderNumber && <span className="font-mono">{t.orderNumber}</span>}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-text-subtle">
                    <span>{t.assigneeName ?? "ارجاع‌نشده"}</span>
                    {t.rating ? <Stars value={t.rating} size="text-[11px]" /> : <span>{formatDuration(t.ageHours * 60)} پیش</span>}
                  </div>
                </button>
              ))}
            </div>
          );
        })}
      </div>

      {open && (
        <Modal title={open.subject} onClose={() => setOpenId(null)}>
          <div className="space-y-4 text-xs">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-text-muted">
              {linkContacts ? (
                <Link href={`/portal/contacts?id=${open.customerId}`} className="text-accent-primary font-bold">
                  {open.customerName}
                </Link>
              ) : (
                <span className="font-bold text-text-primary">{open.customerName}</span>
              )}
              <span className="font-mono">{toPersianDigits(open.customerPhone)}</span>
              {open.orderNumber && <span>سفارش {open.orderNumber}</span>}
              <span>ثبت: {open.createdAt}</span>
              {open.firstResponseMinutes !== null && <span>اولین پاسخ: {formatDuration(open.firstResponseMinutes)}</span>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Field label="وضعیت">
                <select className="input w-full text-xs" value={open.status} disabled={busy} onChange={(e) => move(open.id, e.target.value as TicketStatusKey)}>
                  {COLUMNS.map((k) => (
                    <option key={k} value={k}>
                      {TICKET_STATUS[k].label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="اولویت">
                <select
                  className="input w-full text-xs"
                  value={open.priority}
                  disabled={busy}
                  onChange={(e) => run(() => apiCall(`/api/portal/tickets/${open.id}`, "PATCH", { priority: e.target.value }))}
                >
                  {(Object.keys(PRIORITY) as TicketPriorityKey[]).map((k) => (
                    <option key={k} value={k}>
                      {PRIORITY[k].label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={copy.agent}>
                <select
                  className="input w-full text-xs"
                  value={open.assigneeId ?? ""}
                  disabled={busy}
                  onChange={(e) => run(() => apiCall(`/api/portal/tickets/${open.id}`, "PATCH", { assigneeId: e.target.value }))}
                >
                  <option value="">ارجاع‌نشده</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            {open.rating && (
              <div className="rounded-lg bg-bg-subtle p-3 space-y-1">
                <span className="font-bold">رضایت کاربر:</span> <Stars value={open.rating} size="text-sm" />
                {open.ratingComment && <p className="text-text-muted">{open.ratingComment}</p>}
              </div>
            )}
            <Thread ticket={open} />
            <ReplyBox ticketId={open.id} run={run} busy={busy} />
          </div>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- customer / ambassador
function ConsultForm({ info, onDone, run, busy }: { info: ConsultInfo; onDone: () => void; run: ReturnType<typeof useMutation>["run"]; busy: boolean }) {
  const [f, setF] = useState({ goal: "", age: "", weight: "", height: "", conditions: "", medications: "", question: "" });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const res = await run(() => apiCall("/api/portal/consultations", "POST", f));
        if (res.success) onDone();
      }}
      className="space-y-3"
    >
      <Field label="هدف شما از مشاوره">
        <select required className="input w-full" value={f.goal} onChange={set("goal")}>
          <option value="">انتخاب کنید</option>
          {info.goals.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-3 gap-2">
        <Field label="سن (سال)">
          <input inputMode="numeric" className="input w-full" value={f.age} onChange={set("age")} />
        </Field>
        <Field label="وزن (کیلو)">
          <input inputMode="numeric" className="input w-full" value={f.weight} onChange={set("weight")} />
        </Field>
        <Field label="قد (سانتی‌متر)">
          <input inputMode="numeric" className="input w-full" value={f.height} onChange={set("height")} />
        </Field>
      </div>
      <Field label="بیماری یا شرایط خاص (اختیاری)">
        <input className="input w-full" placeholder="مثلاً دیابت، بارداری، حساسیت غذایی" value={f.conditions} onChange={set("conditions")} />
      </Field>
      <Field label="داروهای مصرفی (اختیاری)">
        <input className="input w-full" value={f.medications} onChange={set("medications")} />
      </Field>
      <Field label="سؤال یا توضیح شما">
        <textarea required minLength={10} rows={5} className="input w-full" value={f.question} onChange={set("question")} />
      </Field>
      <p className="text-[11px] text-text-muted leading-5">
        مشاوره تغذیه جایگزین ویزیت پزشک نیست. اطلاعات شما فقط در اختیار مشاوران تغذیه مایا قرار می‌گیرد. پاسخ حداکثر ظرف{" "}
        {toPersianDigits(info.responseHours)} ساعت.
      </p>
      <div className="flex justify-end">
        <button className="btn btn-primary text-xs" disabled={busy}>
          ثبت درخواست مشاوره
        </button>
      </div>
    </form>
  );
}

function OwnTickets({ tickets, kind, consult }: { tickets: TicketDTO[]; kind: TicketKindKey; consult?: ConsultInfo }) {
  const copy = COPY[kind];
  const [selectedId, setSelectedId] = useState<string | null>(tickets[0]?.id ?? null);
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [newTicket, setNewTicket] = useState({ subject: "", body: "", orderNumber: "" });
  const [rateComment, setRateComment] = useState("");
  const { run, busy, notice } = useMutation();
  const selected = tickets.find((t) => t.id === selectedId) ?? null;

  async function createTicket(e: React.FormEvent) {
    e.preventDefault();
    const res = await run(() => apiCall("/api/portal/tickets", "POST", newTicket));
    if (res.success) {
      setIsNewOpen(false);
      setNewTicket({ subject: "", body: "", orderNumber: "" });
    }
  }

  return (
    <div className="space-y-5">
      <PageTitle
        title={copy.ownTitle}
        subtitle={consult ? `${copy.ownSubtitle} پاسخ حداکثر ظرف ${toPersianDigits(consult.responseHours)} ساعت.` : copy.ownSubtitle}
        action={
          <button className="btn btn-primary text-xs" onClick={() => setIsNewOpen(true)} disabled={!!consult && !consult.canRequest}>
            {copy.newButton}
          </button>
        }
      />
      <MutationNotice notice={notice} />
      {consult && !consult.canRequest && consult.reason && <Notice kind="info">{consult.reason}</Notice>}

      {tickets.length === 0 ? (
        <EmptyState text={copy.empty} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="space-y-2 lg:max-h-[70vh] lg:overflow-y-auto">
            {tickets.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedId(t.id)}
                className={`studio-card w-full text-right p-3 space-y-1 ${t.id === selectedId ? "border-accent-primary" : ""}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold truncate">{t.subject}</span>
                  <span className={`badge-status ${TICKET_STATUS[t.status].badge}`}>{TICKET_STATUS[t.status].label}</span>
                </div>
                <span className="text-[11px] text-text-muted block">{t.updatedAt}</span>
              </button>
            ))}
          </div>

          <div className="lg:col-span-2">
            {selected ? (
              <div className="studio-card p-5 space-y-4">
                <div className="pb-3 border-b border-border-hairline">
                  <h2 className="text-sm font-black">{selected.subject}</h2>
                  <span className="text-[11px] text-text-muted">
                    {selected.orderNumber ? `سفارش ${selected.orderNumber} · ` : ""}ثبت: {selected.createdAt}
                  </span>
                </div>
                <Thread ticket={selected} />

                {(selected.status === "ANSWERED" || selected.status === "CLOSED") && !selected.rating && (
                  <div className="rounded-xl border border-accent-border bg-accent-soft p-4 space-y-2 text-xs">
                    <p className="font-bold">{copy.rate}</p>
                    <input className="input w-full" placeholder="نظر شما (اختیاری)" value={rateComment} onChange={(e) => setRateComment(e.target.value)} />
                    <Stars
                      value={0}
                      size="text-2xl"
                      onPick={(n) => run(() => apiCall(`/api/portal/tickets/${selected.id}`, "PUT", { rating: n, comment: rateComment }))}
                    />
                  </div>
                )}
                {selected.rating && (
                  <p className="text-xs text-text-muted">
                    امتیاز شما: <Stars value={selected.rating} size="text-sm" />
                  </p>
                )}
                {selected.status !== "CLOSED" && <ReplyBox ticketId={selected.id} run={run} busy={busy} />}
              </div>
            ) : (
              <EmptyState text={copy.pick} />
            )}
          </div>
        </div>
      )}

      {isNewOpen && consult && (
        <Modal title={copy.newButton} onClose={() => setIsNewOpen(false)}>
          <ConsultForm info={consult} run={run} busy={busy} onDone={() => setIsNewOpen(false)} />
        </Modal>
      )}
      {isNewOpen && !consult && (
        <Modal title="تیکت جدید" onClose={() => setIsNewOpen(false)}>
          <form onSubmit={createTicket} className="space-y-3">
            <Field label="موضوع">
              <input required className="input w-full" value={newTicket.subject} onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })} />
            </Field>
            <Field label="شماره سفارش (اختیاری)">
              <input dir="ltr" className="input w-full" placeholder="ORD-..." value={newTicket.orderNumber} onChange={(e) => setNewTicket({ ...newTicket, orderNumber: e.target.value })} />
            </Field>
            <Field label="متن پیام">
              <textarea required rows={5} className="input w-full" value={newTicket.body} onChange={(e) => setNewTicket({ ...newTicket, body: e.target.value })} />
            </Field>
            <div className="flex justify-end">
              <button className="btn btn-primary text-xs" disabled={busy}>
                ثبت تیکت
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

type BoardProps =
  | { staff: false; tickets: TicketDTO[]; kind?: TicketKindKey; consult?: ConsultInfo }
  | { staff: true; tickets: TicketDTO[]; stats: TicketStats; agents: { id: string; name: string }[]; kind?: TicketKindKey; linkContacts?: boolean };

export default function TicketsBoard(props: BoardProps) {
  const kind = props.kind ?? "SUPPORT";
  return props.staff ? (
    <StaffBoard tickets={props.tickets} stats={props.stats} agents={props.agents} kind={kind} linkContacts={props.linkContacts ?? true} />
  ) : (
    <OwnTickets tickets={props.tickets} kind={kind} consult={props.consult} />
  );
}
