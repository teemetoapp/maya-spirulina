"use client";

import React, { useState } from "react";
import { toPersianDigits } from "@/lib/currency";

export type BannerPosition = "HERO_SLIDER" | "MIDDLE_GRID" | "BOTTOM_FULL";

export interface PromoBanner {
  id: string;
  title: string;
  subtitle: string;
  position: BannerPosition;
  targetLink: string;
  ctaText: string;
  bgColor: string;
  textColor: string;
  clicksCount: number;
  isActive: boolean;
  priority: number;
}

const INITIAL_BANNERS: PromoBanner[] = [
  {
    id: "ban-1",
    title: "خلوص ۱۰۰٪ ارگانیک اسپیرولینا مایا",
    subtitle: "تولید مستقیم در مزرعه آفرینش مایا؛ پودر و کپسول اسپیرولینا",
    position: "HERO_SLIDER",
    targetLink: "/#order-section",
    ctaText: "سفارش مستقیم از مزرعه",
    bgColor: "from-neutral-900 via-emerald-950 to-neutral-900",
    textColor: "text-white",
    clicksCount: 1420,
    isActive: true,
    priority: 1,
  },
  {
    id: "ban-2",
    title: "دوره تخصصی ۶۰ روزه سم‌زدایی کبد",
    subtitle: "پاکسازی عمیق با بالاترین ضریب جذب سلولی و آنتی‌اکسیدان فیکوسیانین خالص",
    position: "HERO_SLIDER",
    targetLink: "/#order-section",
    ctaText: "مشاهده دوره و خرید",
    bgColor: "from-neutral-900 via-neutral-800 to-neutral-900",
    textColor: "text-white",
    clicksCount: 890,
    isActive: true,
    priority: 2,
  },
  {
    id: "ban-3",
    title: "انرژی و استقامت ماندگار برای ورزشکاران",
    subtitle: "۶۵٪ پروتئین خالص و جذب آهن ارگانیک بدون احساس افت قند",
    position: "MIDDLE_GRID",
    targetLink: "/#order-section",
    ctaText: "مشاهده جزئیات",
    bgColor: "from-neutral-900 to-neutral-800",
    textColor: "text-white",
    clicksCount: 650,
    isActive: true,
    priority: 3,
  },
  {
    id: "ban-4",
    title: "سفارش عمده و اخذ نمایندگی سفیران سلامت",
    subtitle: "تسهیلات ویژه، پورسانت نقدی و سقف اعتبار خرید ویژه باشگاه مربیان و پزشکان",
    position: "BOTTOM_FULL",
    targetLink: "/#ambassadors",
    ctaText: "ورود به باشگاه سفیران",
    bgColor: "from-emerald-950 via-neutral-900 to-emerald-950",
    textColor: "text-white",
    clicksCount: 460,
    isActive: true,
    priority: 4,
  },
];

