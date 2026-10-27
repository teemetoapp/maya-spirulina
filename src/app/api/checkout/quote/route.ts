import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth";
import { quoteCart, PricingError } from "@/lib/commerce/pricing";
import { moduleGuard } from "@/lib/modules/server";

// POST /api/checkout/quote — live price breakdown for the checkout page
export async function POST(req: NextRequest) {
  try {
    const off = await moduleGuard("orders");
    if (off) return off;
    const body = await req.json();
    const session = await getSession();
    const referralCode = (await cookies()).get("ref_code")?.value ?? null;

    const quote = await quoteCart({
      items: Array.isArray(body?.items) ? body.items : [],
      userId: session?.id,
      couponCode: body?.couponCode,
      referralCode,
      shippingMethod: body?.shippingMethod,
      province: typeof body?.province === "string" ? body.province.slice(0, 40) : null,
      city: typeof body?.city === "string" ? body.city.slice(0, 40) : null,
      useWallet: !!body?.useWallet,
    });

    return NextResponse.json({
      success: true,
      quote: {
        // بهای تمام‌شده داخلی است و به مرورگر ارسال نمی‌شود
        lines: quote.lines.map((l) => ({ variantId: l.variantId, sku: l.sku, title: l.title, unitPrice: l.unitPrice, quantity: l.quantity, totalPrice: l.totalPrice })),
        subtotal: quote.subtotal,
        discount: quote.discount,
        discountSource: quote.discountSource,
        discountLabel: quote.discountLabel,
        couponCode: quote.couponCode,
        couponError: quote.couponError,
        shippingMethod: quote.shippingMethod,
        shippingFee: quote.shippingFee,
        freeShippingThreshold: quote.freeShippingThreshold,
        total: quote.total,
        walletBalance: quote.walletBalance,
        walletUsed: quote.walletUsed,
        payable: quote.payable,
        referrerName: quote.referrer?.name ?? null,
      },
    });
  } catch (error) {
    if (error instanceof PricingError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    console.error("Quote API error:", error);
    return NextResponse.json({ success: false, error: "خطا در محاسبه مبلغ سفارش." }, { status: 500 });
  }
}
