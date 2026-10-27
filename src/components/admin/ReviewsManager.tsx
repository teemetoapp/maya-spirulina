"use client";

import React, { useState } from "react";
import { toPersianDigits } from "@/lib/currency";

export type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface ProductReview {
  id: string;
  customerName: string;
  customerPhone: string;
  isVerifiedBuyer: boolean;
  orderNumber?: string;
  productTitle: string;
  productSlug: string;
  rating: number; // 1 to 5
  skinType?: string; // e.g. "پوست چرب و مستعد آکنه", "پوست خشک و دهیدراته"
  ageGroup?: string; // e.g. "۲۵ الی ۳۴ سال"
  title: string;
  comment: string;
  pros: string[];
  cons: string[];
  status: ReviewStatus;
  isPinned: boolean;
  adminReply?: {
    author: string;
    text: string;
    date: string;
  };
  createdAt: string;
  likesCount: number;
}

const INITIAL_REVIEWS: ProductReview[] = [
  {
    id: "rev-1",
    customerName: "سارا محمدی",
    customerPhone: "0912***4567",
    isVerifiedBuyer: true,
    orderNumber: "ORD-140308-4921",
    productTitle: "بسته ۶۰ روزه طلایی کپسول اسپیرولینا مایا (۲۴۰ کپسول ۵۰۰mg)",
    productSlug: "maya-tab-240",
    rating: 5,
    skinType: "افزایش انرژی و رفع خستگی مزمن",
    ageGroup: "۳۱ سال",
    title: "خداحافظی با خستگی بعدازظهرها و افت انرژی سر کار",
    comment:
      "حدود یک ماهه که هر روز صبح ۲ عدد کپسول همراه با یک لیوان آب بزرگ مصرف می‌کنم. سطح انرژیم فوق‌العاده پایدار شده و دیگه بعد از ناهار اون افت انرژی شدید رو ندارم. هضم کپسول‌ها هم بسیار راحته و اصلاً طعم یا بوی خاصی نداره.",
    pros: ["افزایش انرژی پایدار", "بدون طعم جلبک", "هضم بسیار آسان"],
    cons: [],
    status: "APPROVED",
    isPinned: true,
    adminReply: {
      author: "دکتر نیلوفر آریا (مشاور تغذیه و بیوتکنولوژی مایا)",
      text: "سلام سارای عزیز، بسیار خوشحالیم که اثربخشی اسپیرولینا مایا را به خوبی حس کرده‌اید. مصرف منظم را تا انتهای دوره ۶۰ روزه ادامه دهید تا آهن و پروتئین‌های فعال فیکوسیانین اثر بازسازی سلولی خود را تکمیل نمایند.",
      date: "۱۴۰۳/۰۸/۲۴",
    },
    createdAt: "۱۴۰۳/۰۸/۲۳",
    likesCount: 24,
  },
  {
    id: "rev-2",
    customerName: "مهرداد حسینی (مربی فیتنس)",
    customerPhone: "0935***8812",
    isVerifiedBuyer: true,
    orderNumber: "ORD-140308-4890",
    productTitle: "پودر خالص میکرونیزه اسپیرولینا مایا (بسته ۲۵۰ گرمی)",
    productSlug: "maya-pow-250",
    rating: 5,
    skinType: "ریکاوری عضلانی و پروتئین گیاهی",
    ageGroup: "۲۸ سال",
    title: "بهترین مکمل پروتئینی بعد از تمرین بدون هیچ ماده افزودنی",
    comment:
      "یک اسکوپ پودر رو با آب کرفس و سیب یا شیر بادام بعد از تمرین اسکوات مخلوط می‌کنم. درد عضلانی روز بعد (DOMS) به طرز چشمگیری کم شده و به عنوان یک منبع طبیعی پروتئین ۶۵٪ فوق‌العاده‌ست.",
    pros: ["پودر بسیار نرم و حلالیت بالا", "خلوص ۱۰۰٪ بدون شکر یا قند افزودنی", "ریکاوری سریع عضلات"],
    cons: [],
    status: "APPROVED",
    isPinned: true,
    createdAt: "۱۴۰۳/۰۸/۲۴",
    likesCount: 18,
  },
  {
    id: "rev-3",
    customerName: "الهام کریمی",
    customerPhone: "0919***1234",
    isVerifiedBuyer: true,
    orderNumber: "ORD-140308-4876",
    productTitle: "بسته ۳۰ روزه کپسول اسپیرولینا مایا (۱۲۰ کپسول)",
    productSlug: "maya-tab-120",
    rating: 5,
    skinType: "بهبود کم‌خونی و فریتین",
    ageGroup: "۳۸ سال",
    title: "بهبود چشمگیر آزمایش خون و کم‌خونی فقر آهن",
    comment:
      "با اینکه معده‌ام به قرص‌های آهن شیمیایی به شدت حساسه و اذیت می‌شد، کپسول اسپیرولینا مایا هیچ عارضه گوارشی نداشت و بعد از دو ماه فریتین خونم از ۹ به ۲۲ رسید. بسته‌بندی قوطی هم بسیار بهداشتی و شیک بود.",
    pros: ["جذب آهن عالی", "بدون عارضه گوارشی", "بسته‌بندی مقاوم به نور"],
    cons: [],
    status: "APPROVED",
    isPinned: false,
    adminReply: {
      author: "تیم علمی و پشتیبانی مزرعه مایا",
      text: "سلام الهام عزیز، آهن موجود در جلبک اسپیرولینا پیوند زیستی (Bio-available) دارد و بر خلاف نمک‌های فروس، مخاط دستگاه گوارش را ملتهب نمی‌کند. برای شما تندرستی روزافزون آرزومندیم.",
      date: "۱۴۰۳/۰۸/۲۱",
    },
    createdAt: "۱۴۰۳/۰۸/۲۰",
    likesCount: 31,
  },
  {
    id: "rev-4",
    customerName: "دکتر فرزاد رادمهر",
    customerPhone: "0912***9988",
    isVerifiedBuyer: true,
    orderNumber: "ORD-140308-4850",
    productTitle: "بسته ۱۲۰ روزه کامل خانوادگی + هدیه شیکر دوجداره مایا",
    productSlug: "maya-bnd-gold",
    rating: 5,
    skinType: "سم‌زدایی و تنظیم آنزیم‌های کبد",
    ageGroup: "۴۵ سال",
    title: "کیفیت فارماکوپه‌ای استاندارد و آزمایشگاهی مزرعه مایا",
    comment:
      "به عنوان پزشک، برگه آنالیز میکروبی و فلزات سنگین محصول را بررسی کردم. خلوص فیکوسیانین بالای ۱۸٪ و عدم وجود آلودگی نشان‌دهنده محیط کشت بسته و کنترل‌شده این برند است. برای اعضای خانواده تهیه کردم.",
    pros: ["دارای برگه آنالیز آزمایشگاهی معتبر", "ارزش خرید اقتصادی پکیج ۱۲۰ روزه", "کیفیت درجه یک شیکر هدیه"],
    cons: [],
    status: "APPROVED",
    isPinned: false,
    createdAt: "۱۴۰۳/۰۸/۲۴",
    likesCount: 42,
  },
  {
    id: "rev-5",
    customerName: "کاربر ناشناس",
    customerPhone: "0930***0000",
    isVerifiedBuyer: false,
    productTitle: "پودر سوپرفود اسپیرولینا خالص ۱۰۰ گرمی",
    productSlug: "maya-pow-100",
    rating: 2,
    skinType: "طعم‌شناسی",
    title: "طعم طبیعی جلبک برای من کمی سنگین بود",
    comment: "کیفیت پودر و رنگ سبزش واقعاً عالیه ولی چون بوی طبیعی جلبک میده اگر توی آب خالی حل کنید شاید دوست نداشته باشید. باید حتماً توی آبمیوه طبیعی مثل پرتقال یا سیب مخلوط بشه. دفعه بعد کپسول سفارش میدم.",
    pros: ["رنگ سبز زمردی تیره و خالص"],
    cons: ["طعم ویژه جلبک"],
    status: "APPROVED",
    isPinned: false,
    adminReply: {
      author: "مشاور تغذیه مایا",
      text: "سلام دوست عزیز، دقیقاً به همین دلیل برای عزیزانی که به عطر و بوی طبیعی سوپرفودها حساس هستند فرمت کپسول ۵۰۰mg فشرده سرد بدون طعم را طراحی کرده‌ایم.",
      date: "۱۴۰۳/۰۸/۱۹",
    },
    createdAt: "۱۴۰۳/۰۸/۱۹",
    likesCount: 11,
  },
];

