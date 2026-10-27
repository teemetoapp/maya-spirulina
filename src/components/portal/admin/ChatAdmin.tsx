"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ChatChannelDTO, ChatMessageDTO, ChatPerson } from "@/lib/chat";
import { apiCall, useMutation, PageTitle, MutationNotice, EmptyState, Field, Modal, Notice } from "@/components/portal/ui";
import { toPersianDigits } from "@/lib/currency";

// ==============================================================
// پیام‌ها و هماهنگی — groups and direct chats for staff. Messages are
// polled every few seconds. Moderators (chat.moderate) see every channel
// and can edit or delete any message and block a sender.
// ==============================================================

interface Perms {
  canCreateGroup: boolean;
  canModerate: boolean;
  blocked: boolean;
}

function MembersPicker({ people, value, onChange, selfId }: { people: ChatPerson[]; value: string[]; onChange: (v: string[]) => void; selfId: string }) {
  const [q, setQ] = useState("");
  return (
    <div className="space-y-2">
      <input className="input w-full" placeholder="جستجوی همکار…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="max-h-56 overflow-y-auto space-y-1">
        {people
          .filter((p) => p.id !== selfId && (!q || p.name.includes(q)))
          .map((p) => (
            <label key={p.id} className="flex items-center gap-2 text-xs p-1.5 rounded hover:bg-bg-subtle">
              <input type="checkbox" checked={value.includes(p.id)} onChange={(e) => onChange(e.target.checked ? [...value, p.id] : value.filter((x) => x !== p.id))} />
              <span className="font-medium">{p.name}</span>
              <span className="text-text-subtle">{p.roleNames}</span>
            </label>
          ))}
      </div>
    </div>
  );
}

