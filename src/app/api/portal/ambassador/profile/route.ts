import { requireApi } from "@/lib/rbac/server";
import { ok, fail, readJson, str } from "@/lib/api/respond";
import prisma from "@/lib/prisma";

// Ambassador sets the short slug used in /ref/<slug>
export async function PATCH(req: Request) {
  const auth = await requireApi("portal.ambassador");
  if (auth instanceof Response) return auth;
  const slug = str((await readJson(req)).slug, 40).toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{2,38}[a-z0-9]$/.test(slug)) {
    return fail("آدرس باید ۴ تا ۴۰ حرف انگلیسی کوچک، عدد یا خط تیره باشد.");
  }
  const taken = await prisma.user.findFirst({ where: { ambassadorSlug: slug, NOT: { id: auth.userId } } });
  if (taken) return fail("این آدرس قبلاً انتخاب شده است.");
  await prisma.user.update({ where: { id: auth.userId }, data: { ambassadorSlug: slug } });
  return ok({}, "آدرس لینک معرفی ذخیره شد.");
}
