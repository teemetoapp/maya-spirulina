import { requireApi, logAudit } from "@/lib/rbac/server";
import { ok, fail, readJson, str, int } from "@/lib/api/respond";
import prisma from "@/lib/prisma";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/portal/labels";
import { parseJalaliDate } from "@/lib/jalali";

type Category = keyof typeof EXPENSE_CATEGORY_LABELS;

// Operating expenses (rent, ads, salaries, …) feed the net-profit report
export async function POST(req: Request) {
  const auth = await requireApi("finance.manage");
  if (auth instanceof Response) return auth;
  const b = await readJson(req);
  const title = str(b.title, 120);
  const amount = int(b.amount) ?? 0;
  const rawCategory = str(b.category, 20);
  const category = (Object.hasOwn(EXPENSE_CATEGORY_LABELS, rawCategory) ? rawCategory : "OTHER") as Category;
  const dateStr = str(b.spentAt, 20);
  const spentAt = dateStr ? parseJalaliDate(dateStr) : new Date();
  if (!title) return fail("عنوان هزینه را وارد کنید.");
  if (amount <= 0) return fail("مبلغ باید بیشتر از صفر باشد.");
  if (!spentAt || spentAt.getTime() > Date.now() + 86_400_000) return fail("تاریخ را به شکل ۱۴۰۵/۰۸/۰۴ وارد کنید (آینده مجاز نیست).");
  const e = await prisma.expense.create({
    data: { title, amount, category, spentAt, note: str(b.note, 500) || null, createdById: auth.userId },
  });
  await logAudit(auth.userId, "expense.create", e.id, { title, amount, category });
  return ok({}, "هزینه ثبت شد.");
}

export async function DELETE(req: Request) {
  const auth = await requireApi("finance.manage");
  if (auth instanceof Response) return auth;
  const id = str((await readJson(req)).id, 40);
  const e = await prisma.expense.findUnique({ where: { id } });
  if (!e) return fail("هزینه پیدا نشد.", 404);
  await prisma.expense.delete({ where: { id } });
  await logAudit(auth.userId, "expense.delete", id, { title: e.title, amount: e.amount });
  return ok({}, "هزینه حذف شد.");
}
