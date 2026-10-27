import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import StorePage from "@/components/storefront/StorePage";
import { isModuleEnabled } from "@/lib/modules/server";
import { getPublishedArticle, parseBody } from "@/lib/content/articles";
import { formatJalaliShort } from "@/lib/jalali";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const a = await getPublishedArticle((await params).slug);
  if (!a) return {};
  return {
    title: `${a.title} | مایا اسپیرولینا`,
    description: a.excerpt ?? undefined,
    alternates: { canonical: `/blog/${a.slug}` },
    openGraph: { type: "article", title: a.title, description: a.excerpt ?? undefined, images: a.coverUrl ? [a.coverUrl] : undefined },
  };
}

export default async function BlogArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const article = (await isModuleEnabled("blog")) ? await getPublishedArticle(slug) : null;
  // لینک‌های قدیمی /blog/<slug> به مرور پژوهش‌ها می‌رفتند
  if (!article) redirect(`/research/${encodeURIComponent(slug)}`);
  const sources = (article.sources ?? "").split("\n").map((s) => s.trim()).filter(Boolean);

  return (
    <StorePage>
      <article className="max-w-3xl mx-auto px-4 py-12 space-y-6 text-sm leading-8">
        <nav className="text-xs text-text-muted">
          <Link href="/blog" className="underline">بلاگ</Link> / {article.category}
        </nav>
        <header className="space-y-2">
          <h1 className="text-2xl font-black leading-10">{article.title}</h1>
          {article.publishedAt && <p className="text-xs text-text-muted">{formatJalaliShort(article.publishedAt)}</p>}
        </header>
        {article.coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={article.coverUrl} alt="" className="w-full rounded-2xl" />
        )}
        {parseBody(article.body).map((b, i) =>
          b.kind === "h2" ? (
            <h2 key={i} className="text-lg font-bold pt-2">{b.text}</h2>
          ) : b.kind === "ul" ? (
            <ul key={i} className="list-disc pr-5 space-y-1">
              {b.items.map((t, j) => <li key={j}>{t}</li>)}
            </ul>
          ) : (
            <p key={i} className="whitespace-pre-line">{b.text}</p>
          )
        )}
        {sources.length > 0 && (
          <section className="border-t border-border-subtle pt-4 space-y-2">
            <h2 className="font-bold">منابع</h2>
            <ol className="list-decimal pr-5 text-xs space-y-1" dir="auto">
              {sources.map((s, i) => <li key={i}>{s}</li>)}
            </ol>
          </section>
        )}
        <p className="text-xs text-text-muted border-t border-border-subtle pt-4">اسپیرولینا مکمل غذایی است و جایگزین دارو یا درمان نیست. در صورت بیماری یا مصرف دارو، پیش از مصرف با پزشک مشورت کنید.</p>
      </article>
    </StorePage>
  );
}
