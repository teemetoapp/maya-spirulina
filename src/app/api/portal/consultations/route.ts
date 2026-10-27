import { requireApi } from "@/lib/rbac/server";
import { ok, fail, readJson, str, int } from "@/lib/api/respond";
import prisma from "@/lib/prisma";
import { notify } from "@/lib/notifications";
import { moduleGuard } from "@/lib/modules/server";
import { CONSULT_GOALS, consultEligibility } from "@/lib/consult";
import { toEnglishDigits, toPersianDigits } from "@/lib/currency";

// Customer submits a nutrition consultation request (intake form)
export async function POST(req: Request) {
  const auth = await requireApi("portal.customer");
  if (auth instanceof Response) return auth;
  const off = await moduleGuard("consultation");
  if (off) return off;

  const eligibility = await consultEligibility(auth.userId);
  if (!eligibility.canRequest) return fail(eligibility.reason ?? "امکان ثبت درخواست نیست.");

  const b = await readJson(req);
  const goal = str(b.goal, 60);
  if (!(CONSULT_GOALS as readonly string[]).includes(goal)) return fail("هدف مشاوره را انتخاب کنید.");
  const question = str(b.question, 3000);
  if (question.length < 10) return fail("سؤال یا توضیح خود را کامل‌تر بنویسید.");
  const num = (v: unknown, min: number, max: number) => {
    const n = int(typeof v === "string" ? toEnglishDigits(v) : v);
    return n !== null && n >= min && n <= max ? n : null;
  };
  const age = num(b.age, 5, 110);
  const weight = num(b.weight, 15, 300);
  const height = num(b.height, 80, 250);
  const conditions = str(b.conditions, 500);
  const medications = str(b.medications, 500);

  const lines = [
    `هدف: ${goal}`,
    age !== null ? `سن: ${toPersianDigits(age)} سال` : null,
    weight !== null ? `وزن: ${toPersianDigits(weight)} کیلوگرم` : null,
    height !== null ? `قد: ${toPersianDigits(height)} سانتی‌متر` : null,
    `بیماری یا شرایط خاص: ${conditions || "ندارد"}`,
    `داروهای مصرفی: ${medications || "ندارد"}`,
    "",
    question,
  ].filter((l) => l !== null);

  const ticket = await prisma.supportTicket.create({
    data: {
      userId: auth.userId,
      kind: "CONSULTATION",
      subject: `مشاوره: ${goal}`,
      messages: { create: { authorId: auth.userId, body: lines.join("\n") } },
    },
  });
  await notify("consult.created", { data: { subject: goal, customer: auth.name ?? auth.phone } });
  return ok(
    { id: ticket.id },
    `درخواست شما ثبت شد. مشاور تغذیه حداکثر ظرف ${toPersianDigits(eligibility.responseHours)} ساعت پاسخ می‌دهد.`
  );
}
