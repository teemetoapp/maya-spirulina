import { requireApi, logAudit } from "@/lib/rbac/server";
import { ok, fail, readJson, str, int } from "@/lib/api/respond";
import prisma from "@/lib/prisma";
import { toPersianDigits } from "@/lib/currency";
import { COST_CATEGORY_LABELS, type CostCategoryKey } from "@/lib/portal/costing";
import { recomputeCosts } from "@/lib/costing/engine";

// Replace the cost sheet (formula) of one variant and recompute its cost
export async function PUT(req: Request) {
  const auth = await requireApi("costing.manage");
  if (auth instanceof Response) return auth;
  const b = await readJson(req);
  const variantId = str(b.variantId, 40);
  const variant = await prisma.productVariant.findUnique({ where: { id: variantId } });
  if (!variant) return fail("بسته پیدا نشد.", 404);
  if (!Array.isArray(b.items)) return fail("اقلام هزینه ارسال نشد.");
  if (b.items.length > 60) return fail("حداکثر ۶۰ ردیف هزینه.");

  const overheadUnits = typeof b.overheadUnits === "number" ? b.overheadUnits : Number(b.overheadUnits ?? variant.overheadUnits);
  if (!Number.isFinite(overheadUnits) || overheadUnits < 0 || overheadUnits > 1000) return fail("سهم سربار نامعتبر است.");

  const inputs = await prisma.costInput.findMany({ select: { id: true, price: true } });
  const items = [];
  for (const [i, raw] of (b.items as Record<string, unknown>[]).entries()) {
    const row = toPersianDigits(i + 1);
    const title = str(raw.title, 80);
    const quantity = typeof raw.quantity === "number" ? raw.quantity : Number(raw.quantity);
    const inputId = str(raw.inputId, 40) || null;
    const input = inputId ? inputs.find((x) => x.id === inputId) : null;
    if (inputId && !input) return fail(`ردیف ${row}: منبع انتخاب‌شده پیدا نشد.`);
    const unitCost = input ? input.price : (int(raw.unitCost) ?? -1);
    const cat = str(raw.category, 20);
    if (!title) return fail(`ردیف ${row}: عنوان را وارد کنید.`);
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 1000000) return fail(`ردیف ${row}: مقدار نامعتبر است.`);
    if (unitCost < 0) return fail(`ردیف ${row}: هزینه واحد نامعتبر است.`);
    items.push({
      variantId,
      title,
      category: (Object.hasOwn(COST_CATEGORY_LABELS, cat) ? cat : "OTHER") as CostCategoryKey,
      quantity,
      unitCost,
      inputId,
      note: str(raw.note, 200) || null,
      sortOrder: i,
    });
  }

  await prisma.$transaction([
    prisma.variantCostItem.deleteMany({ where: { variantId } }),
    prisma.variantCostItem.createMany({ data: items }),
    prisma.productVariant.update({ where: { id: variantId }, data: { overheadUnits } }),
  ]);
  await recomputeCosts([variantId]);
  const after = await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId }, select: { costPrice: true, fullCostPrice: true } });
  await logAudit(auth.userId, "costing.update", variant.sku, { from: variant.costPrice, to: after.costPrice, full: after.fullCostPrice, rows: items.length });
  return ok(after, "فرمول بهای تمام‌شده ذخیره شد و از سفارش‌های بعدی اعمال می‌شود.");
}
