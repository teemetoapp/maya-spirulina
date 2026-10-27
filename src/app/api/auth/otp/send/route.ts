import { NextRequest, NextResponse } from "next/server";
import { isValidIranianMobile, normalizeIranianMobile } from "@/lib/validators";
import { generateOtpCode } from "@/lib/auth";
import { getSmsProvider } from "@/lib/sms/sms-provider";
import cache from "@/lib/redis";
import prisma from "@/lib/prisma";

// ==============================================================
// POST /api/auth/otp/send - Send Transactional OTP via SMS
// ==============================================================

const OTP_TTL_SECONDS = 120; // 2 minutes
const DAILY_LIMIT = 10; // Max 10 requests per day per phone
const IP_DAILY_LIMIT = 30;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawPhone = body?.phone;

    if (!rawPhone || !isValidIranianMobile(rawPhone)) {
      return NextResponse.json(
        {
          success: false,
          error: "شماره موبایل وارد شده معتبر نیست. لطفاً یک شماره معتبر مانند ۰۹۱۲۳۴۵۶۷۸۹ وارد کنید.",
        },
        { status: 400 }
      );
    }

    const phone = normalizeIranianMobile(rawPhone);

    // ۱. بررسی ریت‌لیمیت دو دقیقه‌ای (Rate limiting: 1 request per 120s)
    const throttleKey = `otp_throttle:${phone}`;
    const remainingTtl = await cache.ttl(throttleKey);

    if (remainingTtl > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `لطفاً ${remainingTtl} ثانیه صبر کنید و سپس مجدداً درخواست کد نمایید.`,
          remainingSeconds: remainingTtl,
        },
        { status: 429 }
      );
    }

    // ۲. بررسی سقف ارسال روزانه (Daily quota)
    const dailyKey = `otp_daily:${phone}`;
    const dailyCount = parseInt((await cache.get(dailyKey)) || "0", 10);

    if (dailyCount >= DAILY_LIMIT) {
      return NextResponse.json(
        {
          success: false,
          error: "تعداد درخواست‌های پیامک برای این شماره بیش از حد مجاز روزانه است. لطفاً فردا تلاش کنید.",
        },
        { status: 429 }
      );
    }

    // سقف روزانه برای هر اینترنت (جلوگیری از ساخت انبوه حساب برای امتیاز معرفی)
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    if (ip) {
      const ipKey = `otp_ip:${ip}`;
      const ipCount = parseInt((await cache.get(ipKey)) || "0", 10);
      if (ipCount >= IP_DAILY_LIMIT) {
        return NextResponse.json({ success: false, error: "درخواست‌های کد از این اینترنت بیش از حد مجاز است. لطفاً بعداً تلاش کنید." }, { status: 429 });
      }
      await cache.set(ipKey, String(ipCount + 1), "EX", 24 * 3600);
    }

    // ۳. تولید کد تایید ۵ رقمی امن
    const otpCode = generateOtpCode();

    // ۴. ذخیره در کش با انقضای ۲ دقیقه
    const otpKey = `otp:${phone}`;
    await cache.set(otpKey, otpCode, "EX", OTP_TTL_SECONDS);
    await cache.set(throttleKey, "1", "EX", OTP_TTL_SECONDS);
    await cache.set(dailyKey, String(dailyCount + 1), "EX", 24 * 3600);

    // ۵. ذخیره در دیتابیس جهت لاگ حسابرسی
    try {
      await prisma.otpVerification.create({
        data: {
          phone,
          code: otpCode,
          expiresAt: new Date(Date.now() + OTP_TTL_SECONDS * 1000),
        },
      });
    } catch {
      // ردیس یا حافظه کش نقش اصلی را دارد؛ در صورت در دسترس نبودن موقت دیتابیس پردازش ادامه می‌یابد
      console.warn("⚠️ [DB Audit] ثبت لاگ دیتابیس موقتاً در دسترس نیست، فرآیند با کش ادامه یافت.");
    }

    // ۶. ارسال پیامک خدماتی از طریق پترن
    const smsService = getSmsProvider();
    const smsResult = await smsService.sendOtp(phone, otpCode);

    if (!smsResult.success) {
      console.error("❌ SMS Dispatch Failed:", smsResult.error);
      return NextResponse.json(
        {
          success: false,
          error: "ارسال پیامک با خطا مواجه شد. لطفاً لحظاتی بعد دوباره تلاش کنید.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "کد تایید با موفقیت از طریق پیامک ارسال شد.",
      expiresIn: OTP_TTL_SECONDS,
      // در حالت توسعه، جهت تست سریع کد در پاسخ برگشت داده می‌شود
      // NEXT_PUBLIC_DEMO_MODE: فقط برای لینک دمو؛ در سایت اصلی هرگز روشن نشود
      devCode: process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_DEMO_MODE === "true" ? otpCode : undefined,
    });
  } catch (error: unknown) {
    console.error("❌ Error in /api/auth/otp/send:", error);
    return NextResponse.json(
      { success: false, error: "خطای سرور در ارسال پیامک کد تایید." },
      { status: 500 }
    );
  }
}
