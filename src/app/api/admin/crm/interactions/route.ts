import { requireApi, logAudit } from "@/lib/rbac/server";
import { ok, fail, readJson, str, int } from "@/lib/api/respond";
import prisma from "@/lib/prisma";
import { moduleGuard } from "@/lib/modules/server";
import { CHANNEL_LABELS, TOPIC_LABELS, SENTIMENT_LABELS, STAGE_LABELS } from "@/lib/crm/insight";

// Log a call / message / visit with a contact, its sentiment and topic,
// and optionally a follow-up reminder. PATCH marks a follow-up done or
// moves it.

const DAY = 86_400_000;
const pick = <T extends Record<string, string>>(labels: T, v: unknown, fallback: keyof T | null) => {
  const k = str(v, 20);
  return (Object.hasOwn(labels, k) ? k : fallback) as keyof T | null;
};

export async function POST(req: Request) {
  const off = await moduleGuard("crm");
  if (off) return off;
  const auth = await requireApi("crm.followup", "users.manage");
  if (auth instanceof Response) return auth;
  const b = await readJson(req);
  const contact = await prisma.user.findUnique({ where: { id: str(b.contactId, 40) }, select: { id: true, phone: true, ownerId: true } });
  if (!contact) return fail("مخاطب پیدا نشد.", 404);
  const summary = str(b.summary, 2000);
  if (!summary) return fail("خلاصه تماس یا یادداشت را بنویسید.");
  const days = int(b.followUpDays);
  if (days !== null && (days < 0 || days > 365)) return fail("زمان پیگیری نامعتبر است.");
  const stage = pick(STAGE_LABELS, b.leadStage, null);

  await prisma.$transaction([
    prisma.contactInteraction.create({
      data: {
        contactId: contact.id,
        authorId: auth.userId,
        channel: pick(CHANNEL_LABELS, b.channel, "CALL")!,
        summary,
        sentiment: pick(SENTIMENT_LABELS, b.sentiment, "NEUTRAL")!,
        topic: pick(TOPIC_LABELS, b.topic, null),
        followUpAt: days ? new Date(Date.now() + days * DAY) : null,
      },
    }),
    // مرحله قیف و مسئول (اگر هنوز کسی مسئول نیست، ثبت‌کننده مسئول می‌شود)
    prisma.user.update({
      where: { id: contact.id },
      data: { ...(stage ? { leadStage: stage } : {}), ...(contact.ownerId ? {} : { ownerId: auth.userId }) },
    }),
  ]);
  await logAudit(auth.userId, "crm.interaction", contact.id, { followUpDays: days, stage });
  return ok({}, days ? "ثبت شد و یادآوری پیگیری تنظیم شد." : "ارتباط ثبت شد.");
}

export async function PATCH(req: Request) {
  const off = await moduleGuard("crm");
  if (off) return off;
  const auth = await requireApi("crm.followup", "users.manage");
  if (auth instanceof Response) return auth;
  const b = await readJson(req);
  const row = await prisma.contactInteraction.findUnique({ where: { id: str(b.id, 40) } });
  if (!row) return fail("مورد پیدا نشد.", 404);
  const days = int(b.postponeDays);
  if (days !== null) {
    if (days < 1 || days > 365) return fail("زمان تعویق نامعتبر است.");
    await prisma.contactInteraction.update({ where: { id: row.id }, data: { followUpAt: new Date(Date.now() + days * DAY), followUpDone: false } });
    return ok({}, "پیگیری به تعویق افتاد.");
  }
  await prisma.contactInteraction.update({ where: { id: row.id }, data: { followUpDone: b.done !== false } });
  return ok({}, b.done === false ? "پیگیری دوباره باز شد." : "پیگیری انجام‌شده علامت خورد.");
}
