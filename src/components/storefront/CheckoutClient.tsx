"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCart } from "@/lib/cart-context";
import { formatToman, toPersianDigits, toEnglishDigits } from "@/lib/currency";
import { isValidIranianMobile, isValidIranianPostalCode } from "@/lib/validators";

const PROVINCES_AND_CITIES: Record<string, string[]> = {
  تهران: ["تهران", "شهریار", "اسلامشهر", "دماوند", "پردیس", "ری"],
  اصفهان: ["اصفهان", "کاشان", "شاهین‌شهر", "نجف‌آباد", "خمینی‌شهر"],
  فارس: ["شیراز", "مرودشت", "جهرم", "فسا", "کازرون"],
  "خراسان رضوی": ["مشهد", "نیشابور", "سبزوار", "تربت حیدریه"],
  "آذربایجان شرقی": ["تبریز", "مراغه", "مرند", "میانه"],
  البرز: ["کرج", "فردیس", "هشتگرد", "نظرآباد"],
  خوزستان: ["اهواز", "دزفول", "آبادان", "خرمشهر"],
  گیلان: ["رشت", "لاهیجان", "انزلی", "فومن"],
  مازندران: ["ساری", "بابل", "آمل", "تنکابن", "چالوس"],
};

interface CheckoutClientProps {
  userSession?: {
    name?: string | null;
    phone: string;
  } | null;
}

// Price breakdown computed by the server (/api/checkout/quote)
interface CheckoutQuote {
  subtotal: number;
  discount: number;
  discountSource: "COUPON" | "AMBASSADOR" | "WHOLESALE" | null;
  discountLabel: string | null;
  couponCode: string | null;
  couponError: string | null;
  shippingFee: number;
  total: number;
  walletBalance: number;
  walletUsed: number;
  payable: number;
  referrerName: string | null;
}

