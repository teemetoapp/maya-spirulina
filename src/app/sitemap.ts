import type { MetadataRoute } from "next";
import { getModuleStates } from "@/lib/modules/server";
import { loadPublishedArticles } from "@/lib/content/articles";
import { ARTICLES_DATA } from "@/data/articles";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
  const m = await getModuleStates();
  const pages = ["/", "/research", "/club-rules", ...(m.wholesale ? ["/wholesale"] : []), ...(m.blog ? ["/blog"] : [])];
  const articles = m.blog ? await loadPublishedArticles() : [];
  return [
    ...pages.map((p) => ({ url: `${base}${p}` })),
    ...ARTICLES_DATA.map((a) => ({ url: `${base}/research/${a.slug}` })),
    ...articles.map((a) => ({ url: `${base}/blog/${a.slug}`, lastModified: a.updatedAt })),
  ];
}
