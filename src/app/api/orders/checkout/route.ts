import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth";
import { quoteCart, PricingError } from "@/lib/commerce/pricing";
import { moduleGuard } from "@/lib/modules/server";
import { createOrder, OrderError } from "@/lib/commerce/orders";
import { startPayment, PaymentError } from "@/lib/payments";
import { isValidIranianMobile, isValidIranianPostalCode, normalizeIranianMobile } from "@/lib/validators";
import { toEnglishDigits } from "@/lib/currency";
import prisma from "@/lib/prisma";

// POST /api/orders/checkout — creates the order from a server-side quote and starts payment
export async function POST(req: NextRequest) {
  try {
    const off = await moduleGuard("orders");
    if (off) return off;
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: "برای ثبت سفارش ابتدا با شماره موبایل وارد شوید.", requiresLogin: true },
        { status: 401 }
      );
    }

    const body = await req.json();
    const recipient = body?.recipient ?? {};
    const phone = toEnglishDigits(String(recipient.phone || ""));
    const postalCode = toEnglishDigits(String(recipient.postalCode || ""));

    if (!recipient.name || !recipient.address || !recipient.province || !recipient.city) {
      return NextResponse.json({ success: false, error: "اطلاعات گیرنده و آدرس تحویل ناقص است." }, { status: 400 });
    }
    if (!isValidIranianMobile(phone)) {
      return NextResponse.json({ success: false, error: "شماره موبایل گیرنده نامعتبر است." }, { status: 400 });
    }
    if (!isValidIranianPostalCode(postalCode)) {
      return NextResponse.json({ success: false, error: "کد پستی ۱۰ رقمی نامعتبر است." }, { status: 400 });
    }

    const jar = await cookies();
    const referralCode = jar.get("ref_code")?.value ?? null;
    const quoteInput = {
      items: Array.isArray(body?.items) ? body.items : [],
      userId: session.id,
      couponCode: body?.couponCode,
      referralCode,
      shippingMethod: body?.shippingMethod,
      province: String(recipient.province),
      city: String(recipient.city),
      useWallet: !!body?.useWallet,
    };
    let quote = await quoteCart(quoteInput);

    // سفیری که با کد خودش برای خودش می‌خرد (همان شماره یا همان آدرس) تخفیف و پورسانت نمی‌گیرد
    const fraudFlags: string[] = [];
    if (quote.referrer) {
      const ref = await prisma.user.findUnique({ where: { id: quote.referrer.id }, select: { phone: true, addresses: { select: { postalCode: true } } } });
      if (ref && (ref.phone === normalizeIranianMobile(phone) || ref.addresses.some((a) => a.postalCode === postalCode))) {
        fraudFlags.push("AMBASSADOR_SELF_PURCHASE");
        quote = await quoteCart({ ...quoteInput, referralCode: null });
      }
    }
    let utmRaw = "";
    try {
      utmRaw = decodeURIComponent(jar.get("utm")?.value ?? "");
    } catch {
      /* کوکی خراب؛ بدون منبع ثبت می‌شود */
    }
    const [source, medium, campaign] = utmRaw.split("|");

    const order = await createOrder(session.id, quote, {
      recipient: String(recipient.name).trim(),
      phone: normalizeIranianMobile(phone),
      province: String(recipient.province),
      city: String(recipient.city),
      address: String(recipient.address).trim(),
      postalCode,
      note: body?.note ? String(body.note).slice(0, 500) : undefined,
    }, { utm: source ? { source, medium, campaign } : null, fraudFlags });

    const redirectUrl =
      order.payableAmount > 0
        ? await startPayment(order)
        : `/checkout/success?order=${encodeURIComponent(order.orderNumber)}`;

    return NextResponse.json({ success: true, orderNumber: order.orderNumber, redirectUrl });
  } catch (error) {
    if (error instanceof PricingError || error instanceof OrderError || error instanceof PaymentError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    console.error("Checkout API error:", error);
    return NextResponse.json({ success: false, error: "خطایی در پردازش سفارش رخ داد." }, { status: 500 });
  }
}
