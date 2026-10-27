"use client";

import { useState } from "react";
import type { ArticleAdmin } from "@/lib/content/articles";
import { PageTitle, Table, Td, EmptyState, Field, MutationNotice, useMutation, apiCall, Notice } from "@/components/portal/ui";
import { formatJalaliShort } from "@/lib/jalali";

// بلاگ و محتوای آموزشی (دستور مصرف، راهنما). متن ساده:
// خط خالی = پاراگراف، «## » = زیرعنوان، «- » = فهرست

const EMPTY = { id: "", slug: "", title: "", excerpt: "", body: "", category: "آموزش", coverUrl: "", sources: "", published: false };
type Draft = typeof EMPTY;

export default function ArticlesAdmin({ articles }: { articles: ArticleAdmin[] }) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const { run, busy, notice } = useMutation();
  const set = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  if (draft) {
    return (
      <div className="space-y-5">
        <PageTitle title={draft.id ? "ویرایش مقاله" : "مقاله جدید"} action={<button type="button" className="btn btn-outline text-xs" onClick={() => setDraft(null)}>بازگشت به فهرست</button>} />
        <form
          className="studio-card p-5 space-y-3 text-xs max-w-3xl"
          onSubmit={async (e) => {
            e.preventDefault();
            const res = (await run(() => apiCall("/api/admin/articles", "POST", draft))) as { success: boolean; id?: string };
            if (res.success && res.id) set({ id: res.id });
          }}
        >
          <MutationNotice notice={notice} />
          <Notice kind="info">ادعای درمانی ننویسید؛ اسپیرولینا مکمل غذایی است. هر عدد یا یافته علمی باید منبع داشته باشد.</Notice>
          <Field label="عنوان"><input required maxLength={160} className="input w-full" value={draft.title} onChange={(e) => set({ title: e.target.value })} /></Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="نشانی (انگلیسی، مثلاً spirulina-dosage)"><input required dir="ltr" pattern="[a-z0-9]+(-[a-z0-9]+)*" className="input w-full font-mono" value={draft.slug} onChange={(e) => set({ slug: e.target.value.toLowerCase() })} /></Field>
            <Field label="دسته"><input maxLength={40} className="input w-full" value={draft.category} onChange={(e) => set({ category: e.target.value })} placeholder="آموزش، دستور مصرف، علمی" /></Field>
          </div>
          <Field label="خلاصه (فهرست و گوگل)"><textarea maxLength={300} rows={2} className="input w-full" value={draft.excerpt} onChange={(e) => set({ excerpt: e.target.value })} /></Field>
          <Field label="متن (خط خالی = پاراگراف، ## = زیرعنوان، - = فهرست)"><textarea required rows={16} className="input w-full leading-7" value={draft.body} onChange={(e) => set({ body: e.target.value })} /></Field>
          <Field label="منابع (هر خط یک منبع)"><textarea rows={3} className="input w-full" value={draft.sources} onChange={(e) => set({ sources: e.target.value })} /></Field>
          <Field label="تصویر کاور (اختیاری)"><input dir="ltr" className="input w-full font-mono" value={draft.coverUrl} onChange={(e) => set({ coverUrl: e.target.value })} placeholder="/images/..." /></Field>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={draft.published} onChange={(e) => set({ published: e.target.checked })} />
            منتشر شود
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className="btn btn-primary text-xs">ذخیره</button>
            {draft.id && draft.published && <a href={`/blog/${draft.slug}`} target="_blank" rel="noreferrer" className="btn btn-outline text-xs">مشاهده در سایت</a>}
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageTitle title="بلاگ و محتوای آموزشی" subtitle="مقاله‌ها در /blog منتشر و در نقشه سایت برای گوگل ثبت می‌شوند." action={<button type="button" className="btn btn-primary text-xs" onClick={() => setDraft({ ...EMPTY })}>مقاله جدید</button>} />
      <MutationNotice notice={notice} />
      {articles.length === 0 ? (
        <EmptyState text="هنوز مقاله‌ای نوشته نشده است." />
      ) : (
        <Table head={["عنوان", "دسته", "وضعیت", "آخرین تغییر", ""]}>
          {articles.map((a) => (
            <tr key={a.id}>
              <Td>{a.title}</Td>
              <Td>{a.category}</Td>
              <Td>
                <span className={`badge-status ${a.published ? "badge-status-success" : "badge-status-warning"}`}>{a.published ? "منتشر شده" : "پیش‌نویس"}</span>
              </Td>
              <Td>{formatJalaliShort(a.updatedAt)}</Td>
              <Td>
                <div className="flex gap-2">
                  <button type="button" className="btn btn-outline text-xs" onClick={() => setDraft({ id: a.id, slug: a.slug, title: a.title, excerpt: a.excerpt, body: a.body, category: a.category, coverUrl: a.coverUrl, sources: a.sources, published: a.published })}>ویرایش</button>
                  <button
                    type="button"
                    className="btn btn-outline text-xs"
                    disabled={busy}
                    onClick={() => window.confirm(`«${a.title}» حذف شود؟`) && run(() => apiCall("/api/admin/articles", "DELETE", { id: a.id }))}
                  >
                    حذف
                  </button>
                </div>
              </Td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
