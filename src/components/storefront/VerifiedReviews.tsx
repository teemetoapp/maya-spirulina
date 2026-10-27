import { loadPublicReviews } from "@/lib/portal/reviews";
import { isModuleEnabled } from "@/lib/modules/server";
import { formatJalaliShort } from "@/lib/jalali";

// نظر خریداران واقعی؛ فقط نظرهایی که خریدار اجازه انتشار داده و تأیید شده‌اند. بدون نظر، بخش نمایش داده نمی‌شود.
export default async function VerifiedReviews() {
  if (!(await isModuleEnabled("reviews"))) return null;
  const reviews = await loadPublicReviews();
  if (reviews.length === 0) return null;
  return (
    <section id="reviews" className="max-w-6xl mx-auto px-4 py-16 space-y-6" dir="rtl">
      <h2 className="text-2xl font-black text-center">نظر خریداران</h2>
      <p className="text-center text-sm text-neutral-500">فقط کسانی که خرید کرده‌اند و سفارششان تحویل شده می‌توانند نظر بدهند.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reviews.map((r) => (
          <figure key={r.id} className="rounded-2xl border border-neutral-200 dark:border-white/10 p-5 space-y-3 bg-white dark:bg-bg-card">
            <div className="flex items-center justify-between text-xs">
              <span className="text-brand-gold text-base" aria-label={`${r.rating} از ۵`}>{"★".repeat(r.rating)}</span>
              <span className="rounded-full bg-accent-soft text-accent-primary px-2 py-0.5 font-bold">خرید تأییدشده</span>
            </div>
            <blockquote className="text-sm leading-7 whitespace-pre-wrap">{r.body}</blockquote>
            <figcaption className="text-[11px] text-neutral-500">
              {r.name}
              {r.product && ` · ${r.product}`} · {formatJalaliShort(r.at)}
            </figcaption>
            {r.reply && <p className="text-xs border-r-2 border-accent-primary pr-2 text-neutral-600 dark:text-neutral-300">پاسخ مایا: {r.reply}</p>}
          </figure>
        ))}
      </div>
    </section>
  );
}