export default function CheckoutClient({ userSession }: CheckoutClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { items, totalAmount, clearCart } = useCart();

  // Form State
  const [recipientName, setRecipientName] = useState(userSession?.name || "");
  const [recipientPhone, setRecipientPhone] = useState(userSession?.phone || "");
  const [province, setProvince] = useState("تهران");
  const [city, setCity] = useState("تهران");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [orderNote, setOrderNote] = useState("");

  // Shipping Method
  const [shippingMethod, setShippingMethod] = useState<"POST" | "EXPRESS">("POST");

  // Coupon (validated by the server)
  const [couponInput, setCouponInput] = useState("");
  // کد تخفیف از لینک یادآوری تمدید (?coupon=) خودکار اعمال می‌شود
  const [couponCode, setCouponCode] = useState<string | null>(() => searchParams?.get("coupon")?.trim().toUpperCase() || null);

  // Payment Method
  const [paymentMethod, setPaymentMethod] = useState<"ONLINE_GATEWAY" | "WALLET" | "HYBRID">("ONLINE_GATEWAY");

  // Status & Validation Error
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Server quote: prices, discounts, shipping and wallet are never computed in the browser
  const [quote, setQuote] = useState<CheckoutQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  useEffect(() => {
    if (items.length === 0) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/checkout/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            items: items.map((i) => ({ sku: i.sku, quantity: i.quantity })),
            couponCode,
            shippingMethod,
            province,
            city,
            useWallet: paymentMethod !== "ONLINE_GATEWAY",
          }),
        });
        const data = await res.json();
        if (data.success) {
          setQuote(data.quote);
          setQuoteError(null);
        } else {
          setQuoteError(data.error);
        }
      } catch {
        // درخواست قبلی لغو شده یا ارتباط قطع است
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [items, couponCode, shippingMethod, paymentMethod, province, city]);

  // Returning from a cancelled gateway payment
  const gatewayError =
    searchParams?.get("error") === "PAYMENT_CANCELLED"
      ? "تراکنش پرداخت لغو شد یا ناموفق بود. مبلغی از حساب شما کسر نشده است؛ می‌توانید مجدداً اقدام کنید."
      : null;

  const userWalletBalance = quote?.walletBalance ?? 0;
  const shippingCost = quote?.shippingFee ?? 0;
  const isFreePostEligible = shippingMethod === "POST" && quote !== null && quote.shippingFee === 0;
  const couponDiscount = quote?.discount ?? 0;
  const appliedCoupon =
    quote && quote.discount > 0
      ? { code: quote.couponCode ?? "سفیر", description: quote.discountLabel ?? "" }
      : null;
  const couponError = quote?.couponError ?? null;
  const grossPayable = quote?.total ?? totalAmount;
  const walletDeduction = quote?.walletUsed ?? 0;
  const netOnlinePayable = quote?.payable ?? totalAmount;

  // Handle Province Change
  const handleProvinceChange = (newProv: string) => {
    setProvince(newProv);
    const availableCities = PROVINCES_AND_CITIES[newProv] || ["مرکز استان"];
    setCity(availableCities[0]);
  };

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const code = toEnglishDigits(couponInput.trim().toUpperCase());
    if (!code) return;
    setCouponCode(code);
    setCouponInput("");
  };

  const handleRemoveCoupon = () => {
    setCouponCode(null);
  };

  // Submit Order
  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (items.length === 0) {
      setFormError("سبد خرید شما خالی است.");
      return;
    }

    if (!recipientName.trim()) {
      setFormError("لطفاً نام و نام خانوادگی تحویل‌گیرنده را وارد کنید.");
      return;
    }

    if (!isValidIranianMobile(recipientPhone)) {
      setFormError("شماره همراه وارد شده نامعتبر است (فرمت صحیح: ۰۹۱۲۳۴۵۶۷۸۹).");
      return;
    }

    if (!address.trim() || address.trim().length < 10) {
      setFormError("لطفاً آدرس پستی دقیق با ذکر جزئیات پلاک و واحد را وارد کنید.");
      return;
    }

    if (!isValidIranianPostalCode(toEnglishDigits(postalCode.trim()))) {
      setFormError("کد پستی ۱۰ رقمی را وارد کنید.");
      return;
    }

    if (paymentMethod === "WALLET" && netOnlinePayable > 0) {
      setFormError("موجودی کیف پول شما کافی نیست. لطفاً شیوه پرداخت آنلاین یا ترکیبی را انتخاب کنید.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/orders/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((i) => ({ sku: i.sku, quantity: i.quantity })),
          recipient: {
            name: recipientName.trim(),
            phone: toEnglishDigits(recipientPhone.trim()),
            province,
            city,
            address: address.trim(),
            postalCode: toEnglishDigits(postalCode.trim()),
          },
          note: orderNote.trim(),
          shippingMethod,
          couponCode,
          useWallet: paymentMethod !== "ONLINE_GATEWAY",
        }),
      });

      const data = await res.json();

      if (data.requiresLogin) {
        router.push("/login?redirect=/checkout");
        return;
      }

      if (!res.ok || !data.success) {
        setFormError(data.error || "خطا در ثبت سفارش. لطفاً دوباره تلاش فرمایید.");
        setIsSubmitting(false);
        return;
      }

      clearCart();
      if (/^https?:\/\//.test(data.redirectUrl)) {
        window.location.href = data.redirectUrl; // درگاه بانکی
      } else {
        router.push(data.redirectUrl);
      }
    } catch {
      setFormError("ارتباط با سرور برقرار نشد. لطفاً اینترنت خود را بررسی کنید.");
      setIsSubmitting(false);
    }
  };

  // If cart is empty
  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center text-3xl mx-auto border border-emerald-500/20">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        </div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-white">سبد خرید شما در حال حاضر خالی است</h1>
        <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm max-w-md mx-auto">
          برای تکمیل سفارش، ابتدا محصولات مورد نظر خود را از کاتالوگ فروشگاه انتخاب کنید.
        </p>
        <Link
          href="/"
          className="inline-flex px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black shadow-lg shadow-emerald-500/20 transition cursor-pointer"
        >
          مشاهده کاتالوگ محصولات مایا ➔
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      {/* Breadcrumb Header */}
      <div className="pb-6 border-b border-slate-200 dark:border-white/10 mb-8 transition-colors">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
          <Link href="/" className="hover:text-slate-900 dark:hover:text-white transition">فروشگاه مایا</Link>
          <span>/</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">تکمیل سفارش و تسویه‌حساب نهایی</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
          تسویه‌حساب و ثبت آدرس تحویل
        </h1>
      </div>

      {(formError || quoteError || gatewayError) && (
        <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2 animate-fadeIn">
          <span>⚠️</span>
          <span>{formError || quoteError || gatewayError}</span>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <form onSubmit={handleCheckoutSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Right Column: Checkout Form (8 cols) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          {/* 1. Recipient Details */}
          <div className="p-6 rounded-2xl bg-bg-card border border-slate-200 dark:border-white/10 shadow-md space-y-4 transition-colors">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-white/5">
              <span className="text-emerald-500 font-bold">📍</span>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                ۱. مشخصات تحویل‌گیرنده و آدرس پستی
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="recipient-name" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 cursor-pointer">
                  نام و نام خانوادگی تحویل‌گیرنده *
                </label>
                <input
                  id="recipient-name"
                  name="recipientName"
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="مثال: سارا محمدی"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/20 transition-colors"
                />
              </div>

              <div>
                <label htmlFor="recipient-phone" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 cursor-pointer">
                  شماره موبایل جهت هماهنگی و پیامک رهگیری *
                </label>
                <input
                  id="recipient-phone"
                  name="recipientPhone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  required
                  dir="ltr"
                  placeholder="09123456789"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/20 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="recipient-province" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 cursor-pointer">
                  استان *
                </label>
                <select
                  id="recipient-province"
                  name="province"
                  value={province}
                  onChange={(e) => handleProvinceChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-bg-page border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/20 cursor-pointer"
                >
                  {Object.keys(PROVINCES_AND_CITIES).map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="recipient-city" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 cursor-pointer">
                  شهر *
                </label>
                <select
                  id="recipient-city"
                  name="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-bg-page border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/20 cursor-pointer"
                >
                  {(PROVINCES_AND_CITIES[province] || []).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="recipient-address" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 cursor-pointer">
                نشانی دقیق پستی (خیابان، کوچه، پلاک، واحد) *
              </label>
              <textarea
                id="recipient-address"
                name="address"
                required
                rows={2}
                autoComplete="street-address"
                placeholder="مثلاً: سعادت‌آباد، خیابان سرو غربی، کوچه نگار، پلاک ۲۴، واحد ۳"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/20 transition-colors resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="recipient-postal-code" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 cursor-pointer">
                  کد پستی ۱۰ رقمی (اختیاری)
                </label>
                <input
                  id="recipient-postal-code"
                  name="postalCode"
                  type="text"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  dir="ltr"
                  maxLength={10}
                  placeholder="1987364520"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-emerald-500 focus-visible:ring-2 focus-visible:ring-emerald-500/20 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  توضیحات و یادداشت سفارش (اختیاری)
                </label>
                <input
                  type="text"
                  placeholder="مثلاً: لطفاً قبل از ارسال تماس گرفته شود"
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>
          </div>

          {/* 2. Shipping Method Selection */}
          <div className="p-6 rounded-2xl bg-bg-card border border-slate-200 dark:border-white/10 shadow-md space-y-4 transition-colors">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-white/5">
              <span className="text-emerald-500 font-bold">🚚</span>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                ۲. انتخاب روش ارسال مرسوله
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label
                onClick={() => setShippingMethod("POST")}
                className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between space-y-2 ${
                  shippingMethod === "POST"
                    ? "border-emerald-500 bg-emerald-500/10 shadow-md shadow-emerald-500/10"
                    : "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:border-slate-300 dark:hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="shipping"
                      checked={shippingMethod === "POST"}
                      onChange={() => setShippingMethod("POST")}
                      className="text-emerald-600 focus:ring-0 cursor-pointer accent-emerald-500"
                    />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">پست پیشتاز سفارشی</span>
                  </div>
                  <span className="text-xs font-black font-mono">
                    {isFreePostEligible ? (
                      <span className="text-emerald-600 dark:text-emerald-400">رایگان (سقف خرید)</span>
                    ) : (
                      <span className="text-slate-900 dark:text-white">۴۵,۰۰۰ تومان</span>
                    )}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  ارسال به سراسر کشور با کد رهگیری ۲۴ رقمی پیامکی (۲ تا ۴ روز کاری)
                </p>
              </label>

              <label
                onClick={() => setShippingMethod("EXPRESS")}
                className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between space-y-2 ${
                  shippingMethod === "EXPRESS"
                    ? "border-emerald-500 bg-emerald-500/10 shadow-md shadow-emerald-500/10"
                    : "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:border-slate-300 dark:hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="shipping"
                      checked={shippingMethod === "EXPRESS"}
                      onChange={() => setShippingMethod("EXPRESS")}
                      className="text-emerald-600 focus:ring-0 cursor-pointer accent-emerald-500"
                    />
                    <span className="text-xs font-bold text-slate-900 dark:text-white">پیک فوری اکسپرس</span>
                  </div>
                  <span className="text-xs font-black text-slate-900 dark:text-white font-mono">
                    ۶۵,۰۰۰ تومان
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  تحویل همان روز کاری ۲ الی ۳ ساعته (مخصوص سفارشات شهر تهران و کرج)
                </p>
              </label>
            </div>
          </div>

          {/* 3. Payment Method Selection */}
          <div className="p-6 rounded-2xl bg-bg-card border border-slate-200 dark:border-white/10 shadow-md space-y-4 transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-2">
                <span className="text-emerald-500 font-bold">💳</span>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  ۳. انتخاب شیوه پرداخت
                </h2>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                موجودی کیف پول: <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">{formatToman(userWalletBalance)}</span>
              </div>
            </div>

            <div className="space-y-3">
              {/* Online Banking */}
              <label
                onClick={() => setPaymentMethod("ONLINE_GATEWAY")}
                className={`p-4 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                  paymentMethod === "ONLINE_GATEWAY"
                    ? "border-emerald-500 bg-emerald-500/10 shadow-md shadow-emerald-500/10"
                    : "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:border-slate-300 dark:hover:border-white/20"
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === "ONLINE_GATEWAY"}
                    onChange={() => setPaymentMethod("ONLINE_GATEWAY")}
                    className="text-emerald-600 focus:ring-0 cursor-pointer accent-emerald-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      درگاه پرداخت اینترنتی شاپرک
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      پرداخت امن آنلاین با کلیه کارت‌های عضو شتاب بانکی
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-lg">
                  <span>💳</span>
                  <span>🔒</span>
                </div>
              </label>

              {/* Wallet Payment */}
              <label
                onClick={() => setPaymentMethod("WALLET")}
                className={`p-4 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                  paymentMethod === "WALLET"
                    ? "border-emerald-500 bg-emerald-500/10 shadow-md shadow-emerald-500/10"
                    : "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:border-slate-300 dark:hover:border-white/20"
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === "WALLET"}
                    onChange={() => setPaymentMethod("WALLET")}
                    className="text-emerald-600 focus:ring-0 cursor-pointer accent-emerald-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      پرداخت از موجودی کیف پول مایا
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      کسر مستقیم {formatToman(Math.min(userWalletBalance, grossPayable))} از اعتبار نقدی شما
                    </div>
                  </div>
                </div>
                <span className="text-emerald-600 dark:text-emerald-400 text-xs font-mono font-bold">
                  {formatToman(userWalletBalance)}
                </span>
              </label>

              {/* Hybrid Payment */}
              <label
                onClick={() => setPaymentMethod("HYBRID")}
                className={`p-4 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                  paymentMethod === "HYBRID"
                    ? "border-emerald-500 bg-emerald-500/10 shadow-md shadow-emerald-500/10"
                    : "border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:border-slate-300 dark:hover:border-white/20"
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === "HYBRID"}
                    onChange={() => setPaymentMethod("HYBRID")}
                    className="text-emerald-600 focus:ring-0 cursor-pointer accent-emerald-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      پرداخت ترکیبی (کیف پول + درگاه)
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      کسر تمام موجودی کیف پول و پرداخت الباقی از طریق درگاه بانکی
                    </div>
                  </div>
                </div>
                <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                  توصیه شده
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Left Column: Live Bill & Sticky Summary (4 cols) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6">
          {/* Order Bill Card */}
          <div className="p-6 rounded-2xl bg-bg-card border border-slate-200 dark:border-white/10 shadow-md space-y-5 sticky top-28 transition-colors">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
              <span>صورت‌حساب نهایی خرید</span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-mono">
                {toPersianDigits(items.length)} ردیف کالا
              </span>
            </h2>

            {/* Compact Item Thumbnails */}
            <div className="max-h-48 overflow-y-auto space-y-2.5 pr-1">
              {items.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-xs gap-3">
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-white/10 flex items-center justify-center shrink-0">
                      {item.icon}
                    </span>
                    <span className="truncate text-slate-700 dark:text-slate-300">
                      {item.title} <strong className="text-emerald-600 dark:text-emerald-400 font-mono">×{toPersianDigits(item.quantity)}</strong>
                    </span>
                  </div>
                  <span className="font-mono text-slate-900 dark:text-white shrink-0 font-semibold">
                    {formatToman(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Coupon Code Input */}
            <div className="pt-3 border-t border-slate-100 dark:border-white/5 space-y-2">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                کد تخفیف یا کارت هدیه:
              </span>
              {appliedCoupon ? (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold font-mono ml-2">
                      {appliedCoupon.code}
                    </span>
                    <span className="text-slate-600 dark:text-slate-300 text-[11px]">
                      ({appliedCoupon.description})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    dir="ltr"
                    placeholder="MAYA10 یا HEALTH50"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-mono text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-white text-xs font-bold transition cursor-pointer"
                  >
                    اعمال کد
                  </button>
                </div>
              )}
              {couponError && (
                <p className="text-[11px] text-rose-500 dark:text-rose-400">{couponError}</p>
              )}
            </div>

            {/* Calculations Breakdown */}
            <div className="pt-3 border-t border-slate-100 dark:border-white/5 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span>مجموع ارزش کالاها:</span>
                <span className="font-mono text-slate-900 dark:text-white font-medium">{formatToman(totalAmount)}</span>
              </div>

              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                <span>هزینه بسته‌بندی و ارسال:</span>
                <span className="font-mono font-medium">
                  {shippingCost === 0 ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">رایگان (سقف خرید)</span>
                  ) : (
                    <span className="text-slate-900 dark:text-white">{formatToman(shippingCost)}</span>
                  )}
                </span>
              </div>

              {couponDiscount > 0 && (
                <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                  <span>{quote?.discountSource === "AMBASSADOR" || quote?.discountSource === "WHOLESALE" ? quote.discountLabel : `تخفیف کوپن (${appliedCoupon?.code})`}:</span>
                  <span className="font-mono font-bold">- {formatToman(couponDiscount)}</span>
                </div>
              )}

              {walletDeduction > 0 && (
                <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
                  <span>کسر از کیف پول مایا:</span>
                  <span className="font-mono font-bold">- {formatToman(walletDeduction)}</span>
                </div>
              )}

              <div className="flex items-baseline justify-between pt-3 border-t border-slate-200 dark:border-white/10">
                <span className="text-sm font-bold text-slate-900 dark:text-white">مبلغ نهایی پرداخت:</span>
                <span className="text-xl font-black text-emerald-500 font-mono">
                  {formatToman(netOnlinePayable)}
                </span>
              </div>
            </div>

            {/* Submit CTA */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs sm:text-sm shadow-xl shadow-emerald-500/20 transition active:scale-[0.98] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-black/30 border-t-black animate-spin"></span>
                  <span>در حال انتقال به درگاه بانکی...</span>
                </>
              ) : (
                <>
                  <span>
                    {paymentMethod === "WALLET" && netOnlinePayable === 0
                      ? "تایید و پرداخت نهایی با کیف پول"
                      : "تایید و اتصال به درگاه پرداخت"}
                  </span>
                  <span>➔</span>
                </>
              )}
            </button>

            {/* Trust Strip */}
            <div className="flex items-center justify-center gap-3 text-[10px] text-slate-400 dark:text-slate-500 pt-1">
              <span>🔒 رمزنگاری ۲۵۶ بیتی SSL</span>
              <span>•</span>
              <span>🛡️ ضمانت بازگشت وجه</span>
              <span>•</span>
              <span>⚡ پشتیبانی فوری</span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
