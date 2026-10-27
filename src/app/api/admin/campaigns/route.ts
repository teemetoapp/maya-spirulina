import { requireApi, logAudit } from "@/lib/rbac/server";
import { moduleGuard } from "@/lib/modules/server";
import { ok, fail, readJson, str } from "@/lib/api/respond";
import { AUDIENCES, audienceUsers, sendCampaign } from "@/lib/marketing/campaigns";

// GET ?audience=… تعداد گیرندگان (فقط دارندگان رضایت) — POST ارسال کمپین
export async function GET(req: Request) {
  const auth = await requireApi("marketing.manage");
  if (auth instanceof Response) return auth;
  const off = await moduleGuard("campaigns");
  if (off) return off;
  const audience = new URL(req.url).searchParams.get("audience") ?? "all";
  if (!AUDIENCES[audience]) return fail("گروه نامعتبر است.");
  return ok({ count: (await audienceUsers(audience)).length });
}

export async function POST(req: Request) {
  const auth = await requireApi("marketing.manage");
  if (auth instanceof Response) return auth;
  const off = await moduleGuard("campaigns");
  if (off) return off;
  const b = await readJson(req);
  const title = str(b.title, 80);
  const body = str(b.body, 300);
  const audience = str(b.audience, 40);
  if (!title || !body) return fail("عنوان و متن پیامک را بنویسید.");
  if (!AUDIENCES[audience]) return fail("گروه نامعتبر است.");
  const campaign = await sendCampaign({ title, body, audience, actorId: auth.userId });
  await logAudit(auth.userId, "campaign.send", campaign.id, { audience, recipients: campaign.recipients });
  return ok({ recipients: campaign.recipients }, campaign.recipients ? `کمپین برای ${campaign.recipients.toLocaleString("fa-IR")} نفر در صف ارسال قرار گرفت.` : "هیچ گیرنده‌ای با رضایت پیامک در این گروه نیست.");
}
