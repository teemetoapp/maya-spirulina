import Link from "next/link";
import Section from "./Section";
import { loadPublishedArticles } from "@/lib/content/articles";

export default async function LatestArticles() {
  const articles = (await loadPublishedArticles()).slice(0, 3);
  if (articles.length === 0) return null;
  return (
    <Section title="از بلاگ مایا">
      <ul className="grid gap-4 md:grid-cols-3">
        {articles.map((a) => (
          <li key={a.slug} className="rounded-2xl border border-border-hairline bg-bg-card p-6 space-y-2">
            <p className="text-xs text-accent-deep dark:text-accent-primary font-bold">{a.category}</p>
            <h3 className="font-bold leading-7 text-text-main"><Link href={`/blog/${a.slug}`} className="hover:underline">{a.title}</Link></h3>
            {a.excerpt && <p className="text-sm leading-7 text-text-muted line-clamp-3">{a.excerpt}</p>}
          </li>
        ))}
      </ul>
      <div className="mt-8 text-center"><Link href="/blog" className="btn btn-outline px-5 py-2.5 text-sm">همه مقاله‌ها</Link></div>
    </Section>
  );
}
