import { requireApi } from "@/lib/rbac/server";
import { ok, fail, readJson, str } from "@/lib/api/respond";
import prisma from "@/lib/prisma";
import { notify } from "@/lib/notifications";
import { moduleGuard } from "@/lib/modules/server";

// Customer opens a ticket
export async function POST(req: Request) {
  const auth = await requireApi("portal.customer");
  if (auth instanceof Response) return auth;
  const off = await moduleGuard("tickets");
  if (off) return off;
  const b = await readJson(req);
  const subject = str(b.subject, 120);
  const body = str(b.body, 4000);
  const orderNumber = str(b.orderNumber, 30);
  if (!subject || !body) return fail("موضوع و متن پیام الزامی است.");

  let orderId: string | null = null;
  if (orderNumber) {
    const order = await prisma.order.findFirst({ where: { orderNumber, userId: auth.userId }, select: { id: true } });
    if (!order) return fail("این شماره سفارش در حساب شما پیدا نشد.");
    orderId = order.id;
  }
  const open = await prisma.supportTicket.count({ where: { userId: auth.userId, kind: "SUPPORT", status: { not: "CLOSED" } } });
  if (open >= 5) return fail("شما ۵ تیکت باز دارید؛ لطفاً تا پاسخ آن‌ها صبر کنید.");

  const ticket = await prisma.supportTicket.create({
    data: { userId: auth.userId, subject, orderId, messages: { create: { authorId: auth.userId, body } } },
  });
  await notify("ticket.created", { data: { subject, customer: auth.name ?? auth.phone } });
  return ok({ id: ticket.id }, "تیکت ثبت شد. پاسخ از طریق اعلان‌ها به شما اطلاع داده می‌شود.");
}
