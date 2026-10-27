"use client";

import React, { useState, useEffect, useTransition, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toPersianDigits, toEnglishDigits } from "@/lib/currency";
import ThemeToggle from "@/components/ui/ThemeToggle";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL Query Parameters
  const refParam = searchParams.get("ref") || "";
  const redirectParam = searchParams.get("redirect") || "";

  // State
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [referralCode, setReferralCode] = useState(refParam);
  const [smsConsent, setSmsConsent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [countdown, setCountdown] = useState(120);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Timer countdown
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === "otp" && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  // Handle Send OTP
  async function handleSendOtp(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanPhone = toEnglishDigits(phone.trim());
    if (!cleanPhone || cleanPhone.length < 10) {
      setError("لطفاً یک شماره موبایل معتبر (مثلاً ۰۹۱۲۳۴۵۶۷۸۹) وارد کنید.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/auth/otp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: cleanPhone }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          setError(data.error || "خطا در ارسال کد تایید. لطفاً دوباره تلاش کنید.");
          return;
        }

        setStep("otp");
        setCountdown(data.expiresIn || 120);
        if (data.devCode) {
          setDevCode(data.devCode);
          setOtpCode(data.devCode);
        }
        setSuccessMsg(data.message || "کد تایید یکبار مصرف ارسال شد.");
      } catch {
        setError("خطای ارتباط با سرور. لطفاً اتصال اینترنت خود را بررسی کنید.");
      }
    });
  }

  // Handle Verify OTP
  async function handleVerifyOtp(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const cleanOtp = toEnglishDigits(otpCode.trim());
    if (cleanOtp.length < 4) {
      setError("لطفاً کد تایید ۵ رقمی را به طور کامل وارد کنید.");
      return;
    }

    startTransition(async () => {
      try {
        const res = await fetch("/api/auth/otp/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: toEnglishDigits(phone.trim()),
            code: cleanOtp,
            referralCode: referralCode ? toEnglishDigits(referralCode.trim()) : undefined,
            smsConsent,
          }),
        });

        const data = await res.json();

        if (!res.ok || !data.success) {
          setError(data.error || "کد وارد شده صحیح نمی‌باشد.");
          return;
        }

        setSuccessMsg(data.message || "با موفقیت وارد شدید.");

        // Only same-site relative paths are accepted as redirect targets
        const safeRedirect = redirectParam.startsWith("/") && !redirectParam.startsWith("//") ? redirectParam : "";
        const targetUrl = safeRedirect || data.redirectUrl || "/portal";

        setTimeout(() => {
          router.push(targetUrl);
          router.refresh();
        }, 600);
      } catch {
        setError("خطای سرور در اعتبارسنجی کد.");
      }
    });
  }

  return (
    <div className="w-full max-w-md bg-bg-card border border-neutral-200 dark:border-white/10 rounded-xl p-8 shadow-2xl relative overflow-hidden transition-colors">
      
      {/* Top Bar with ThemeToggle & Home Link */}
      <div className="flex items-center justify-between mb-6 pb-3 border-b border-neutral-100 dark:border-white/10">
        <Link
          href="/"
          className="text-xs text-neutral-500 dark:text-slate-400 hover:text-neutral-900 dark:hover:text-emerald-400 transition flex items-center gap-1.5 font-medium"
        >
          <span>←</span>
          <span>بازگشت به فروشگاه مایا</span>
        </Link>
        <ThemeToggle />
      </div>

      {/* Brand Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 shadow-xs mb-3 font-black text-lg">
          M
        </div>
        <h2 className="text-xl font-black text-neutral-900 dark:text-white tracking-tight">
          {step === "phone" ? "ورود یا عضویت سریع" : "تایید شماره همراه"}
        </h2>
        <p className="text-neutral-500 dark:text-slate-400 text-xs mt-1.5">
          {step === "phone"
            ? "سامانه اختصاصی مشتریان، سفیران سلامت و مدیریت مایا اسپیرولینا"
            : `کد تایید پیامک‌شده به شماره ${toPersianDigits(phone)} را وارد کنید`}
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-5 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2">
          <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-5 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-start gap-2">
          <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{successMsg}</span>
        </div>
      )}

      {/* Dev Mode Code Indicator */}
      {devCode && (
        <div className="mb-5 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-between">
          <span>کد تایید تستی (محیط توسعه):</span>
          <code className="px-2.5 py-0.5 bg-emerald-500/20 rounded font-mono font-bold text-emerald-800 dark:text-emerald-300 text-xs">
            {devCode}
          </code>
        </div>
      )}

      {/* Demo deployment only: one-click sign-in per role, no SMS line needed */}
      {process.env.NEXT_PUBLIC_DEMO_MODE === "true" && step === "phone" && (
        <div className="mb-5 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs">
          <p className="mb-2 font-bold text-emerald-700 dark:text-emerald-300">نسخه‌ی دمو — ورود سریع بدون پیامک:</p>
          <div className="flex flex-wrap gap-2">
            {[["super_admin", "مدیر ارشد"], ["admin", "مدیر فروشگاه"], ["ambassador", "سفیر"], ["customer", "مشتری"]].map(([role, label]) => (
              <a key={role} href={`/api/auth/dev-switch?role=${role}`} className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-bold">
                {label}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* STEP 1: Phone Form */}
      {step === "phone" && (
        <form onSubmit={handleSendOtp} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-slate-300 mb-1.5">
              شماره موبایل
            </label>
            <input
              type="tel"
              dir="ltr"
              placeholder="09123456789"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoFocus
              className="w-full px-3.5 py-2.5 rounded-lg bg-bg-page border border-neutral-200 dark:border-white/10 focus:border-emerald-500 text-neutral-900 dark:text-white placeholder-neutral-400 text-left font-mono tracking-wider transition outline-none text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-500 dark:text-slate-400 mb-1.5">
              کد معرف سفیر (اختیاری)
            </label>
            <input
              type="text"
              dir="ltr"
              placeholder="مثلاً: MAYA-20"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              className="w-full px-3.5 py-2.5 rounded-lg bg-bg-page border border-neutral-200 dark:border-white/10 focus:border-emerald-500 text-neutral-900 dark:text-white placeholder-neutral-400 text-left font-mono text-xs transition outline-none uppercase"
            />
          </div>

          <label className="flex items-start gap-2 text-[11px] text-neutral-600 dark:text-slate-400 cursor-pointer">
            <input type="checkbox" checked={smsConsent} onChange={(e) => setSmsConsent(e.target.checked)} className="mt-0.5 accent-emerald-500" />
            <span>
              پیامک تخفیف‌ها و جشنواره‌های مایا را می‌خواهم (اختیاری؛ هر زمان با ارسال «۱۱» یا از پروفایل لغو می‌شود). پیامک‌های سفارش همیشه ارسال می‌شوند.{" "}
              <a href="/club-rules" target="_blank" className="underline">قوانین باشگاه</a>
            </span>
          </label>

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs transition shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {isPending ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span>در حال ارسال پیامک...</span>
              </>
            ) : (
              <span>دریافت کد تایید یکبار مصرف</span>
            )}
          </button>
        </form>
      )}

      {/* STEP 2: OTP Verification Form */}
      {step === "otp" && (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-neutral-700 dark:text-slate-300">
                کد تایید ۵ رقمی
              </label>
              <button
                type="button"
                onClick={() => {
                  setStep("phone");
                  setError(null);
                }}
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline transition cursor-pointer"
              >
                ویرایش شماره
              </button>
            </div>

            <input
              type="text"
              dir="ltr"
              maxLength={5}
              placeholder="• • • • •"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              autoFocus
              className="w-full px-4 py-3 rounded-lg bg-bg-page border border-neutral-200 dark:border-white/10 focus:border-emerald-500 text-neutral-900 dark:text-white placeholder-neutral-400 text-center font-mono text-xl tracking-[0.4em] transition outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs transition shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {isPending ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                </svg>
                <span>در حال اعتبارسنجی...</span>
              </>
            ) : (
              <span>تایید و ورود به پنل اختصاصی</span>
            )}
          </button>

          {/* Countdown and Resend */}
          <div className="text-center pt-2">
            {countdown > 0 ? (
              <p className="text-xs text-neutral-500 dark:text-slate-400">
                امکان ارسال مجدد کد تا{" "}
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {toPersianDigits(countdown)}
                </span>{" "}
                ثانیه دیگر
              </p>
            ) : (
              <button
                type="button"
                onClick={() => handleSendOtp()}
                disabled={isPending}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline transition cursor-pointer"
              >
                ارسال مجدد کد تایید
              </button>
            )}
          </div>
        </form>
      )}

      {/* Footer info */}
      <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-white/10 text-center text-[11px] text-neutral-400 dark:text-slate-500">
        اسپیرولینا مایا • سامانه ورود امن دو مرحله‌ای OTP
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-neutral-100 dark:bg-bg-page text-neutral-900 dark:text-slate-100 transition-colors duration-200">
      <Suspense fallback={<div className="text-slate-400 text-center text-xs">در حال بارگذاری سامانه ورود...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