export default function BannersCampaignManager() {
  const [banners, setBanners] = useState<PromoBanner[]>(INITIAL_BANNERS);
  const [activeTab, setActiveTab] = useState<"banners" | "popup" | "announcement">("banners");

  // Welcome Popup State
  const [isPopupEnabled, setIsPopupEnabled] = useState(true);
  const [popupTitle, setPopupTitle] = useState("۱۰٪ تخفیف اولین دوره سلامت مایا");
  const [popupSubtitle, setPopupSubtitle] = useState("شماره موبایل خود را وارد کنید تا کد تخفیف اختصاصی برایتان پیامک شود.");
  const [popupCoupon, setPopupCoupon] = useState("MAYA10");
  const [popupDelaySec, setPopupDelaySec] = useState(5);

  // Announcement Bar State
  const [isAnnounceEnabled, setIsAnnounceEnabled] = useState(true);
  const [announceText, setAnnounceText] = useState("ارسال رایگان با پست پیشتاز برای تمامی سفارش‌های دوره کامل اسپیرولینا به سراسر کشور");
  const [announceBgColor, setAnnounceBgColor] = useState("bg-emerald-600");

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleToggleBanner = (id: string) => {
    setBanners((prev) =>
      prev.map((b) => (b.id === id ? { ...b, isActive: !b.isActive } : b))
    );
    triggerToast("وضعیت نمایش بنر تغییر کرد.");
  };

  const handleSavePopup = (e: React.FormEvent) => {
    e.preventDefault();
    triggerToast("تنظیمات پاپ‌آپ تخفیف ورودی با موفقیت ذخیره شد.");
  };

  const handleSaveAnnounce = (e: React.FormEvent) => {
    e.preventDefault();
    triggerToast("نوار اعلان بالای سایت با موفقیت به‌روزرسانی شد.");
  };

  const activeBannersCount = banners.filter((b) => b.isActive).length;
  const totalClicks = banners.reduce((acc, b) => acc + b.clicksCount, 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-50 bg-slate-900/90 text-white dark:bg-white dark:text-slate-900 px-5 py-3 rounded-xl shadow-2xl backdrop-blur-md border border-slate-700/50 dark:border-slate-200 flex items-center gap-3 animate-fade-in text-sm font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* Header */}
      {/* ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-bg-card p-6 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-xl md:text-2xl font-bold text-neutral-900 dark:text-white">
              مدیریت بنرها، پاپ‌آپ ورودی و اعلان‌های تبلیغاتی (Promotional Banners)
            </h1>
          </div>
          <p className="text-xs md:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            شخصی‌سازی بنرهای صفحه نخست، پاپ‌آپ کد تخفیف اولین دوره و نوار اعلان متحرک بالای فروشگاه
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => triggerToast("پنجره افزودن بنر جدید باز شد.")}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs shadow-[0_0_12px_rgba(16,185,129,0.25)] transition-all cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>افزودن بنر اسلایدر جدید</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4 Marketing KPI Cards */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Banners */}
        <div className="bg-bg-card rounded-2xl p-5 border border-slate-200/80 dark:border-white/10 shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              بنرهای فعال در سایت
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl md:text-3xl font-black text-emerald-500">
              {toPersianDigits(activeBannersCount)}
            </span>
            <span className="text-xs text-slate-500">از {toPersianDigits(banners.length)} بنر کل</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            <span>اسلایدرهای باکیفیت و بهینه‌سازی‌شده</span>
          </div>
        </div>

        {/* Total Clicks */}
        <div className="bg-bg-card rounded-2xl p-5 border border-slate-200/80 dark:border-white/10 shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              کلیک روی بنرهای تبلیغاتی
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white">
              {toPersianDigits(totalClicks)}
            </span>
            <span className="text-xs text-slate-500">کلیک خریداران</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            <span>نرخ تعامل (CTR): ۴.۸٪</span>
          </div>
        </div>

        {/* Popup Status */}
        <div className="bg-bg-card rounded-2xl p-5 border border-slate-200/80 dark:border-white/10 shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              پاپ‌آپ تخفیف اولین خرید
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
              </svg>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-lg md:text-xl font-black text-amber-600 dark:text-amber-400">
              {isPopupEnabled ? "فعال و هوشمند" : "غیرفعال"}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 font-medium">
            <span>تاخیر نمایش: {toPersianDigits(popupDelaySec)} ثانیه پس از ورود</span>
          </div>
        </div>

        {/* Announcement Bar Status */}
        <div className="bg-bg-card rounded-2xl p-5 border border-slate-200/80 dark:border-white/10 shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              نوار اعلان بالای سایت
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-lg md:text-xl font-black text-slate-900 dark:text-white">
              {isAnnounceEnabled ? "در حال نمایش" : "مخفی"}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium truncate">
            <span>اطلاع‌رسانی ارسال رایگان</span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3 Sub-Tabs */}
      {/* ======================================================== */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-neutral-200 dark:border-white/10">
        <button
          onClick={() => setActiveTab("banners")}
          className={`nav-tab-base ${
            activeTab === "banners" ? "nav-tab-active" : "nav-tab-inactive"
          }`}
        >
          <span>بنرهای اسلایدر صفحه اصلی</span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
            activeTab === "banners"
              ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-bold"
              : "bg-neutral-100 dark:bg-white/10 text-neutral-600 dark:text-neutral-400"
          }`}>
            {toPersianDigits(activeBannersCount)}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("popup")}
          className={`nav-tab-base ${
            activeTab === "popup" ? "nav-tab-active" : "nav-tab-inactive"
          }`}
        >
          <span>پاپ‌آپ ورودی و لید کپچر</span>
        </button>

        <button
          onClick={() => setActiveTab("announcement")}
          className={`nav-tab-base ${
            activeTab === "announcement" ? "nav-tab-active" : "nav-tab-inactive"
          }`}
        >
          <span>نوار متحرک اعلان هدر</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* Tab 1: Banners Grid & Previews */}
      {/* ======================================================== */}
      {activeTab === "banners" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {banners.map((banner) => (
            <div
              key={banner.id}
              className={`rounded-2xl border p-5 transition-all relative overflow-hidden flex flex-col justify-between ${
                banner.isActive
                  ? "bg-bg-card border-slate-200 dark:border-white/10 shadow-xs"
                  : "bg-bg-page/50 border-slate-200/60 dark:border-white/10/60 opacity-60"
              }`}
            >
              {/* Banner visual preview card */}
              <div className={`rounded-xl p-5 bg-linear-to-r ${banner.bgColor} text-white shadow-md relative overflow-hidden mb-4`}>
                <div className="relative z-10 space-y-2">
                  <span className="text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-xs">
                    {banner.position === "HERO_SLIDER" ? "اسلایدر اصلی هدر" : banner.position === "MIDDLE_GRID" ? "بنر میانی" : "بنر پایانی"}
                  </span>
                  <h3 className="font-black text-base md:text-lg leading-tight">
                    {banner.title}
                  </h3>
                  <p className="text-xs text-slate-200 line-clamp-2">
                    {banner.subtitle}
                  </p>
                  <div className="pt-2">
                    <span className="inline-block px-3 py-1.5 rounded-lg bg-white text-slate-900 font-bold text-xs shadow-xs">
                      {banner.ctaText}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats & Actions */}
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-white/10">
                <div className="flex items-center gap-3 text-slate-500">
                  <span>کلیک‌ها: <strong className="text-slate-800 dark:text-white font-mono">{toPersianDigits(banner.clicksCount)}</strong></span>
                  <span>اولویت: <strong className="text-slate-800 dark:text-white font-mono">{toPersianDigits(banner.priority)}</strong></span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleBanner(banner.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      banner.isActive
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {banner.isActive ? "فعال در سایت" : "غیرفعال"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ======================================================== */}
      {/* Tab 2: Welcome Discount Popup */}
      {/* ======================================================== */}
      {activeTab === "popup" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Settings Form */}
          <div className="bg-bg-card rounded-2xl p-6 border border-slate-200/80 dark:border-white/10 shadow-xs">
            <h3 className="text-base font-black text-slate-800 dark:text-white mb-4">
              تنظیمات پاپ‌آپ خوش‌آمدگویی و دریافت شماره موبایل
            </h3>

            <form onSubmit={handleSavePopup} className="space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-bg-page border border-slate-200/60 dark:border-white/10">
                <div>
                  <span className="font-bold text-xs text-slate-800 dark:text-white">وضعیت نمایش پاپ‌آپ</span>
                  <p className="text-[11px] text-slate-500">هنگام ورود کاربر به ویترین فروشگاه مایا اسپیرولینا</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPopupEnabled(!isPopupEnabled)}
                  className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                    isPopupEnabled ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                      isPopupEnabled ? "left-1" : "right-1"
                    }`}
                  />
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  عنوان جذاب پاپ‌آپ:
                </label>
                <input
                  type="text"
                  value={popupTitle}
                  onChange={(e) => setPopupTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-bg-page border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  توضیحات و پیشنهاد ارزش:
                </label>
                <textarea
                  rows={2}
                  value={popupSubtitle}
                  onChange={(e) => setPopupSubtitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-bg-page border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-hidden focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    کوپن تخفیف متصل:
                  </label>
                  <input
                    type="text"
                    value={popupCoupon}
                    onChange={(e) => setPopupCoupon(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-bg-page border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-800 dark:text-white font-mono focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    تاخیر نمایش (ثانیه):
                  </label>
                  <input
                    type="number"
                    value={popupDelaySec}
                    onChange={(e) => setPopupDelaySec(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-bg-page border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                >
                  ذخیره تنظیمات پاپ‌آپ
                </button>
              </div>
            </form>
          </div>

          {/* Live Popup Preview */}
          <div className="bg-slate-100 dark:bg-bg-page p-6 rounded-2xl border border-slate-200 dark:border-white/10 flex flex-col justify-center items-center">
            <span className="text-xs text-slate-400 font-bold mb-4">پیش‌نمایش بصری پاپ‌آپ در صفحه خریدار:</span>
            <div className="bg-bg-card rounded-2xl border border-emerald-500/30 shadow-2xl p-6 max-w-sm w-full text-center space-y-3 relative overflow-hidden">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center font-bold text-xl mx-auto shadow-md">
                ✨
              </div>
              <h4 className="font-black text-slate-900 dark:text-white text-base">
                {popupTitle}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {popupSubtitle}
              </p>
              <div className="pt-2 space-y-2">
                <input
                  type="text"
                  placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                  disabled
                  className="w-full px-3 py-2 text-center text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl"
                />
                <button
                  type="button"
                  className="w-full py-2 rounded-xl bg-emerald-500 text-black font-extrabold text-xs shadow-xs"
                >
                  دریافت کد تخفیف {popupCoupon}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* Tab 3: Announcement Top Bar */}
      {/* ======================================================== */}
      {activeTab === "announcement" && (
        <div className="bg-bg-card rounded-2xl p-6 border border-slate-200/80 dark:border-white/10 shadow-xs space-y-6">
          <h3 className="text-base font-black text-slate-800 dark:text-white">
            پیکربندی نوار متحرک بالای سایت (Announcement Bar)
          </h3>

          <form onSubmit={handleSaveAnnounce} className="space-y-4 max-w-2xl">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-bg-page border border-slate-200/60 dark:border-white/10">
              <div>
                <span className="font-bold text-xs text-slate-800 dark:text-white">فعال بودن نوار اعلان</span>
                <p className="text-[11px] text-slate-500">نمایش در بالاترین بخش تمام صفحات فروشگاه</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAnnounceEnabled(!isAnnounceEnabled)}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  isAnnounceEnabled ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-700"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                    isAnnounceEnabled ? "left-1" : "right-1"
                  }`}
                />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                متن پیام اعلان:
              </label>
              <input
                type="text"
                value={announceText}
                onChange={(e) => setAnnounceText(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-bg-page border border-slate-200 dark:border-white/10 rounded-xl text-xs text-slate-800 dark:text-white focus:outline-hidden focus:border-emerald-500"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
              >
                ذخیره و انتشار نوار اعلان
              </button>
            </div>
          </form>

          {/* Live Announcement Bar Preview */}
          <div className="pt-4 border-t border-slate-200 dark:border-white/10">
            <span className="text-xs text-slate-400 font-bold block mb-2">پیش‌نمایش زنده در بالای سایت:</span>
            <div className={`p-2.5 rounded-xl text-center text-white text-xs font-bold shadow-md ${announceBgColor}`}>
              {announceText}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
