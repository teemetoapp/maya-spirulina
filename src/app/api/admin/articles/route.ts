import { requireApi, logAudit } from "@/lib/rbac/server";
import { moduleGuard } from "@/lib/modules/server";
import { ok, fail, readJson, str } from "@/lib/api/respond";
import prisma from "@/lib/prisma";

// بلاگ و محتوای آموزشی: ایجاد/ویرایش (POST با id = ویرایش) و حذف
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

async function guard() {
  const auth = await requireApi("content.manage");
  if (auth instanceof Response) return auth;
  return (await moduleGuard("blog")) ?? auth;
}

export async function POST(req: Request) {
  const auth = await guard();
  if (auth instanceof Response) return auth;
  const b = await readJson(req);
  const id = str(b.id, 40);
  const slug = str(b.slug, 80).toLowerCase();
  const title = str(b.title, 160);
  const body = str(b.body, 50_000);
  const coverUrl = str(b.coverUrl, 300);
  if (!SLUG.test(slug)) return fail("نشانی (slug) فقط حروف انگلیسی کوچک، عدد و خط تیره.");
  if (!title || !body) return fail("عنوان و متن الزامی است.");
  if (coverUrl && !/^(https:\/\/|\/)/.test(coverUrl)) return fail("آدرس تصویر نامعتبر است.");
  const clash = await prisma.article.findUnique({ where: { slug } });
  if (clash && clash.id !== id) return fail("این نشانی قبلاً استفاده شده است.");

  const published = b.published === true;
  const prev = id ? await prisma.article.findUnique({ where: { id } }) : null;
  if (id && !prev) return fail("مقاله پیدا نشد.");
  const data = {
    slug,
    title,
    body,
    excerpt: str(b.excerpt, 300) || null,
    category: str(b.category, 40) || "آموزش",
    coverUrl: coverUrl || null,
    sources: str(b.sources, 5000) || null,
    published,
    publishedAt: published ? (prev?.publishedAt ?? new Date()) : null,
  };
  const saved = prev
    ? await prisma.article.update({ where: { id }, data })
    : await prisma.article.create({ data: { ...data, authorId: auth.userId } });
  await logAudit(auth.userId, prev ? "article.update" : "article.create", saved.slug, { published });
  return ok({ id: saved.id }, published ? "مقاله منتشر شد." : "پیش‌نویس ذخیره شد.");
}

export async function DELETE(req: Request) {
  const auth = await guard();
  if (auth instanceof Response) return auth;
  const id = str((await readJson(req)).id, 40);
  const a = await prisma.article.delete({ where: { id } }).catch(() => null);
  if (!a) return fail("مقاله پیدا نشد.");
  await logAudit(auth.userId, "article.delete", a.slug, {});
  return ok({}, "مقاله حذف شد.");
}
