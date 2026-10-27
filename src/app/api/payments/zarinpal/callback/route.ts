import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyZarinpal } from "@/lib/payments";
import { markOrderPaid, changeOrderStatus } from "@/lib/commerce/orders";

// GET /api/payments/zarinpal/callback?Authority=...&Status=OK|NOK
export async function GET(req: NextRequest) {
  const authority = req.nextUrl.searchParams.get("Authority") || "";
  const status = req.nextUrl.searchParams.get("Status");
  const order = authority ? await prisma.order.findFirst({ where: { gatewayAuthority: authority } }) : null;

  if (!order) {
    return NextResponse.redirect(new URL("/checkout?error=PAYMENT_NOT_FOUND", req.url));
  }
  if (order.status !== "PENDING") {
    return NextResponse.redirect(new URL(`/checkout/success?order=${order.orderNumber}`, req.url));
  }

  const refId = status === "OK" ? await verifyZarinpal(order, authority) : null;
  if (!refId) {
    // پرداخت ناموفق: موجودی و اعتبار کیف پول آزاد می‌شود
    await changeOrderStatus(order.id, "CANCELLED", order.userId, { note: "پرداخت ناموفق یا لغو در درگاه" });
    return NextResponse.redirect(new URL("/checkout?error=PAYMENT_CANCELLED", req.url));
  }

  await markOrderPaid(order.id, refId);
  return NextResponse.redirect(new URL(`/checkout/success?order=${order.orderNumber}`, req.url));
}
