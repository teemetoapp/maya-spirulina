import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAmbassadorBySlug } from "@/data/ambassadors";
import { getNumberSetting } from "@/lib/settings";
import { isModuleEnabled } from "@/lib/modules/server";

// /ref/:slug — ambassador referral link: stores the referral code and opens the ambassador's story page
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const user = await prisma.user.findFirst({
    where: { OR: [{ ambassadorSlug: slug }, { referralCode: slug.toUpperCase() }], isActive: true },
    select: { referralCode: true, ambassadorSlug: true },
  });
  const story = getAmbassadorBySlug(user?.ambassadorSlug ?? slug);

  const targetUrl = story ? new URL(`/story/${story.slug}`, request.url) : new URL("/", request.url);
  const response = NextResponse.redirect(targetUrl);

  const refCode = user?.referralCode ?? story?.referralCode;
  // ماژول سفیران خاموش است: لینک فقط صفحه را باز می‌کند و کد معرفی ذخیره نمی‌شود
  if (refCode && (await isModuleEnabled("ambassadors"))) {
    const days = await getNumberSetting("REFERRAL_COOKIE_DAYS");
    response.cookies.set("ref_code", refCode, { maxAge: days * 24 * 60 * 60, path: "/", sameSite: "lax" });
  }
  return response;
}
