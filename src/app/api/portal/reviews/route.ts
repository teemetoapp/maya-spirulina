import { requireApi } from "@/lib/rbac/server";
import { moduleGuard } from "@/lib/modules/server";
import { ok, fail, readJson, str, int } from "@/lib/api/respond";
import prisma from "@/lib/prisma";
import { notify } from "@/lib/notifications";

// خریدار برای سفارش تحویل‌شده خودش یک بار امتیاز رضایت و نظر ثبت می‌کند
export async function POST(req: Request) {
  const auth = await requireApi("portal.customer");
  if (auth instanceof Response) return auth;
  const off = await moduleGuard("reviews");
  if (off) return off;
  const b = await readJson(req);
  const rating = int(b.rating);
  if (!rating || rating < 1 || rating > 5) return fail("امتیاز را از ۱ تا ۵ انتخاب کنید.");
  const body = str(b.body, 1000) || null;
  const publish = b.publish === true && !!body;
  const order = await prisma.order.findFirst({
    where: { orderNumber: str(b.orderNumber, 40), userId: auth.userId, status: "DELIVERED" },
    include: { review: true, user: { select: { name: true } } },
  });
  if (!order) return fail("فقط برای سفارش تحویل‌شده خودتان می‌توانید نظر بدهید.");
  if (order.review) return fail("برای این سفارش قبلاً نظر ثبت کرده‌اید.");
  await prisma.review.create({
    data: {
      orderId: order.id,
      userId: auth.userId,
      rating,
      body,
      publish,
      displayName: str(b.displayName, 40) || order.user.name?.split(" ")[0] || null,
      // امتیاز بدون متن یا بدون اجازه انتشار فقط نظرسنجی داخلی است
      status: publish ? "PENDING" : "APPROVED",
    },
  });
  if (rating <= 2) {
    await notify("review.low", { data: { customer: order.user.name ?? order.shippingRecipient, orderNumber: order.orderNumber, rating, comment: body ?? "" } });
  }
  return ok({}, publish ? "ممنون! نظرتان پس از بررسی در سایت نمایش داده می‌شود." : "ممنون از وقتی که گذاشتید.");
}
