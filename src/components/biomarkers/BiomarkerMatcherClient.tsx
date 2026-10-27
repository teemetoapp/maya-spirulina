"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { BIOMARKERS_LIST, analyzeBiomarkers } from "@/data/biomarkers";
import { useCart } from "@/lib/cart-context";
import { formatToman, toPersianDigits } from "@/lib/currency";

export default function BiomarkerMatcherClient() {
  const { addItem, setIsOpen } = useCart();

  // Mode: "presets" (Quick scenarios) vs "custom" (Detailed lab values)
  const [activeTab, setActiveTab] = useState<"presets" | "custom">("presets");

  // State for customized lab values
  const [customValues, setCustomValues] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    BIOMARKERS_LIST.forEach((b) => {
      initial[b.id] = b.defaultValue;
    });
    return initial;
  });

  // Selected quick preset
  const [selectedPreset, setSelectedPreset] = useState<string>("liver_fatty");

  const PRESETS = [
    {
      id: "anemia_fatigue",
      title: "کم‌خونی، فریتین پایین و ریزش مو",
      badge: "هماتولوژی",
      icon: "🩸",
      desc: "فریتین کمتر از ۲۰ و هموگلوبین مرزی؛ احساس خواب‌آلودگی، بی‌حالی و تپش قلب حین بالا رفتن از پله.",
      values: {
        ferritin: 14,
        hemoglobin: 10.8,
        alt: 22,
        ast: 24,
        triglycerides: 120,
        crp: 0.8,
        fbs: 88,
      },
    },
    {
      id: "liver_fatty",
      title: "کبد چرب (گرید ۱ و ۲) و آنزیم‌های بالا",
      badge: "کبد و سم‌زدایی",
      icon: "🔬",
      desc: "افزایش آنزیم‌های ALT و AST ناشی از تجمع قطرات تری‌گلیسرید، داروها یا استرس متابولیک.",
      values: {
        ferritin: 85,
        hemoglobin: 13.5,
        alt: 54,
        ast: 46,
        triglycerides: 240,
        crp: 2.4,
        fbs: 108,
      },
    },
    {
      id: "metabolic_lipid",
      title: "تری‌گلیسرید بالا و مقاومت به انسولین",
      badge: "متابولیسم و چربی",
      icon: "⚖️",
      desc: "تری‌گلیسرید بالای ۲۰۰ و قند ناشتای لب‌مرز؛ چاقی احشایی و افت توان سوزاندن کربوهیدرات‌ها.",
      values: {
        ferritin: 70,
        hemoglobin: 14.0,
        alt: 36,
        ast: 32,
        triglycerides: 285,
        crp: 1.9,
        fbs: 118,
      },
    },
    {
      id: "systemic_inflammation",
      title: "التهاب سیستمیک مزمن و دردهای مفصلی",
      badge: "التهاب و ایمنی",
      icon: "🛡️",
      desc: "شاخص hs-CRP بالا، دردهای مزمن عضلانی و اسکلتی و دوره ریکاوری طولانی پس از بیماری یا ورزش.",
      values: {
        ferritin: 60,
        hemoglobin: 13.2,
        alt: 28,
        ast: 29,
        triglycerides: 160,
        crp: 4.2,
        fbs: 95,
      },
    },
    {
      id: "optimal_maintenance",
      title: "چکاپ نرمال (دوره ارتقا و تثبیت طول عمر)",
      badge: "بهینه‌سازی بیومارکر",
      icon: "✨",
      desc: "تمامی مارکرهای روتین آزمایشگاهی در محدوده نرمال؛ با هدف افزایش فوکوس ذهنی و تاخیر پیری سلولی.",
      values: {
        ferritin: 75,
        hemoglobin: 14.5,
        alt: 20,
        ast: 22,
        triglycerides: 110,
        crp: 0.5,
        fbs: 85,
      },
    },
  ];

  // Active values based on tab
  const currentValues = useMemo(() => {
    if (activeTab === "presets") {
      const p = PRESETS.find((item) => item.id === selectedPreset);
      return p ? p.values : PRESETS[0].values;
    }
    return customValues;
  }, [activeTab, selectedPreset, customValues]);

  // Run Real-Time Diagnostic Engine
  const analysis = useMemo(() => {
    return analyzeBiomarkers(currentValues);
  }, [currentValues]);

  const handleCustomChange = (id: string, val: number) => {
    setCustomValues((prev) => ({
      ...prev,
      [id]: val,
    }));
  };

  const handleOrderProtocol = () => {
    addItem({
      id: `maya_biomarker_plan_${analysis.recommendedPlanId}_${analysis.recommendedPlanFormat}`,
      slug: `maya-biomarker-plan-${analysis.recommendedPlanId}`,
      title: `اسپیرولینا مایا - ${analysis.recommendedPlanName}`,
      sku: analysis.recommendedPlanId === 3 ? "MAYA-BND-GOLD" : "MAYA-TAB-240",
      price: analysis.packagePrice,
      compareAtPrice: analysis.packagePrice + 120000,
      icon: "🔬",
      category: analysis.recommendedPlanFormat,
      categoryLabel: "پروتکل آزمایشگاهی",
      gradient: "from-neutral-800 to-neutral-900",
    });
    setIsOpen(true);
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 dark:bg-bg-page dark:text-neutral-100 selection:bg-accent-primary selection:text-white transition-colors">
      {/* 1. Header Banner */}
      <section className="relative overflow-hidden border-b border-neutral-200 dark:border-white/10 bg-neutral-50/50 dark:bg-bg-card py-14 sm:py-20 text-right">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-accent-primary text-xs font-mono font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>AI CLINICAL BIOMARKER MATCHER</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-neutral-900 dark:text-white tracking-tight leading-tight max-w-4xl">
            سامانه تطبیق هوشمند آزمایش خون و نسخه مصرف اختصاصی مایا
          </h1>
          <p className="text-xs sm:text-base text-neutral-600 dark:text-neutral-400 max-w-3xl leading-relaxed">
            شاخص‌های آزمایشگاهی اخیر خود را وارد کنید یا الگوی تشخیصی را برگزینید تا الگوریتم بیوتکنولوژی مایا، بار التهابی و کمبودهای بافتی شما را تحلیل کرده و دقیق‌ترین پروتکل دوزبندی ارگانیک را تجویز کند.
          </p>
        </div>
      </section>

      {/* 2. Main Diagnostic Workspace */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 text-right">
        {/* Toggle Mode: Presets vs Custom Lab Inputs */}
        <div className="flex items-center justify-between flex-wrap gap-4 pb-6 border-b border-neutral-200 dark:border-white/10 mb-8">
          <div className="flex items-center gap-2 p-1 rounded-xl bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10">
            <button
              onClick={() => setActiveTab("presets")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                activeTab === "presets"
                  ? "bg-white text-neutral-900 dark:bg-bg-card dark:text-white shadow-xs border border-neutral-200 dark:border-white/10"
                  : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
              }`}
            >
              <span>⚡ حالت سریع و الگوهای بالینی</span>
            </button>
            <button
              onClick={() => setActiveTab("custom")}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                activeTab === "custom"
                  ? "bg-white text-neutral-900 dark:bg-bg-card dark:text-white shadow-xs border border-neutral-200 dark:border-white/10"
                  : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
              }`}
            >
              <span>🔬 ورود دقیق ارقام برگه آزمایش خون</span>
            </button>
          </div>

          <span className="text-xs text-neutral-400 font-mono">
            ENGINE VERSION: BIO-MATCH 2.4
          </span>
        </div>

        {/* Top Controls based on Tab */}
        {activeTab === "presets" ? (
          <div className="mb-10">
            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">
              یک وضعیت تشخیصی را از برگه آزمایش یا پرونده پزشکی انتخاب کنید:
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {PRESETS.map((preset) => {
                const isSelected = selectedPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => setSelectedPreset(preset.id)}
                    className={`p-4 rounded-xl border text-right transition-all flex flex-col justify-between gap-3 ${
                      isSelected
                        ? "border-accent-primary bg-emerald-500/5 dark:bg-emerald-500/10 shadow-md ring-1 ring-emerald-500/20"
                        : "border-neutral-200 dark:border-white/10 bg-bg-card hover:border-neutral-300 dark:hover:border-white/20"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-lg">{preset.icon}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            isSelected
                              ? "bg-accent-primary text-white dark:bg-accent-primary dark:text-[#070a10]"
                              : "bg-neutral-100 dark:bg-white/5 text-neutral-500"
                          }`}
                        >
                          {preset.badge}
                        </span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-extrabold text-neutral-900 dark:text-white leading-snug">
                        {preset.title}
                      </h4>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
                        {preset.desc}
                      </p>
                    </div>

                    <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-bold">
                      <span>✓ بارگذاری فوری داده‌های این الگو</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mb-10 p-6 rounded-2xl border border-neutral-200 dark:border-white/10 bg-neutral-50/50 dark:bg-bg-card">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-extrabold text-neutral-900 dark:text-white">
                  مقادیر دقیق برگه آزمایش خون خود را ثبت فرمایید:
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  الگوریتم به صورت خودکار مقادیر را با رنج‌های مرجع بین‌المللی مقایسه می‌نماید.
                </p>
              </div>
              <button
                onClick={() => {
                  const reset: Record<string, number> = {};
                  BIOMARKERS_LIST.forEach((b) => (reset[b.id] = b.defaultValue));
                  setCustomValues(reset);
                }}
                className="text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-white transition"
              >
                بازنشانی مقادیر ↺
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {BIOMARKERS_LIST.map((bio) => {
                const val = customValues[bio.id] ?? bio.defaultValue;
                const isLow = val < bio.normalMin;
                const isHigh = val > bio.normalMax;

                return (
                  <div
                    key={bio.id}
                    className="p-4 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-bg-page space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-900 dark:text-white">
                        {bio.nameFa}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          isLow
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                            : isHigh
                            ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                            : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                        }`}
                      >
                        {isLow ? "پایین" : isHigh ? "بالا" : "نرمال"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <input
                        type="number"
                        step={bio.step}
                        value={val}
                        onChange={(e) =>
                          handleCustomChange(bio.id, parseFloat(e.target.value) || 0)
                        }
                        className="w-28 px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/5 text-xs font-mono font-bold text-neutral-900 dark:text-white focus:outline-hidden focus:border-emerald-500 text-left"
                      />
                      <span className="text-xs text-neutral-500 font-mono">
                        {bio.unit}
                      </span>
                    </div>

                    <div className="text-[10px] text-neutral-400 flex items-center justify-between border-t border-neutral-100 dark:border-white/5 pt-2 font-mono">
                      <span>رنج نرمال:</span>
                      <span>
                        {toPersianDigits(bio.normalMin)} - {toPersianDigits(bio.normalMax)} {bio.unit}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. Real-Time Results & Personalized Prescription */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left / Top: Diagnostic Score & Clinical Status (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-bg-card p-6 sm:p-7 shadow-lg space-y-5">
              <div className="flex items-center justify-between border-b border-neutral-100 dark:border-white/10 pb-4">
                <span className="text-xs font-mono font-bold text-neutral-400 uppercase">
                  DIAGNOSTIC SUMMARY
                </span>
                <span className="text-xs text-neutral-400 font-mono">
                  {toPersianDigits(analysis.abnormalCount)} مارکر خارج از رنج
                </span>
              </div>

              {/* Bio-Score Big Gauge */}
              <div className="flex items-center gap-5">
                <div className="w-24 h-24 rounded-2xl bg-neutral-900 dark:bg-bg-page border border-emerald-500/40 flex flex-col items-center justify-center text-center shadow-inner shrink-0">
                  <span className="text-3xl font-black text-accent-primary font-mono leading-none">
                    {toPersianDigits(analysis.overallScore)}
                  </span>
                  <span className="text-[10px] text-neutral-400 font-medium mt-1">
                    از ۱۰۰ نمره
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-neutral-400 block">
                    شاخص سلامت سلولی و بیولوژیک:
                  </span>
                  <h4 className="text-base font-extrabold text-neutral-900 dark:text-white leading-tight">
                    {analysis.riskLabelFa}
                  </h4>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    کانون اصلی نیاز:{" "}
                    <strong className="text-neutral-800 dark:text-neutral-200">
                      {analysis.primaryDeficiencyFa}
                    </strong>
                  </p>
                </div>
              </div>

              {/* Biomarkers status breakdown */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold text-neutral-400 block">
                  وضعیت بیومارکرهای کلیدی:
                </span>
                <div className="space-y-2">
                  {analysis.details.map((d) => (
                    <div
                      key={d.biomarkerId}
                      className="p-2.5 rounded-lg border border-neutral-100 dark:border-white/5 bg-neutral-50/50 dark:bg-white/5 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-neutral-800 dark:text-neutral-200 block">
                          {d.nameFa}
                        </span>
                        <span className="text-[10px] text-neutral-500">
                          مقدار: {toPersianDigits(d.currentValue)} {d.unit}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          d.status === "optimal"
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                            : d.status === "low"
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                            : "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {d.statusFa}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Personalized Clinical Protocol Card (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="rounded-2xl border border-emerald-500/30 bg-radial from-emerald-500/10 via-transparent to-transparent bg-bg-card p-6 sm:p-8 shadow-xl space-y-6">
              {/* Card Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 dark:border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-emerald-500/20 text-accent-primary flex items-center justify-center font-bold text-xs">
                    Rx
                  </div>
                  <h3 className="text-base font-black text-neutral-900 dark:text-white">
                    نسخه پروتکل بالینی و دوزبندی اختصاصی مزرعه مایا
                  </h3>
                </div>
                <span className="text-xs text-neutral-400 font-mono">
                  CLINICAL PROTOCOL
                </span>
              </div>

              {/* Protocol Spec Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-white/70 dark:bg-bg-page/80">
                  <span className="block text-lg font-black text-accent-primary font-mono">
                    {toPersianDigits(analysis.dailyDosageMg)} mg
                  </span>
                  <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    دوز خالص روزانه
                  </span>
                </div>
                <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-white/70 dark:bg-bg-page/80">
                  <span className="block text-lg font-black text-neutral-900 dark:text-white font-mono">
                    {toPersianDigits(analysis.capsuleCount)} کپسول
                  </span>
                  <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    یا {toPersianDigits(analysis.spoonCount)} اسکوپ پودر
                  </span>
                </div>
                <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-white/70 dark:bg-bg-page/80">
                  <span className="block text-lg font-black text-neutral-900 dark:text-white font-mono">
                    {toPersianDigits(analysis.recommendedDays)} روز
                  </span>
                  <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    طول دوره اشباع سلولی
                  </span>
                </div>
                <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-white/70 dark:bg-bg-page/80">
                  <span className="block text-lg font-black text-accent-primary font-mono">
                    {toPersianDigits(analysis.recheckWeeks)} هفته
                  </span>
                  <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    موعد تکرار آزمایش
                  </span>
                </div>
              </div>

              {/* Timing & Synergy Instructions */}
              <div className="space-y-3 p-4 rounded-xl bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/5 text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
                <div>
                  <span className="font-extrabold text-neutral-900 dark:text-white ml-1">
                    ⏰ زمان‌بندی دقیق مصرف:
                  </span>
                  <span>{analysis.timingAdvice}</span>
                </div>
                <div>
                  <span className="font-extrabold text-accent-primary ml-1">
                    💡 نکته هم‌افزایی بالینی:
                  </span>
                  <span>{analysis.synergyTip}</span>
                </div>
              </div>

              {/* Package Recommendation Box with 1-Click Buy */}
              <div className="pt-4 border-t border-neutral-100 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-right">
                  <span className="text-[11px] text-neutral-400 font-bold block">
                    بسته استاندارد منطبق با این نسخه:
                  </span>
                  <span className="text-sm font-extrabold text-neutral-900 dark:text-white block">
                    {analysis.recommendedPlanName}
                  </span>
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <span className="text-base font-black text-accent-primary font-mono">
                      {formatToman(analysis.packagePrice)}
                    </span>
                    <span className="text-[11px] text-neutral-400">
                      (ارسال پیشتاز رایگان)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => typeof window !== "undefined" && window.print()}
                    className="p-2.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-bg-page text-neutral-700 dark:text-neutral-300 text-xs hover:bg-neutral-50 dark:hover:bg-white/5 transition"
                    title="چاپ نسخه آزمایشی"
                  >
                    🖨️
                  </button>

                  <button
                    onClick={handleOrderProtocol}
                    className="flex-1 sm:flex-none px-6 py-3 rounded-xl bg-accent-primary hover:bg-accent-deep text-white dark:bg-accent-primary dark:hover:bg-accent-hover dark:text-[#070a10] text-xs font-bold transition shadow-lg flex items-center justify-center gap-2 active:scale-98"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                    <span>افزودن این نسخه به سبد خرید</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Scientific Note & Physician Contact */}
            <div className="p-4 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50/50 dark:bg-bg-page flex items-center justify-between text-xs text-neutral-500">
              <div className="flex items-center gap-2">
                <span>🩺</span>
                <span>
                  نیاز به بررسی دقیق‌تر آزمایش توسط پزشک مشاور مایا دارید؟
                </span>
              </div>
              <Link
                href="/portal/admin"
                className="text-accent-primary font-bold hover:underline"
              >
                ارسال به مشاور پزشکی ←
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