export default function ReviewsManager() {
  const [reviews, setReviews] = useState<ProductReview[]>(INITIAL_REVIEWS);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterRating, setFilterRating] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isModuleEnabled, setIsModuleEnabled] = useState(true);

  // Reply Modal State
  const [replyingReview, setReplyingReview] = useState<ProductReview | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replyAuthor, setReplyAuthor] = useState("تیم تخصصی مایا اسپیرولینا");

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Status Change (Approve, Reject)
  const handleSetStatus = (id: string, newStatus: ReviewStatus) => {
    setReviews((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
    );
    const label = newStatus === "APPROVED" ? "تأیید و منتشر شد" : "رد شد";
    triggerToast(`دیدگاه با موفقیت ${label}.`);
  };

  // Toggle Pin / Featured
  const handleTogglePin = (id: string) => {
    setReviews((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isPinned: !r.isPinned } : r))
    );
    const item = reviews.find((r) => r.id === id);
    triggerToast(
      !item?.isPinned
        ? "دیدگاه به عنوان نظر برگزیده پین شد ⭐"
        : "دیدگاه از حالت پین خارج شد."
    );
  };

  // Open Reply Modal
  const handleOpenReplyModal = (review: ProductReview) => {
    setReplyingReview(review);
    setReplyText(review.adminReply?.text || "");
    setReplyAuthor(review.adminReply?.author || "تیم تخصصی مایا اسپیرولینا");
  };

  // Save Reply
  const handleSaveReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyingReview) return;

    setReviews((prev) =>
      prev.map((r) =>
        r.id === replyingReview.id
          ? {
              ...r,
              status: "APPROVED", // Auto-approve when replied
              adminReply: {
                author: replyAuthor,
                text: replyText.trim(),
                date: "۱۴۰۳/۰۸/۲۴",
              },
            }
          : r
      )
    );

    triggerToast(`پاسخ رسمی برای دیدگاه ${replyingReview.customerName} ذخیره و منتشر شد.`);
    setReplyingReview(null);
  };

  // Filtered reviews
  const filteredReviews = reviews.filter((r) => {
    const matchesSearch =
      r.customerName.includes(searchQuery) ||
      r.productTitle.includes(searchQuery) ||
      r.title.includes(searchQuery) ||
      r.comment.includes(searchQuery);

    const matchesStatus =
      filterStatus === "all" ? true : r.status === filterStatus;

    const matchesRating =
      filterRating === "all" ? true : r.rating === Number(filterRating);

    return matchesSearch && matchesStatus && matchesRating;
  });

  // KPI Calculations
  const totalReviews = reviews.length;
  const pendingCount = reviews.filter((r) => r.status === "PENDING").length;
  const approvedCount = reviews.filter((r) => r.status === "APPROVED").length;
  const verifiedCount = reviews.filter((r) => r.isVerifiedBuyer).length;
  const verifiedPercentage = totalReviews > 0 ? Math.round((verifiedCount / totalReviews) * 100) : 0;
  const averageRating = (
    reviews.reduce((acc, curr) => acc + curr.rating, 0) / (totalReviews || 1)
  ).toFixed(1);

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
      {/* Top Header & Modular Switch */}
      {/* ======================================================== */}
      <div className="bg-bg-card rounded-2xl p-5 md:p-6 border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center text-xl shrink-0">
              💬
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white">
                  مدیریت دیدگاه‌ها، نقد و بررسی‌ها
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
                  ماژول وفاداری و UGC
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">
                تأیید نظرات خریداران، پاسخ تخصصی مشاور تغذیه و سلامت مایا و مدیریت امتیازدهی دوره‌ها
              </p>
            </div>
          </div>
        </div>

        {/* Global Module Switch */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10/80 bg-slate-50 dark:bg-slate-800/60">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              نمایش نظرات در فروشگاه:
            </span>
            <button
              onClick={() => {
                setIsModuleEnabled(!isModuleEnabled);
                triggerToast(
                  !isModuleEnabled
                    ? "بخش نظرات در فروشگاه فعال شد."
                    : "بخش نظرات در صفحه محصولات موقتاً خاموش شد."
                );
              }}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                isModuleEnabled ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  isModuleEnabled ? "translate-x-0" : "-translate-x-5"
                }`}
              />
            </button>
            <span
              className={`text-xs font-bold ${
                isModuleEnabled ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"
              }`}
            >
              {isModuleEnabled ? "فعال" : "آفلاین"}
            </span>
          </div>
        </div>
      </div>

      {/* Warning banner when disabled */}
      {!isModuleEnabled && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-2xl p-4 text-amber-800 dark:text-amber-200 flex items-center gap-3">
          <span className="text-2xl">⚠️</span>
          <div className="text-xs md:text-sm leading-relaxed">
            <span className="font-bold">ماژول نمایش دیدگاه‌ها موقتاً غیرفعال است:</span> مشتریان در صفحه کاتالوگ امکان ثبت دیدگاه جدید یا مشاهده نظرات قبلی را ندارند. برای بازگرداندن به حالت زنده، سوئیچ بالا را فعال نمایید.
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4 KPI Summary Cards */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Reviews */}
        <div className="bg-bg-card rounded-2xl p-5 border border-slate-200/80 dark:border-white/10 shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              کل دیدگاه‌های ثبت‌شده
            </span>
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold text-sm">
              📝
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white">
              {toPersianDigits(totalReviews)}
            </span>
            <span className="text-xs text-slate-500">دیدگاه</span>
          </div>
          <div className="mt-2 text-[11px] text-teal-600 dark:text-teal-400 font-medium">
            <span>{toPersianDigits(approvedCount)} دیدگاه منتشرشده</span>
          </div>
        </div>

        {/* Pending Moderation */}
        <div className="bg-bg-card rounded-2xl p-5 border border-slate-200/80 dark:border-white/10 shadow-xs relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              در انتظار بررسی و تأیید
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-sm">
              ⏳
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl md:text-3xl font-black text-amber-500">
              {toPersianDigits(pendingCount)}
            </span>
            <span className="text-xs text-slate-500">دیدگاه جدید</span>
          </div>
          <div className="mt-2 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
            <span>نیازمند تأیید یا پاسخ ادمین</span>
          </div>
        </div>

        {/* Average Rating */}
        <div className="bg-bg-card rounded-xl p-5 border border-neutral-200 dark:border-white/10 shadow-xs relative overflow-hidden group hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400">
              میانگین رضایت محصولات
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 dark:text-amber-400 flex items-center justify-center font-bold text-xs font-mono">
              ★
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-white font-mono">
              {toPersianDigits(averageRating)}
            </span>
            <span className="text-xs text-neutral-500">از ۵ ستاره</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            <span>۹۲٪ رضایت کامل خریداران</span>
          </div>
        </div>

        {/* Verified Buyers */}
        <div className="bg-bg-card rounded-xl p-5 border border-neutral-200 dark:border-white/10 shadow-xs relative overflow-hidden group hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400">
              خریداران تأییدشده
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs font-mono">
              ✓
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl md:text-3xl font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {toPersianDigits(verifiedPercentage)}٪
            </span>
            <span className="text-xs text-neutral-500">دارای فاکتور خرید</span>
          </div>
          <div className="mt-2 text-[11px] text-neutral-500 font-medium">
            <span>اصالت بالای نظرات و اعتماد مشتری</span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* Search and Filters Strip */}
      {/* ======================================================== */}
      <div className="bg-bg-card rounded-xl p-3.5 border border-neutral-200 dark:border-white/10 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="جستجو در متن نظر، نام مشتری یا نام محصول..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-4 pr-10 py-2 bg-neutral-100 dark:bg-white/5 border border-transparent focus:border-neutral-300 dark:focus:border-white/20 rounded-lg text-xs text-neutral-900 dark:text-white placeholder-neutral-400 outline-none transition"
          />
          <svg
            className="w-4 h-4 text-neutral-400 absolute right-3.5 top-2.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="8" strokeWidth={2} />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35" />
          </svg>
        </div>

        {/* Filter Status */}
        <div className="flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-neutral-100 dark:bg-white/5 border border-transparent focus:border-neutral-300 dark:focus:border-white/20 rounded-lg px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-200 outline-none"
          >
            <option value="all">تمام وضعیت‌ها</option>
            <option value="PENDING">در انتظار بررسی ({toPersianDigits(pendingCount)})</option>
            <option value="APPROVED">تأیید و منتشر شده</option>
            <option value="REJECTED">رد شده</option>
          </select>

          {/* Filter Rating */}
          <select
            value={filterRating}
            onChange={(e) => setFilterRating(e.target.value)}
            className="bg-neutral-100 dark:bg-white/5 border border-transparent focus:border-neutral-300 dark:focus:border-white/20 rounded-lg px-3 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-200 outline-none"
          >
            <option value="all">تمام امتیازها</option>
            <option value="5">⭐⭐⭐⭐⭐ ۵ ستاره</option>
            <option value="4">⭐⭐⭐⭐ ۴ ستاره</option>
            <option value="3">⭐⭐⭐ ۳ ستاره</option>
            <option value="1">⭐ ۱ ستاره</option>
          </select>
        </div>
      </div>

      {/* ======================================================== */}
      {/* Reviews Cards List */}
      {/* ======================================================== */}
      <div className="space-y-4">
        {filteredReviews.length === 0 ? (
          <div className="bg-bg-card rounded-2xl p-12 text-center border border-slate-200/80 dark:border-white/10 text-slate-400">
            دیدگاهی مطابق با فیلترهای انتخابی یافت نشد.
          </div>
        ) : (
          filteredReviews.map((rev) => (
            <div
              key={rev.id}
              className={`bg-bg-card rounded-2xl p-5 md:p-6 border transition-all ${
                rev.isPinned
                  ? "border-amber-400/80 dark:border-amber-500/40 shadow-md shadow-amber-500/5"
                  : rev.status === "PENDING"
                  ? "border-amber-300 dark:border-amber-700/60 bg-amber-50/20"
                  : "border-slate-200/80 dark:border-white/10 shadow-xs hover:border-slate-300"
              }`}
            >
              {/* Review Top Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-white/10/80">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-neutral-100 dark:bg-white/10 text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-white/10 flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                    {rev.customerName.slice(0, 1)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {rev.customerName}
                      </span>
                      {rev.isVerifiedBuyer && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-1">
                          <span>✓</span>
                          <span>خریدار تأییدشده</span>
                        </span>
                      )}
                      {rev.isPinned && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center gap-1">
                          <span>📌</span>
                          <span>پین شده در صفحه محصول</span>
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                      <span>شماره همراه: {rev.customerPhone}</span>
                      {rev.skinType && <span>• هدف مصرف: {rev.skinType}</span>}
                      {rev.ageGroup && <span>• سن: {rev.ageGroup}</span>}
                      <span>• تاریخ: {rev.createdAt}</span>
                    </div>
                  </div>
                </div>

                {/* Rating Stars & Status Badge */}
                <div className="flex items-center gap-3 self-end sm:self-center">
                  <div className="flex items-center text-amber-400 text-sm">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className={i < rev.rating ? "opacity-100" : "opacity-25"}>
                        ★
                      </span>
                    ))}
                  </div>

                  {rev.status === "APPROVED" && (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300">
                      منتشر شده ✓
                    </span>
                  )}
                  {rev.status === "PENDING" && (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 animate-pulse">
                      در انتظار بررسی ⏳
                    </span>
                  )}
                  {rev.status === "REJECTED" && (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300">
                      رد شده ✕
                    </span>
                  )}
                </div>
              </div>

              {/* Target Product Strip */}
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl">
                <span className="font-bold text-slate-500">محصول مرتبط:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {rev.productTitle}
                </span>
                {rev.orderNumber && (
                  <span className="text-[11px] font-mono text-slate-400 mr-auto">
                    فاکتور: {rev.orderNumber}
                  </span>
                )}
              </div>

              {/* Review Content */}
              <div className="mt-3 space-y-2">
                <h4 className="font-black text-sm text-slate-800 dark:text-slate-100">
                  {rev.title}
                </h4>
                <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {rev.comment}
                </p>

                {/* Pros & Cons */}
                {(rev.pros.length > 0 || rev.cons.length > 0) && (
                  <div className="flex flex-wrap gap-2 pt-1 text-xs">
                    {rev.pros.map((p, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium flex items-center gap-1"
                      >
                        <span className="text-emerald-500 font-bold">+</span>
                        <span>{p}</span>
                      </span>
                    ))}
                    {rev.cons.map((c, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-0.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-[11px] font-medium flex items-center gap-1"
                      >
                        <span className="text-rose-500 font-bold">-</span>
                        <span>{c}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Admin Official Reply (if any) */}
              {rev.adminReply && (
                <div className="mt-4 p-4 rounded-xl bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/10 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                      <span>{rev.adminReply.author}</span>
                    </div>
                    <span className="text-[10px] font-normal text-neutral-400 font-mono">
                      {rev.adminReply.date}
                    </span>
                  </div>
                  <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed pr-3">
                    {rev.adminReply.text}
                  </p>
                </div>
              )}

              {/* Bottom Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/10/80 flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-slate-400">
                  {toPersianDigits(rev.likesCount)} نفر این نظر را مفید دانستند
                </div>

                <div className="flex items-center gap-2">
                  {/* Pin / Unpin Button */}
                  <button
                    onClick={() => handleTogglePin(rev.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                      rev.isPinned
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                        : "bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    <span>{rev.isPinned ? "📌 پین شده" : "سنجاق به بالای صفحه"}</span>
                  </button>

                  {/* Reply Button */}
                  <button
                    onClick={() => handleOpenReplyModal(rev)}
                    className="px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 text-teal-600 dark:text-teal-400 font-bold text-xs transition flex items-center gap-1"
                  >
                    <span>💬</span>
                    <span>{rev.adminReply ? "ویرایش پاسخ" : "ثبت پاسخ مشاور"}</span>
                  </button>

                  {/* Approve Button */}
                  {rev.status !== "APPROVED" && (
                    <button
                      onClick={() => handleSetStatus(rev.id, "APPROVED")}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition shadow-xs"
                    >
                      ✓ تأیید و انتشار
                    </button>
                  )}

                  {/* Reject Button */}
                  {rev.status !== "REJECTED" && (
                    <button
                      onClick={() => handleSetStatus(rev.id, "REJECTED")}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 text-slate-600 dark:text-slate-400 font-bold text-xs transition"
                    >
                      ✕ رد کردن
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL: OFFICIAL ADMIN REPLY */}
      {/* ======================================================== */}
      {replyingReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-bg-card rounded-2xl border border-slate-200 dark:border-white/10 w-full max-w-lg overflow-hidden shadow-2xl animate-scale-up">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">🌸</span>
                <h3 className="text-base font-black text-slate-800 dark:text-white">
                  ثبت پاسخ رسمی به دیدگاه مشتری
                </h3>
              </div>
              <button
                onClick={() => setReplyingReview(null)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveReply} className="p-5 space-y-4 text-xs md:text-sm">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1">
                <div className="font-bold text-slate-800 dark:text-slate-200">
                  دیدگاه {replyingReview.customerName} برای {replyingReview.productTitle}:
                </div>
                <p className="text-slate-500 text-xs line-clamp-2">
                  &ldquo;{replyingReview.comment}&rdquo;
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  عنوان پاسخ‌دهنده (شناسه رسمی)
                </label>
                <input
                  type="text"
                  required
                  value={replyAuthor}
                  onChange={(e) => setReplyAuthor(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-bg-card border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  متن پاسخ مشاور بیوتی *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="سلام و درود، از همراهی شما با مایا اسپیرولینا سپاسگزاریم..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-bg-card border border-slate-200 dark:border-white/10 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-hidden leading-relaxed"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setReplyingReview(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs shadow-[0_0_12px_rgba(16,185,129,0.25)] cursor-pointer"
                >
                  ذخیره و انتشار پاسخ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
