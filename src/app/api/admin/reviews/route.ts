import { requireApi, logAudit } from "@/lib/rbac/server";
import { moduleGuard } from "@/lib/modules/server";
import { ok, fail, readJson, str } from "@/lib/api/respond";
import prisma from "@/lib/prisma";

// تأیید یا رد نظر برای نمایش در سایت، و پاسخ برند
export async function PATCH(req: Request) {
  const auth = await requireApi("content.manage", "tickets.manage");
  if (auth instanceof Response) return auth;
  const off = await moduleGuard("reviews");
  if (off) return off;
  const b = await readJson(req);
  const status = str(b.status, 10);
  if (status && !["APPROVED", "REJECTED", "PENDING"].includes(status)) return fail("وضعیت نامعتبر است.");
  const review = await prisma.review.update({
    where: { id: str(b.id, 40) },
    data: { ...(status ? { status: status as "APPROVED" | "REJECTED" | "PENDING" } : {}), ...(typeof b.reply === "string" ? { reply: str(b.reply, 500) || null } : {}) },
  });
  await logAudit(auth.userId, "review.moderate", review.id, { status, reply: b.reply ?? null });
  return ok({}, "نظر به‌روز شد.");
}
