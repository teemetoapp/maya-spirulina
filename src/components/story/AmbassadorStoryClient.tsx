"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AmbassadorItem } from "@/data/ambassadors";
import { ClinicalCaseStudy } from "@/data/case-studies";
import { formatToman, toPersianDigits } from "@/lib/currency";
import { useCart } from "@/lib/cart-context";

interface AmbassadorStoryClientProps {
  ambassador: AmbassadorItem;
  caseStudies: ClinicalCaseStudy[];
}

export default function AmbassadorStoryClient({
  ambassador,
  caseStudies,
}: AmbassadorStoryClientProps) {
  const { addItem, setIsOpen } = useCart();
  const [isCopied, setIsCopied] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);

  const protocol = ambassador.prescribedProtocol;

  const handleAddProtocolToCart = () => {
    addItem({
      id: protocol.packageSku,
      slug: protocol.packageSlug,
      title: `${protocol.packageName} (پروتکل تجویزی ${ambassador.fullName})`,
      sku: protocol.packageSku,
      price: protocol.discountedPrice,
      compareAtPrice: protocol.packagePrice,
      icon: "🌿",
      category: "protocol",
      categoryLabel: "پروتکل بالینی سفیر",
      gradient: "from-emerald-600 to-teal-800",
    });

    setAddedSuccess(true);
    setTimeout(() => {
      setAddedSuccess(false);
      setIsOpen(true);
    }, 400);
  };

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  return (
    <div className="min-h-screen bg-[#070a10] text-slate-100 selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* 1. TOP CO-BRANDED BAR */}
      <div className="border-b border-white/10 bg-[#0d121c]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="size-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
              <span className="text-xs sm:text-sm font-black tracking-tight text-white group-hover:text-emerald-400 transition">
                اسپیرولینا مایا
              </span>
            </Link>
            <span className="text-zinc-600">/</span>
            <span className="text-xs text-zinc-400 hidden sm:inline">داستان بالینی سفیر سلامت</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {ambassador.badge}
            </span>
            <button
              onClick={handleShare}
              className="p-1.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-zinc-300 border border-white/10 transition flex items-center gap-1"
            >
              <svg className="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              <span>{isCopied ? "لینک کپی شد ✓" : "اشتراک‌گذاری"}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12 space-y-12">
        {/* 2. AMBASSADOR HERO SPOTLIGHT */}
        <section className="relative rounded-3xl p-6 sm:p-10 bg-gradient-to-b from-[#0e1626] to-[#0a0f1a] border border-white/10 overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6 sm:gap-8">
            {/* Avatar / Portrait Card */}
            <div className="relative shrink-0">
              <div className={`size-24 sm:size-28 rounded-2xl ${ambassador.avatarColor} text-white font-black text-3xl sm:text-4xl flex items-center justify-center shadow-2xl border-2 border-emerald-400/40`}>
                {ambassador.avatarInitial}
              </div>
              <span className="absolute -bottom-2 -left-2 px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/80 text-emerald-300 border border-emerald-500/40 backdrop-blur-xs">
                تأییدشده
              </span>
            </div>

            {/* Profile Info */}
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  {ambassador.fullName}
                </h1>
                {ambassador.medicalLicenseNo && (
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-white/5 text-zinc-400 border border-white/10">
                    نظام پزشکی: {ambassador.medicalLicenseNo}
                  </span>
                )}
              </div>

              <p className="text-xs sm:text-sm text-emerald-400 font-medium">
                {ambassador.specialty}
              </p>

              <p className="text-xs text-zinc-400">
                {ambassador.institution} • {ambassador.city}
              </p>

              {/* 4 Stats Chips */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3">
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-center">
                  <span className="text-[10px] text-zinc-500 block">مراجعین فعال تحت پروتکل</span>
                  <span className="text-sm font-bold text-white font-mono">
                    {toPersianDigits(ambassador.metrics.activePatientsCount)}+ نفر
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-center">
                  <span className="text-[10px] text-zinc-500 block">پرونده بالینی مستند</span>
                  <span className="text-sm font-bold text-emerald-400 font-mono">
                    {toPersianDigits(ambassador.metrics.documentedCasesCount)} کیس
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-center">
                  <span className="text-[10px] text-zinc-500 block">نرخ رضایت مراجعین</span>
                  <span className="text-sm font-bold text-amber-300 font-mono">
                    {toPersianDigits(ambassador.metrics.patientSatisfactionRate)}٪
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 text-center">
                  <span className="text-[10px] text-zinc-500 block">سابقه طبابت تخصصی</span>
                  <span className="text-sm font-bold text-sky-400 font-mono">
                    {toPersianDigits(ambassador.metrics.yearsOfExperience)} سال
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Hero Quote Card */}
          <div className="mt-6 pt-6 border-t border-white/10 relative">
            <span className="text-3xl text-emerald-500/30 absolute -top-1 right-2 select-none font-serif">“</span>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed italic pr-6">
              {ambassador.heroQuote}
            </p>
          </div>
        </section>

        {/* 3. PERSONAL TRANSFORMATION STORY */}
        <section className="space-y-6">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">
              {ambassador.personalStory.headline}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl bg-[#0d121c] border border-white/8 space-y-2">
              <span className="text-xs font-semibold text-rose-400 flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-rose-400" />
                وضعیت اولیه قبل از کشف مایا:
              </span>
              <p className="text-xs text-zinc-300 leading-relaxed">
                {ambassador.personalStory.beforeCondition}
              </p>
              <p className="text-[11px] text-zinc-500 pt-1">
                {ambassador.personalStory.discoveryContext}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-emerald-500/[0.04] border border-emerald-500/20 space-y-2">
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                تحول پس از دوره اشباع سلولی مایا:
              </span>
              <p className="text-xs text-zinc-200 leading-relaxed">
                {ambassador.personalStory.afterTransformation}
              </p>
              <p className="text-[11px] text-emerald-400/80 pt-1">
                {ambassador.personalStory.whyMaya}
              </p>
            </div>
          </div>

          {/* Biomarkers Table of the Ambassador Himself/Herself */}
          <div className="p-5 rounded-2xl bg-zinc-900/60 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <span>📊 تغییرات آزمایش خون شخص {ambassador.fullName}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-zinc-400">سند آزمایشگاهی تاییدشده</span>
              </span>
              <span className="text-[11px] text-zinc-400 font-mono">طول دوره: ۶۰ روز مصرف مداوم</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {ambassador.selfBiomarkerImprovement.map((b, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                  <span className="text-[11px] text-zinc-400 block font-medium">{b.marker}</span>
                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-xs text-rose-400 line-through font-mono">
                      {toPersianDigits(b.beforeValue)}
                    </span>
                    <span className="text-xs text-zinc-500">←</span>
                    <span className="text-sm font-bold text-emerald-400 font-mono">
                      {toPersianDigits(b.afterValue)} {b.unit}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4. PRESCRIBED CLINICAL PROTOCOL CARD (HERO ACTION) */}
        <section className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-emerald-950/40 via-[#0d121c] to-[#070a10] border-2 border-emerald-500/40 shadow-[0_0_35px_rgba(16,185,129,0.12)] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500 text-black">
                  توصیه رسمی سفیر
                </span>
                <span className="text-xs text-emerald-400 font-medium font-mono">
                  کد تخفیف اختصاصی: {ambassador.referralCode}
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white mt-1.5">
                {protocol.packageName}
              </h3>
            </div>

            <div className="text-right sm:text-left">
              <span className="text-xs text-zinc-400 line-through block font-mono">
                {formatToman(protocol.packagePrice)}
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-emerald-400 font-mono">
                  {formatToman(protocol.discountedPrice)}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                  {toPersianDigits(protocol.discountPercent)}٪ تخفیف معرف
                </span>
              </div>
            </div>
          </div>

          {/* Dosage & Clinical Instructions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-1.5">
              <span className="text-zinc-400 text-[11px] block font-medium">📋 نحوه و دوز مصرف پیشنهادی {ambassador.fullName}:</span>
              <p className="text-zinc-200 leading-relaxed font-semibold">
                {protocol.dailyDosage}
              </p>
              <p className="text-[11px] text-zinc-400">
                زمان بهینه: {protocol.consumptionTiming}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-1.5">
              <span className="text-emerald-400 text-[11px] block font-medium">💡 ترفند هم‌افزایی جذب (Synergy Tip):</span>
              <p className="text-zinc-300 leading-relaxed">
                {protocol.synergyTip}
              </p>
              <div className="flex flex-wrap gap-1 pt-1">
                {protocol.targetConditions.map((cond, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-zinc-300">
                    ✓ {cond}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Direct One-Click Cart Button */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-4">
            <button
              onClick={handleAddProtocolToCart}
              disabled={addedSuccess}
              className={`w-full sm:flex-1 py-3.5 px-6 rounded-2xl font-bold text-sm transition flex items-center justify-center gap-2 shadow-xl ${
                addedSuccess
                  ? "bg-emerald-500 text-black shadow-emerald-500/40"
                  : "bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 text-black hover:opacity-95 shadow-emerald-500/25 cursor-pointer"
              }`}
            >
              {addedSuccess ? (
                <>
                  <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>به سبد خرید شما افزوده شد! در حال هدایت...</span>
                </>
              ) : (
                <>
                  <svg className="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  <span>افزودن پروتکل پیشنهادی {ambassador.fullName} با ۱۰٪ تخفیف به سبد خرید</span>
                </>
              )}
            </button>

            <div className="text-[11px] text-zinc-400 text-center sm:text-right shrink-0 space-y-0.5">
              <span className="text-emerald-400 font-bold block">✓ ارسال رایگان با پست پیشتاز</span>
              <span>کد معرف {ambassador.referralCode} خودکار فعال می‌شود</span>
            </div>
          </div>
        </section>

        {/* 5. VERIFIED CLINICAL CASES BY THIS AMBASSADOR */}
        {caseStudies.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-400" />
                <h2 className="text-lg font-bold text-white tracking-tight">
                  پرونده‌های بالینی مستند زیر نظر {ambassador.fullName}
                </h2>
              </div>
              <span className="text-xs text-zinc-400 font-mono">
                {toPersianDigits(caseStudies.length)} پرونده آزمایشگاهی تاییدشده
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {caseStudies.map((cs) => (
                <div
                  key={cs.id}
                  className="p-5 rounded-2xl bg-[#0d121c] border border-white/8 hover:border-emerald-500/30 transition space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-white/6">
                      <span className="text-xs font-bold text-white">{cs.patientAnonymousTitle}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        {cs.prescribedMayaPackage.durationDays} روز مصرف
                      </span>
                    </div>

                    <div className="text-xs space-y-1">
                      <p className="text-zinc-400 text-[11px]">
                        <span className="text-zinc-500">شکایت اولیه:</span> {cs.primaryComplaint}
                      </p>
                    </div>

                    {/* Biomarker Comparisons */}
                    <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-2">
                      <span className="text-[10px] text-zinc-400 block font-medium">سند تغییرات آزمایش خون:</span>
                      {cs.biomarkers.map((bm, bIdx) => (
                        <div key={bIdx} className="flex items-center justify-between text-xs">
                          <span className="text-zinc-300 text-[11px]">{bm.name}</span>
                          <div className="flex items-center gap-2 font-mono">
                            <span className="text-rose-400 text-[11px]">{toPersianDigits(bm.baselineValue)}</span>
                            <span className="text-zinc-500">→</span>
                            <span className="text-emerald-400 font-bold">{toPersianDigits(bm.followupValue)} {bm.unit}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <p className="text-xs text-zinc-300 leading-relaxed italic pr-2 border-r-2 border-emerald-500/40">
                      «{cs.patientVerbatimFeedback}»
                    </p>
                  </div>

                  <div className="pt-2 border-t border-white/6 text-[10px] text-zinc-400 flex items-center justify-between">
                    <span>ثبت بالینی: {cs.submittedAt}</span>
                    <span className="text-emerald-400">پایبندی به دوز: {toPersianDigits(cs.complianceRatePercent)}٪</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 6. SCIENTIFIC TRUST & FOOTER */}
        <section className="p-6 rounded-2xl bg-zinc-900/40 border border-white/8 text-center space-y-2 text-xs text-zinc-400">
          <p className="font-semibold text-zinc-300">
            محتوای این صفحه بر اساس تجربه بالینی مستند {ambassador.fullName} و شواهد آزمایشگاهی مراجعین کلینیک ایشان تنظیم شده است.
          </p>
          <p className="text-[11px] text-zinc-500">
            اسپیرولینا مایا به عنوان سوپرفود خالص ارگانیک، دارای گواهی اصالت کشت ایزوله و آنالیز فاقد سموم کشاورزی و فلزات سنگین است.
          </p>
          <div className="pt-2">
            <Link href="/" className="text-emerald-400 hover:underline text-xs">
              ← بازگشت به صفحه اصلی مایا اسپیرولینا
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
