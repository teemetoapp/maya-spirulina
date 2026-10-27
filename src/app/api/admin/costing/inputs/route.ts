import { requireApi, logAudit } from "@/lib/rbac/server";
import { ok, fail, readJson, str, int } from "@/lib/api/respond";
import { toPersianDigits } from "@/lib/currency";
import prisma from "@/lib/prisma";
import { COST_CATEGORY_LABELS, type CostCategoryKey } from "@/lib/portal/costing";
import { recomputeCosts } from "@/lib/costing/engine";

// Shared resource prices (water, power, powder, capsules…). Changing a price
// re-prices every cost sheet row linked to it.

function parse(b: Record<string, unknown>) {
  const title = str(b.title, 60);
  const unit = str(b.unit, 20);
  const price = int(b.price);
  const cat = str(b.category, 20);
  if (!title || !unit) return { error: "عنوان و واحد منبع را وارد کنید." };
  if (price === null || price < 0) return { error: "نرخ منبع نامعتبر است." };
  return {
    data: {
      title,
      unit,
      price,
      category: (Object.hasOwn(COST_CATEGORY_LABELS, cat) ? cat : "OTHER") as CostCategoryKey,
      note: str(b.note, 200) || null,
    },
  };
}

export async function POST(req: Request) {
  const auth = await requireApi("costing.manage");
  if (auth instanceof Response) return auth;
  const p = parse(await readJson(req));
  if ("error" in p) return fail(p.error!);
  const input = await prisma.costInput.create({ data: p.data! });
  await logAudit(auth.userId, "costing.input_create", input.title, { price: input.price });
  return ok({ id: input.id }, "منبع اضافه شد.");
}

export async function PUT(req: Request) {
  const auth = await requireApi("costing.manage");
  if (auth instanceof Response) return auth;
  const b = await readJson(req);
  const id = str(b.id, 40);
  const before = await prisma.costInput.findUnique({ where: { id }, include: { items: { select: { variantId: true } } } });
  if (!before) return fail("منبع پیدا نشد.", 404);
  const p = parse(b);
  if ("error" in p) return fail(p.error!);
  await prisma.costInput.update({ where: { id }, data: p.data! });
  const affected = [...new Set(before.items.map((i) => i.variantId))];
  if (affected.length) await recomputeCosts(affected);
  await logAudit(auth.userId, "costing.input_update", before.title, { from: before.price, to: p.data!.price, variants: affected.length });
  return ok({}, affected.length ? `نرخ ذخیره شد و بهای ${toPersianDigits(affected.length)} بسته به‌روز شد.` : "نرخ ذخیره شد.");
}

export async function DELETE(req: Request) {
  const auth = await requireApi("costing.manage");
  if (auth instanceof Response) return auth;
  const id = str((await readJson(req)).id, 40);
  const input = await prisma.costInput.findUnique({ where: { id }, include: { _count: { select: { items: true } } } });
  if (!input) return fail("منبع پیدا نشد.", 404);
  // ردیف‌های متصل با آخرین نرخ به‌صورت دستی باقی می‌مانند
  await prisma.costInput.delete({ where: { id } });
  await logAudit(auth.userId, "costing.input_delete", input.title);
  return ok({}, input._count.items ? "منبع حذف شد؛ ردیف‌های متصل با آخرین نرخ ثابت ماندند." : "منبع حذف شد.");
}
