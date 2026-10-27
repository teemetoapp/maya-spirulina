import prisma from "@/lib/prisma";

export interface ArticleAdmin {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  category: string;
  coverUrl: string;
  sources: string;
  published: boolean;
  publishedAt: string | null;
  updatedAt: string;
}

export async function loadArticlesAdmin(): Promise<ArticleAdmin[]> {
  const rows = await prisma.article.findMany({ orderBy: { updatedAt: "desc" }, take: 300 });
  return rows.map((a) => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    excerpt: a.excerpt ?? "",
    body: a.body,
    category: a.category,
    coverUrl: a.coverUrl ?? "",
    sources: a.sources ?? "",
    published: a.published,
    publishedAt: a.publishedAt?.toISOString() ?? null,
    updatedAt: a.updatedAt.toISOString(),
  }));
}

export function loadPublishedArticles() {
  return prisma.article.findMany({
    where: { published: true },
    orderBy: { publishedAt: "desc" },
    select: { slug: true, title: true, excerpt: true, category: true, coverUrl: true, publishedAt: true, updatedAt: true },
  });
}

export function getPublishedArticle(slug: string) {
  return prisma.article.findFirst({ where: { slug, published: true } });
}

// متن ساده → بلوک‌ها: خط خالی = پاراگراف جدید، «## » = زیرعنوان، «- » = فهرست
export type Block = { kind: "h2" | "p"; text: string } | { kind: "ul"; items: string[] };

export function parseBody(body: string): Block[] {
  return body
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk): Block => {
      if (chunk.startsWith("## ")) return { kind: "h2", text: chunk.slice(3).trim() };
      const lines = chunk.split("\n");
      if (lines.every((l) => l.trim().startsWith("- "))) return { kind: "ul", items: lines.map((l) => l.trim().slice(2)) };
      return { kind: "p", text: chunk };
    });
}
