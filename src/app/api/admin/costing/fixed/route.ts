import { requireApi, logAudit } from "@/lib/rbac/server";
import { ok, fail, readJson, str, int } from "@/lib/api/respond";
import prisma from "@/lib/prisma";
import { FIXED_COST_LABELS, type FixedCostCategoryKey } from "@/lib/costing/pricing";
import { recomputeCosts } from "@/lib/costing/engine";

// Monthly fixed costs (salaries, rent, utilities…) spread over every unit produced

function parse(b: Record<string, unknown>) {
  const title = str(b.title, 80);
  const monthlyAmount = int(b.monthlyAmount);
  const cat = str(b.category, 20);
  if (!title) return { error: "عنوان هزینه ثابت را وارد کنید." };
  if (monthlyAmount === null || monthlyAmount < 0) return { error: "مبلغ ماهانه نامعتبر است." };
  return {
    data: {
      title,
      monthlyAmount,
      category: (Object.hasOwn(FIXED_COST_LABELS, cat) ? cat : "OTHER") as FixedCostCategoryKey,
      isActive: b.isActive !== false,
      note: str(b.note, 200) || null,
    },
  };
}

export async function POST(req: Request) {
  const auth = await requireApi("costing.manage");
  if (auth instanceof Response) return auth;
  const p = parse(await readJson(req));
  if ("error" in p) return fail(p.error!);
  const row = await prisma.fixedCost.create({ data: p.data! });
  await recomputeCosts();
  await logAudit(auth.userId, "costing.fixed_create", row.title, { monthly: row.monthlyAmount });
  return ok({ id: row.id }, "هزینه ثابت اضافه شد و سهم آن در بهای همه بسته‌ها لحاظ شد.");
}

export async function PUT(req: Request) {
  const auth = await requireApi("costing.manage");
  if (auth instanceof Response) return auth;
  const b = await readJson(req);
  const id = str(b.id, 40);
  const before = await prisma.fixedCost.findUnique({ where: { id } });
  if (!before) return fail("هزینه پیدا نشد.", 404);
  const p = parse(b);
  if ("error" in p) return fail(p.error!);
  await prisma.fixedCost.update({ where: { id }, data: p.data! });
  await recomputeCosts();
  await logAudit(auth.userId, "costing.fixed_update", before.title, { from: before.monthlyAmount, to: p.data!.monthlyAmount, active: p.data!.isActive });
  return ok({}, "هزینه ثابت ذخیره شد و بهای بسته‌ها به‌روز شد.");
}

export async function DELETE(req: Request) {
  const auth = await requireApi("costing.manage");
  if (auth instanceof Response) return auth;
  const id = str((await readJson(req)).id, 40);
  const row = await prisma.fixedCost.findUnique({ where: { id } });
  if (!row) return fail("هزینه پیدا نشد.", 404);
  await prisma.fixedCost.delete({ where: { id } });
  await recomputeCosts();
  await logAudit(auth.userId, "costing.fixed_delete", row.title);
  return ok({}, "هزینه ثابت حذف شد.");
}
