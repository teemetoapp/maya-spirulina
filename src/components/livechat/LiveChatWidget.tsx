"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { toPersianDigits } from "@/lib/currency";

// ==============================================================
// Floating live chat for visitors, customers and ambassadors.
// Polls /api/livechat (4s while open, 15s while a chat is running in
// the background). Hidden entirely when the «livechat» module is off.
// ==============================================================

interface Msg {
  id: string;
  fromStaff: boolean;
  author: string;
  body: string;
  at: string;
  atMs: number;
}
interface State {
  enabled: boolean;
  online?: boolean;
  hours?: { start: number; end: number };
  guestsAllowed?: boolean;
  loggedIn?: boolean;
  topics?: Record<string, string>;
  chat?: { id: string; status: "WAITING" | "ACTIVE" | "CLOSED"; topic: string; rating: number | null; messages: Msg[] } | null;
}

export default function LiveChatWidget({ inPortal = false }: { inPortal?: boolean }) {
  const pathname = usePathname() ?? "/";
  const hidden = !inPortal && (pathname.startsWith("/portal") || pathname.startsWith("/login") || pathname.startsWith("/api"));
  const [state, setState] = useState<State | null>(null);
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(0);
  const [form, setForm] = useState({ topic: "SUPPORT", name: "", phone: "", body: "" });
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/livechat", { cache: "no-store" });
      const j = await r.json();
      if (j.success) setState(j);
    } catch {
      /* شبکه قطع است؛ دور بعد */
    }
  }, []);

  useEffect(() => {
    if (hidden) return;
    const t = setTimeout(refresh, 0);
    return () => clearTimeout(t);
  }, [hidden, refresh]);

  const running = !!state?.chat && state.chat.status !== "CLOSED";
  useEffect(() => {
    if (hidden || !state?.enabled || (!open && !running)) return;
    const t = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, open ? 4000 : 15000);
    return () => clearInterval(t);
  }, [hidden, open, running, state?.enabled, refresh]);

  const messages = state?.chat?.messages ?? [];
  const staffCount = messages.filter((m) => m.fromStaff).length;
  const unread = open ? 0 : Math.max(0, staffCount - seen);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages.length, open]);

  if (hidden || !state?.enabled) return null;

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/livechat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!j.success) setError(j.error ?? "ارسال نشد.");
      await refresh();
      return j.success as boolean;
    } catch {
      setError("ارتباط برقرار نشد؛ دوباره تلاش کنید.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  const start = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await post({ action: "start", ...form, page: pathname })) setForm((f) => ({ ...f, body: "" }));
  };
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    const body = text;
    setText("");
    if (!(await post({ action: "message", body }))) setText(body);
  };

  const chat = state.chat;
  const canStart = state.loggedIn || state.guestsAllowed;

  return (
    <div className="fixed bottom-4 left-4 z-40 print:hidden" dir="rtl">
      {open && (
        <div
          role="dialog"
          aria-label="گفت‌وگوی آنلاین"
          className="mb-3 w-[min(360px,calc(100vw-2rem))] h-[min(520px,calc(100vh-7rem))] flex flex-col rounded-2xl border border-border-hairline bg-bg-card shadow-2xl overflow-hidden"
        >
          <header className="flex items-center justify-between gap-2 px-4 py-3 bg-accent-primary text-white">
            <div>
              <div className="text-sm font-black">گفت‌وگو با مایا</div>
              <div className="text-[11px] opacity-90 flex items-center gap-1.5">
                <span className={`inline-block w-2 h-2 rounded-full ${state.online ? "bg-emerald-300" : "bg-amber-300"}`} />
                {state.online
                  ? "پشتیبان و مشاور آنلاین هستند"
                  : `خارج از ساعت پاسخ‌گویی (${toPersianDigits(state.hours?.start ?? 9)} تا ${toPersianDigits(state.hours?.end ?? 21)})؛ پیام بگذارید`}
              </div>
            </div>
            <button
              onClick={() => {
                setSeen(staffCount);
                setOpen(false);
              }}
              className="text-white/90 hover:text-white text-lg leading-none px-1" aria-label="بستن">
              ×
            </button>
          </header>

          {!chat ? (
            canStart ? (
              <form onSubmit={start} className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
                <p className="text-text-muted">سؤال درباره سفارش، مصرف یا انتخاب محصول دارید؟ بپرسید؛ معمولاً در چند دقیقه پاسخ می‌دهیم.</p>
                <div className="grid grid-cols-1 gap-1.5" role="radiogroup" aria-label="موضوع">
                  {Object.entries(state.topics ?? {}).map(([k, l]) => (
                    <label key={k} className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer ${form.topic === k ? "border-accent-primary bg-accent-soft" : "border-border-hairline"}`}>
                      <input type="radio" name="topic" value={k} checked={form.topic === k} onChange={() => setForm({ ...form, topic: k })} />
                      {l}
                    </label>
                  ))}
                </div>
                {!state.loggedIn && (
                  <>
                    <input className="input text-xs w-full" placeholder="نام شما" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-label="نام" required />
                    <input
                      className="input text-xs w-full font-mono"
                      dir="ltr"
                      inputMode="tel"
                      placeholder="09xxxxxxxxx"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      aria-label="شماره موبایل"
                      required
                    />
                  </>
                )}
                <textarea className="input text-xs w-full min-h-24" placeholder="پیام شما…" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} aria-label="پیام" required />
                {error && <p className="text-danger">{error}</p>}
                <button className="btn btn-primary text-xs w-full" disabled={busy}>
                  {busy ? "در حال ارسال…" : "شروع گفت‌وگو"}
                </button>
              </form>
            ) : (
              <div className="flex-1 p-6 text-center text-xs text-text-muted space-y-3">
                <p>برای گفت‌وگو با پشتیبانی ابتدا وارد حساب کاربری شوید.</p>
                <a href={`/login?next=${encodeURIComponent(pathname)}`} className="btn btn-primary text-xs inline-flex">
                  ورود با شماره موبایل
                </a>
              </div>
            )
          ) : (
            <>
              <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-2 bg-bg-subtle" aria-live="polite">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.fromStaff ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs whitespace-pre-wrap break-words ${
                        m.fromStaff ? "bg-bg-card border border-border-hairline rounded-bl-sm" : "bg-accent-primary text-white rounded-br-sm"
                      }`}
                    >
                      {m.fromStaff && <div className="text-[10px] font-bold text-accent-primary mb-0.5">{m.author}</div>}
                      {m.body}
                      <div className={`text-[9.5px] mt-1 ${m.fromStaff ? "text-text-subtle" : "text-white/75"}`}>{m.at.split(" ").pop()}</div>
                    </div>
                  </div>
                ))}
                {chat.status === "WAITING" && (
                  <p className="text-center text-[11px] text-text-muted py-2">
                    {state.online ? "پیام شما رسید؛ همکاران ما به‌زودی پاسخ می‌دهند." : "پیام شما ثبت شد؛ در اولین ساعت کاری پاسخ می‌دهیم."}
                  </p>
                )}
              </div>
              {chat.status === "CLOSED" ? (
                <div className="p-3 border-t border-border-hairline space-y-2 text-xs">
                  <p className="font-bold">گفت‌وگو تمام شد. از پاسخ‌گویی راضی بودید؟</p>
                  <div className="flex gap-1" dir="ltr" role="radiogroup" aria-label="امتیاز">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setRating(n)}
                        aria-label={`${n} ستاره`}
                        className={`text-xl ${n <= rating ? "text-amber-400" : "text-text-subtle"}`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <input className="input text-xs w-full" placeholder="نظر شما (اختیاری)" value={comment} onChange={(e) => setComment(e.target.value)} />
                  <button className="btn btn-primary text-xs w-full" disabled={busy || !rating} onClick={() => post({ action: "rate", rating, comment })}>
                    ثبت امتیاز
                  </button>
                </div>
              ) : (
                <form onSubmit={send} className="p-2 border-t border-border-hairline flex gap-2 items-end">
                  <textarea
                    className="input text-xs flex-1 min-h-10 max-h-28 resize-none"
                    rows={1}
                    placeholder="پیام…"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        (e.currentTarget.form as HTMLFormElement).requestSubmit();
                      }
                    }}
                    aria-label="متن پیام"
                  />
                  <button className="btn btn-primary text-xs" disabled={busy || !text.trim()}>
                    ارسال
                  </button>
                </form>
              )}
              {chat.status !== "CLOSED" && (
                <button className="text-[10.5px] text-text-muted py-1.5 hover:text-danger" onClick={() => post({ action: "close" })}>
                  پایان گفت‌وگو
                </button>
              )}
              {error && <p className="text-[11px] text-danger px-3 pb-2">{error}</p>}
            </>
          )}
        </div>
      )}
      <button
        onClick={() => {
          setSeen(staffCount);
          setOpen((o) => !o);
        }}
        className="relative w-14 h-14 rounded-full bg-accent-primary text-white shadow-xl flex items-center justify-center hover:scale-105 transition-transform"
        aria-label={open ? "بستن گفت‌وگو" : "گفت‌وگوی آنلاین با پشتیبانی"}
        aria-expanded={open}
      >
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />}
        </svg>
        {unread > 0 && (
          <span className="absolute -top-1 -left-1 min-w-5 h-5 px-1 rounded-full bg-danger text-white text-[10px] font-black flex items-center justify-center">{toPersianDigits(unread)}</span>
        )}
        {state.online && !open && unread === 0 && <span className="absolute top-1 left-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white" />}
      </button>
    </div>
  );
}
