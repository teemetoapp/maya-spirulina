import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// برای سرویس پایش بیرونی (مثل UptimeRobot): اگر سایت یا دیتابیس قطع باشد پاسخ ۲۰۰ نمی‌گیرد
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
