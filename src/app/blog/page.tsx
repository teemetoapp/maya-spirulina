import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import StorePage from "@/components/storefront/StorePage";
import { isModuleEnabled } from "@/lib/modules/server";
import { loadPublishedArticles } from "@/lib/content/articles";
import { formatJalaliShort } from "@/lib/jalali";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "بلاگ و راهنمای مصرف اسپیرولینا | مایا اسپیرولینا",
  description: "دستور مصرف، راهنمای خرید و مقاله‌های آموزشی درباره اسپیرولینا، از مزرعه آفرینش مایا.",
  alternates: { canonical: "/blog" },
};

export default async function BlogIndexPage() {
  if (!(await isModuleEnabled("blog"))) notFound();
  const articles = await loadPublishedArticles();
  return (
    <StorePage>
      <section className="max-w-4xl mx-auto px-4 py-12 space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-black">بلاگ و راهنمای مصرف</h1>
          <p className="text-sm text-text-muted">
            مقاله‌های آموزشی و دستور مصرف. مرور پژوهش‌های علمی در <Link href="/research" className="underline">مقالات و پژوهش‌ها</Link> است.
          </p>
        </header>
        {articles.length === 0 ? (
          <p className="text-sm text-text-muted">به‌زودی اولین مقاله‌ها منتشر می‌شود.</p>
        ) : (
          <ul className="grid sm:grid-cols-2 gap-4">
            {articles.map((a) => (
              <li key={a.slug} className="studio-card p-5 space-y-2">
                <p className="text-[11px] text-text-muted">
                  {a.category} · {a.publishedAt ? formatJalaliShort(a.publishedAt) : ""}
                </p>
                <h2 className="font-bold leading-7">
                  <Link href={`/blog/${a.slug}`} className="hover:underline">{a.title}</Link>
                </h2>
                {a.excerpt && <p className="text-xs text-text-muted leading-6">{a.excerpt}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </StorePage>
  );
}
