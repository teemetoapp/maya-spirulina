import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isMockPaymentAllowed } from "@/lib/payments";
import { markOrderPaid, changeOrderStatus } from "@/lib/commerce/orders";

// POST /api/payments/mock { orderNumber, action: "pay" | "cancel" } — test gateway only
export async function POST(req: NextRequest) {
  if (!isMockPaymentAllowed()) {
    return new NextResponse(null, { status: 404 });
  }
  const session = await getSession();
  const body = await req.json().catch(() => ({}));
  const order = await prisma.order.findUnique({ where: { orderNumber: String(body?.orderNumber || "") } });
  if (!session || !order || order.userId !== session.id) {
    return NextResponse.json({ success: false, error: "سفارش پیدا نشد." }, { status: 404 });
  }
  if (order.status !== "PENDING") {
    return NextResponse.json({ success: true, redirectUrl: `/checkout/success?order=${order.orderNumber}` });
  }

  if (body?.action === "pay") {
    await markOrderPaid(order.id, `TEST-${Date.now()}`);
    return NextResponse.json({ success: true, redirectUrl: `/checkout/success?order=${order.orderNumber}` });
  }

  await changeOrderStatus(order.id, "CANCELLED", session.id, { note: "لغو پرداخت در درگاه آزمایشی" });
  return NextResponse.json({ success: true, redirectUrl: "/checkout?error=PAYMENT_CANCELLED" });
}