export default function ChatAdmin({
  channels,
  people,
  selfId,
  selectedId,
  perms,
}: {
  channels: ChatChannelDTO[];
  people: ChatPerson[];
  selfId: string;
  selectedId: string | null;
  perms: Perms;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessageDTO[]>([]);
  const [text, setText] = useState("");
  const [editing, setEditing] = useState<{ id: string; body: string } | null>(null);
  const [modal, setModal] = useState<null | "group" | "direct" | "manage">(null);
  const [group, setGroup] = useState({ name: "", description: "", memberIds: [] as string[] });
  const [q, setQ] = useState("");
  const { run, busy, notice, setNotice } = useMutation();
  const bottomRef = useRef<HTMLDivElement>(null);
  const selected = channels.find((c) => c.id === selectedId) ?? null;
  const personMap = new Map(people.map((p) => [p.id, p]));

  const load = useCallback(async () => {
    if (!selectedId) return;
    const res = await apiCall<{ messages: ChatMessageDTO[] }>(`/api/chat/messages?channel=${selectedId}`);
    if (res.success) setMessages(res.messages);
  }, [selectedId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- clear the previous channel before loading the new one
    setMessages([]);
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const open = (id: string) => router.push(`/portal/messages?c=${id}`, { scroll: false });

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!selected || !text.trim()) return;
    const res = await apiCall("/api/chat/messages", "POST", { channelId: selected.id, body: text });
    if (res.success) {
      setText("");
      load();
    } else setNotice({ kind: "danger", text: res.error ?? "ارسال نشد." });
  }

  async function act(fn: () => Promise<{ success: boolean; error?: string; message?: string }>) {
    const res = await run(fn);
    if (res.success) load();
    return res;
  }

  const visibleChannels = channels.filter((c) => !q || c.title.includes(q));

  return (
    <div className="space-y-4">
      <PageTitle
        title="پیام‌ها و هماهنگی"
        subtitle={perms.canModerate ? "شما مدیر پیام‌ها هستید: همه گفتگوها را می‌بینید و می‌توانید پیام‌ها را ویرایش یا حذف کنید." : "گفتگوی گروهی و خصوصی با همکاران."}
        action={
          <div className="flex gap-2">
            <button className="btn btn-outline text-xs" disabled={perms.blocked} onClick={() => setModal("direct")}>
              گفتگوی خصوصی
            </button>
            {perms.canCreateGroup && (
              <button className="btn btn-primary text-xs" disabled={perms.blocked} onClick={() => setModal("group")}>
                گروه جدید
              </button>
            )}
          </div>
        }
      />
      {perms.blocked && <Notice kind="danger">مدیر ارشد شما را در پیام‌ها بلاک کرده است؛ فقط می‌توانید پیام‌ها را بخوانید.</Notice>}
      <MutationNotice notice={notice} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:h-[70vh]">
        <div className="studio-card flex flex-col overflow-hidden">
          <div className="p-2 border-b border-border-hairline">
            <input className="input w-full text-xs" placeholder="جستجوی گفتگو…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-hairline)]">
            {visibleChannels.length === 0 && <p className="p-5 text-center text-xs text-text-muted">هنوز گفتگویی ندارید.</p>}
            {visibleChannels.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => open(c.id)}
                className={`w-full text-right p-3 text-xs hover:bg-bg-subtle transition ${c.id === selectedId ? "bg-bg-subtle" : ""}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold truncate">
                    {c.type === "GROUP" ? "# " : ""}
                    {c.title}
                  </span>
                  {c.unread > 0 ? (
                    <span className="badge-status badge-status-success">{toPersianDigits(c.unread)}</span>
                  ) : (
                    !c.isMember && <span className="badge-status badge-status-neutral">نظارت</span>
                  )}
                </div>
                <p className="text-[11px] text-text-muted truncate mt-0.5">{c.lastMessage ?? "بدون پیام"}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 studio-card flex flex-col overflow-hidden min-h-[60vh] lg:min-h-0">
          {!selected ? (
            <div className="flex-1 grid place-items-center p-6">
              <EmptyState text="یک گفتگو را انتخاب کنید یا گفتگوی تازه بسازید." />
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 p-3 border-b border-border-hairline">
                <div className="min-w-0">
                  <h2 className="text-sm font-black truncate">{selected.title}</h2>
                  <p className="text-[11px] text-text-muted truncate">
                    {selected.type === "GROUP"
                      ? `${toPersianDigits(selected.memberIds.length)} عضو: ${selected.memberIds.map((id) => personMap.get(id)?.name ?? "").filter(Boolean).join("، ")}`
                      : personMap.get(selected.memberIds.find((x) => x !== selfId) ?? "")?.roleNames}
                  </p>
                </div>
                {selected.canManage && (
                  <div className="flex gap-1">
                    {selected.type === "GROUP" && (
                      <button
                        className="btn btn-ghost text-xs"
                        onClick={() => {
                          setGroup({ name: selected.title, description: selected.description, memberIds: selected.memberIds });
                          setModal("manage");
                        }}
                      >
                        مدیریت گروه
                      </button>
                    )}
                    <button
                      className="btn btn-ghost text-xs text-danger"
                      disabled={busy}
                      onClick={async () => {
                        if (!window.confirm("این گفتگو با همه پیام‌هایش حذف شود؟")) return;
                        const res = await run(() => apiCall(`/api/chat/channels/${selected.id}`, "DELETE"));
                        if (res.success) router.push("/portal/messages");
                      }}
                    >
                      حذف
                    </button>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && <p className="text-center text-xs text-text-subtle py-8">هنوز پیامی نیست.</p>}
                {messages.map((m) => {
                  const author = personMap.get(m.authorId);
                  const canEdit = !m.deleted && ((m.mine && !perms.blocked) || perms.canModerate);
                  return (
                    <div key={m.id} className={`flex ${m.mine ? "justify-start" : "justify-end"}`}>
                      <div className={`group max-w-[85%] rounded-2xl px-3 py-2 text-xs space-y-1 ${m.mine ? "bg-accent-soft border border-accent-border" : "bg-bg-subtle"}`}>
                        <div className="flex items-center gap-2 text-[11px] text-text-muted">
                          <span className="font-bold">{m.authorName}</span>
                          {author?.blocked && <span className="text-danger">بلاک</span>}
                          <span>{m.createdAt}</span>
                        </div>
                        {editing?.id === m.id ? (
                          <form
                            className="space-y-1"
                            onSubmit={async (e) => {
                              e.preventDefault();
                              const res = await act(() => apiCall(`/api/chat/messages/${m.id}`, "PATCH", { body: editing.body }));
                              if (res.success) setEditing(null);
                            }}
                          >
                            <textarea className="input w-full text-xs" rows={2} value={editing.body} onChange={(e) => setEditing({ id: m.id, body: e.target.value })} />
                            <div className="flex gap-1 justify-end">
                              <button type="button" className="btn btn-ghost text-xs" onClick={() => setEditing(null)}>
                                انصراف
                              </button>
                              <button className="btn btn-primary text-xs" disabled={busy}>
                                ذخیره
                              </button>
                            </div>
                          </form>
                        ) : m.deleted ? (
                          <p className="italic text-text-subtle">
                            پیام حذف شد{perms.canModerate && m.body ? `: «${m.body}»` : ""}
                          </p>
                        ) : (
                          <p className="whitespace-pre-wrap leading-6">{m.body}</p>
                        )}
                        <div className="flex items-center gap-2 text-[10px] text-text-subtle">
                          {m.edited && <span>{m.editedByModerator ? "ویرایش توسط مدیر" : "ویرایش شده"}</span>}
                          {canEdit && editing?.id !== m.id && (
                            <span className="ms-auto flex gap-2 opacity-60 group-hover:opacity-100 transition">
                              <button type="button" className="hover:text-text-main" onClick={() => setEditing({ id: m.id, body: m.body })}>
                                ویرایش
                              </button>
                              <button
                                type="button"
                                className="hover:text-danger"
                                onClick={() => window.confirm("این پیام حذف شود؟") && act(() => apiCall(`/api/chat/messages/${m.id}`, "DELETE"))}
                              >
                                حذف
                              </button>
                              {perms.canModerate && !m.mine && (
                                <button
                                  type="button"
                                  className="hover:text-danger"
                                  onClick={() =>
                                    window.confirm(author?.blocked ? `بلاک ${m.authorName} برداشته شود؟` : `${m.authorName} در پیام‌ها بلاک شود؟ دیگر نمی‌تواند پیام بفرستد.`) &&
                                    act(() => apiCall(`/api/admin/users/${m.authorId}`, "PATCH", { chatBlocked: !author?.blocked })).then(() => router.refresh())
                                  }
                                >
                                  {author?.blocked ? "رفع بلاک" : "بلاک کاربر"}
                                </button>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {selected.isMember && !perms.blocked ? (
                <form onSubmit={send} className="p-3 border-t border-border-hairline flex gap-2">
                  <textarea
                    rows={1}
                    className="input flex-1 text-xs resize-none"
                    placeholder="پیام… (Enter ارسال، Shift+Enter خط جدید)"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send(e);
                      }
                    }}
                  />
                  <button className="btn btn-primary text-xs">ارسال</button>
                </form>
              ) : (
                <p className="p-3 border-t border-border-hairline text-center text-[11px] text-text-subtle">
                  {perms.blocked ? "شما بلاک هستید." : "شما عضو این گفتگو نیستید و فقط نظارت می‌کنید."}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {modal === "direct" && (
        <Modal title="گفتگوی خصوصی" onClose={() => setModal(null)}>
          <div className="space-y-1 max-h-80 overflow-y-auto">
            {people
              .filter((p) => p.id !== selfId)
              .map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="w-full text-right p-2 rounded-lg hover:bg-bg-subtle text-xs flex justify-between"
                  onClick={async () => {
                    const res = await apiCall<{ id: string }>("/api/chat/channels", "POST", { type: "DIRECT", userId: p.id });
                    if (res.success) {
                      setModal(null);
                      open(res.id);
                      router.refresh();
                    } else setNotice({ kind: "danger", text: res.error ?? "خطا" });
                  }}
                >
                  <span className="font-medium">{p.name}</span>
                  <span className="text-text-subtle">{p.roleNames}</span>
                </button>
              ))}
          </div>
        </Modal>
      )}

      {(modal === "group" || modal === "manage") && (
        <Modal title={modal === "group" ? "گروه جدید" : "مدیریت گروه"} onClose={() => setModal(null)}>
          <form
            className="space-y-3 text-xs"
            onSubmit={async (e) => {
              e.preventDefault();
              const res =
                modal === "group"
                  ? await apiCall<{ id: string }>("/api/chat/channels", "POST", { type: "GROUP", ...group })
                  : await apiCall<{ id: string }>(`/api/chat/channels/${selected!.id}`, "PATCH", group);
              if (res.success) {
                setModal(null);
                setGroup({ name: "", description: "", memberIds: [] });
                if (modal === "group" && res.id) open(res.id);
                router.refresh();
              } else setNotice({ kind: "danger", text: res.error ?? "خطا" });
            }}
          >
            <Field label="نام گروه">
              <input required className="input w-full" value={group.name} onChange={(e) => setGroup({ ...group, name: e.target.value })} />
            </Field>
            <Field label="توضیح">
              <input className="input w-full" value={group.description} onChange={(e) => setGroup({ ...group, description: e.target.value })} />
            </Field>
            <Field label="اعضا">
              <MembersPicker people={people} value={group.memberIds} onChange={(memberIds) => setGroup({ ...group, memberIds })} selfId={modal === "group" ? selfId : ""} />
            </Field>
            <div className="flex justify-end">
              <button className="btn btn-primary text-xs">{modal === "group" ? "ساخت گروه" : "ذخیره"}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
