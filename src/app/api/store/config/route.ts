import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";

// GET /api/store/config — public storefront rules (shipping)
export async function GET() {
  const settings = await getSettings();
  return NextResponse.json({
    success: true,
    config: {
      freeShippingThreshold: Number(settings.FREE_SHIPPING_THRESHOLD) || 0,
      postShippingFee: Number(settings.SHIPPING_FEE_POST) || 0,
    },
  });
}
