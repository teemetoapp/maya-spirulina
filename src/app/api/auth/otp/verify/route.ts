import { NextRequest, NextResponse } from "next/server";
import { isValidIranianMobile, normalizeIranianMobile } from "@/lib/validators";
import { toEnglishDigits } from "@/lib/currency";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import { registerUser } from "@/lib/users";
import cache from "@/lib/redis";
import prisma from "@/lib/prisma";
import { logAudit } from "@/lib/rbac/server";
import { notify } from "@/lib/notifications";
import { formatJalaliDateTime } from "@/lib/jalali";

// ==============================================================
// POST /api/auth/otp/verify - Verify OTP, Register/Login User
// ==============================================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawPhone = body?.phone;
    const rawCode = body?.code;
    const incomingRefCode = body?.referralCode?.trim()?.toUpperCase();

    if (!rawPhone || !isValidIranianMobile(rawPhone)) {
      return NextResponse.json(
        { success: false, error: "شماره موبایل وارد شده نامعتبر است." },
        { status: 400 }
      );
    }

    if (!rawCode || rawCode.length < 4) {
      return NextResponse.json(
        { success: false, error: "لطفاً کد تایید دریافتی را به طور کامل وارد کنید." },
        { status: 400 }
      );
    }

    const phone = normalizeIranianMobile(rawPhone);
    const code = toEnglishDigits(String(rawCode).trim());

    // ۱. بررسی کد در ردیس / کش
    const otpKey = `otp:${phone}`;
    let cachedCode = await cache.get(otpKey);

    // ۲. فال‌بک به دیتابیس در صورتی که ردیس خالی بوده باشد
    if (!cachedCode) {
      try {
        const dbOtp = await prisma.otpVerification.findFirst({
          where: {
            phone,
            isUsed: false,
            expiresAt: { gt: new Date() },
          },
          orderBy: { createdAt: "desc" },
        });
        if (dbOtp) {
          cachedCode = dbOtp.code;
        }
      } catch {
        // نادیده گرفتن خطای دیتابیس در صورت آفلاین بودن
      }
    }

    if (!cachedCode) {
      return NextResponse.json(
        {
          success: false,
          error: "کد تایید منقضی شده است یا درخواستی ثبت نشده. لطفاً مجدداً درخواست کد دهید.",
        },
        { status: 400 }
      );
    }

    if (cachedCode !== code) {
      // محدودیت تلاش برای جلوگیری از حدس زدن کد (حداکثر ۵ بار برای هر کد)
      const attemptsKey = `otp_attempts:${phone}`;
      const attempts = Number((await cache.get(attemptsKey)) || "0") + 1;
      await cache.set(attemptsKey, String(attempts), "EX", 300);
      if (attempts >= 5) {
        await cache.del(otpKey);
        await cache.del(attemptsKey);
        try {
          await prisma.otpVerification.updateMany({ where: { phone, isUsed: false }, data: { isUsed: true } });
        } catch {
          // نادیده گرفتن
        }
        return NextResponse.json(
          { success: false, error: "تعداد تلاش‌های ناموفق زیاد بود. لطفاً کد جدید درخواست کنید." },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { success: false, error: "کد تایید وارد شده اشتباه است." },
        { status: 400 }
      );
    }

    // ۳. ابطال کد مصرف شده
    await cache.del(otpKey);
    await cache.del(`otp_throttle:${phone}`);
    await cache.del(`otp_attempts:${phone}`);
    try {
      await prisma.otpVerification.updateMany({
        where: { phone, isUsed: false },
        data: { isUsed: true },
      });
    } catch {
      // نادیده گرفتن
    }

    // ۴. یافتن یا ایجاد کاربر (Register or Login)
    let user = await prisma.user.findUnique({ where: { phone } });
    const isNewUser = !user;
    if (!user) {
      user = await registerUser(phone, incomingRefCode, {
        ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
        smsConsent: body?.smsConsent === true,
      });
      // هر ثبت‌نام جدید (نقش پیش‌فرض: مشتری) به مدیر ارشد اطلاع داده می‌شود
      await notify("admin.new_user", { data: { phone, date: formatJalaliDateTime(new Date()) } });
    }

    if (!user.isActive) {
      return NextResponse.json(
        { success: false, error: "حساب کاربری شما غیرفعال شده است. با پشتیبانی تماس بگیرید." },
        { status: 403 }
      );
    }

    // ۵. ساخت سشن JWT و کوکی (سطح دسترسی در هر درخواست از دیتابیس خوانده می‌شود)
    const sessionPayload = {
      id: user.id,
      phone: user.phone,
      name: user.name,
      referralCode: user.referralCode,
    };

    const sessionToken = await createSessionToken(sessionPayload);
    await setSessionCookie(sessionToken);
    await logAudit(user.id, "auth.login", user.phone, { ip: req.headers.get("x-forwarded-for")?.split(",")[0] ?? null });

    // ۶. پرتال یکپارچه صفحه شروع هر نقش را خودش تعیین می‌کند
    const redirectUrl = "/portal";

    return NextResponse.json({
      success: true,
      message: isNewUser
        ? "ثبت‌نام شما با موفقیت انجام شد و امتیاز هدیه به حساب شما منظور گردید!"
        : "با موفقیت وارد شدید.",
      user: sessionPayload,
      isNewUser,
      redirectUrl,
    });
  } catch (error: unknown) {
    console.error("❌ Error in /api/auth/otp/verify:", error);
    return NextResponse.json(
      { success: false, error: "خطای سرور در اعتبارسنجی کد تایید." },
      { status: 500 }
    );
  }
}
