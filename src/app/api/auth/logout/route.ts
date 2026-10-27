import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({
    success: true,
    message: "با موفقیت از حساب کاربری خارج شدید.",
  });
}
