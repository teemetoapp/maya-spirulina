"use client"

import React, { useState } from "react"
import Link from "next/link"
import { MagicCard } from "@/components/magicui/magic-card"
import { BorderBeam } from "@/components/magicui/border-beam"
import { Marquee } from "@/components/magicui/marquee"

const REVIEWS = [
  {
    name: "دکتر مریم سلیمانی",
    role: "متخصص تغذیه بالینی",
    comment: "غلظت فیکوسیانین بالای ۱۸٪ این نمونه اسپیرولینا، جذب سلولی فوق‌العاده‌ای در مراجعین ایجاد کرده است.",
    tag: "تاییدیه بالینی",
  },
  {
    name: "امیرحسین رضوی",
    role: "ورزشکار حرفه‌ای سه‌گانه",
    comment: "ریکاوری عضلانی بعد از تمرینات فشرده به طرز محسوسی سریع‌تر شده؛ بوی جلبک هم اصلاً آزاردهنده نیست.",
    tag: "خریدار تاییدشده",
  },
  {
    name: "دکتر فرزاد کمالی",
    role: "پژوهشگر بیوتکنولوژی",
    comment: "کشت ایزوله و شستشوی بدون فلزات سنگین در گواهی آزمایشگاه کاملاً مشهود است. بالاترین استاندارد تولید داخلی.",
    tag: "سفیر سلامت",
  },
  {
    name: "سارا نیک‌پژوه",
    role: "کارشناس پوست و زیبایی",
    comment: "ترکیب پودر با ماسک‌های درمانی در کلینیک نتایج درخشانی در شفافیت و کاهش التهاب پوستی نشان داده است.",
    tag: "خریدار تاییدشده",
  },
]

export default function ShowcasePage() {
  const [activeTab, setActiveTab] = useState<"cards" | "beams" | "marquee">("cards")

  return (
    <div className="min-h-screen bg-[#070a10] text-slate-100 p-4 sm:p-8 font-sans selection:bg-emerald-500 selection:text-black">
      {/* Top Header */}
      <div className="max-w-6xl mx-auto mb-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Magic UI + Modern Dark Studio
            </span>
            <span className="text-xs text-slate-400">Next.js 16.4 & Tailwind CSS v4</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            ویترین زنده و تعاملی کامپوننت‌های Magic UI
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            مشاهده انیمیشن‌های تعقیب ماوس (Spotlight)، پرتوهای نوری چرخشی (Border Beam) و نوار متحرک (Marquee)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 border border-white/10 transition-colors"
          >
            ← بازگشت به فروشگاه
          </Link>
          <Link
            href="/portal/admin"
            className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-xs font-black text-slate-950 transition-colors"
          >
            پنل ادمین
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-12">
        {/* SECTION 1: MagicCard Spotlight */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                ۱. کامپوننت MagicCard (تعقیب مکان‌نمای ماوس و هاله‌های نوری)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                ماوس خود را روی کارت‌ها حرکت دهید تا پرتوهای زمردی درخشان و بازتاب لبه‌ها را مشاهده کنید.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <MagicCard
              className="p-6 rounded-2xl border border-white/10 bg-[#0d121c] flex flex-col justify-between transition-all hover:scale-[1.01]"
              gradientColor="rgba(16, 185, 129, 0.12)"
              gradientFrom="#10b981"
              gradientTo="#059669"
              gradientSize={240}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                    دوره ۳۰ روزه
                  </span>
                  <span className="text-xs text-slate-500 font-mono">CODE: MAYA-30</span>
                </div>
                <h3 className="text-base font-bold text-white">کپسول خالص مایا اسپیرولینا</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  ۶۰ عدد کپسول گیاهی ۵۰۰mg فشرده سرد با پوشش انتریک جهت جذب حداکثری در روده باریک.
                </p>
                <div className="mt-4 pt-4 border-t border-white/5 space-y-2 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span>پروتئین خالص:</span>
                    <span className="font-bold text-white font-mono">۶۵٪ وزن خشک</span>
                  </div>
                  <div className="flex justify-between">
                    <span>فیکوسیانین فعال:</span>
                    <span className="font-bold text-emerald-400 font-mono">۱۸.۲ درصد</span>
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-lg font-black text-white font-mono">۴۹۰,۰۰۰</span>
                  <span className="text-xs text-slate-400 mr-1">تومان</span>
                </div>
                <button className="px-3.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold border border-emerald-500/30 transition-colors">
                  سفارش بسته
                </button>
              </div>
            </MagicCard>

            {/* Card 2 (Popular with Border Accent) */}
            <MagicCard
              className="p-6 rounded-2xl border border-emerald-500/40 bg-[#0d121c] flex flex-col justify-between shadow-2xl shadow-emerald-950/30 relative"
              gradientColor="rgba(16, 185, 129, 0.18)"
              gradientFrom="#10b981"
              gradientTo="#047857"
              gradientSize={280}
            >
              <div className="absolute -top-3 right-6 bg-emerald-500 text-slate-950 font-black text-[10px] px-3 py-0.5 rounded-full shadow-lg">
                پرفروش‌ترین انتخاب
              </div>
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                    دوره ۶۰ روزه
                  </span>
                  <span className="text-xs text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded">
                    ۱۵٪ تخفیف
                  </span>
                </div>
                <h3 className="text-base font-bold text-white">پکیج مکمل دوماهه + شیکر</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  ۱۲۰ عدد کپسول به همراه شیکر شیشه‌ای اختصاصی مایا و نسخه مشاوره دوز مصرف.
                </p>
                <div className="mt-4 pt-4 border-t border-white/5 space-y-2 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span>ارسال:</span>
                    <span className="font-bold text-emerald-400">رایگان با پست پیشتاز</span>
                  </div>
                  <div className="flex justify-between">
                    <span>پشتیبانی:</span>
                    <span className="font-bold text-white">مشاوره اختصاصی پزشک</span>
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-lg font-black text-emerald-400 font-mono">۸۹۰,۰۰۰</span>
                  <span className="text-xs text-slate-400 mr-1">تومان</span>
                </div>
                <button className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition-colors shadow-lg shadow-emerald-500/20">
                  خرید آنلاین
                </button>
              </div>
            </MagicCard>

            {/* Card 3 (Orb Mode) */}
            <MagicCard
              className="p-6 rounded-2xl border border-white/10 bg-[#0d121c] flex flex-col justify-between"
              mode="orb"
              glowFrom="#10b981"
              glowTo="#047857"
              glowSize={350}
              glowOpacity={0.7}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-md border border-cyan-500/20">
                    فرمت پودر خالص
                  </span>
                  <span className="text-xs text-slate-500 font-mono">۱۰۰ گرم</span>
                </div>
                <h3 className="text-base font-bold text-white">پودر میکرونیزه مایا اسپیرولینا</h3>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  آسیاب فوق‌ریز مناسب اسموتی‌های سلامتی، ماسک‌های کلینیکی زیبایی و سوپرفود صبحانه.
                </p>
                <div className="mt-4 pt-4 border-t border-white/5 space-y-2 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span>خلوص آزمایشگاهی:</span>
                    <span className="font-bold text-emerald-400 font-mono">۹۹.۸ درصد</span>
                  </div>
                  <div className="flex justify-between">
                    <span>حالت نوری:</span>
                    <span className="font-bold text-cyan-400">Orb Spring Glow</span>
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                <div>
                  <span className="text-lg font-black text-white font-mono">۴۵۰,۰۰۰</span>
                  <span className="text-xs text-slate-400 mr-1">تومان</span>
                </div>
                <button className="px-3.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/10 transition-colors">
                  سفارش پودر
                </button>
              </div>
            </MagicCard>
          </div>
        </section>

        {/* SECTION 2: BorderBeam Showcase */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              ۲. کامپوننت BorderBeam (پرتو لیزری متحرک دور کادر)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              پرتو زمردی به صورت پیوسته و روان دور تا دور لبه‌های باکس می‌چرخد و نگاه مخاطب را به این بخش معطوف می‌سازد.
            </p>
          </div>

          <div className="relative rounded-2xl bg-[#0d121c] p-8 border border-white/10 overflow-hidden shadow-2xl">
            {/* The Animated Border Beam */}
            <BorderBeam
              size={180}
              duration={8}
              delay={0}
              colorFrom="#10b981"
              colorTo="#059669"
              borderWidth={2}
            />

            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-right">
                <span className="text-xs font-black text-emerald-400 tracking-wider uppercase bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                  بسته ویژه همکاری پزشکان و سفیران سلامت
                </span>
                <h3 className="text-xl font-black text-white">
                  عضویت در شبکه تخصصی سفیران مایا اسپیرولینا
                </h3>
                <p className="text-sm text-slate-400 max-w-xl leading-relaxed">
                  دریافت کیت رایگان نمونه آزمایشگاهی، پنل ردیابی بیماران با کد ارجاع اختصاصی و پورسانت نقدی ۲۰٪ به ازای هر سفارش با تسویه آنی پایا.
                </p>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <div className="text-center bg-black/40 px-5 py-3 rounded-xl border border-white/5">
                  <div className="text-2xl font-black text-emerald-400 font-mono">۲۰٪</div>
                  <div className="text-[11px] text-slate-400">پورسانت فروش</div>
                </div>
                <Link
                  href="/portal/ambassador"
                  className="px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-colors shadow-lg shadow-emerald-500/20"
                >
                  ورود به پنل سفیران
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3: Marquee Testimonials */}
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              ۳. کامپوننت Marquee (نوار متحرک بی‌پایان با توقف در حالت هاور)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              حرکت روان دیدگاه‌های مستند پزشکان و خریداران تاییدشده (ماوس را روی هر کارت نگه‌دارید تا متوقف شود).
            </p>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0d121c]/50 py-4">
            {/* Fade Gradients at sides */}
            <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-[#070a10] to-transparent z-10" />
            <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#070a10] to-transparent z-10" />

            <Marquee pauseOnHover repeat={4} className="[--duration:25s]">
              {REVIEWS.map((rev, idx) => (
                <div
                  key={idx}
                  className="w-72 sm:w-80 shrink-0 p-5 rounded-xl bg-[#0e1422] border border-white/10 text-right space-y-3 hover:border-emerald-500/40 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-white">{rev.name}</div>
                      <div className="text-xs text-slate-400">{rev.role}</div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      {rev.tag}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {rev.comment}
                  </p>
                </div>
              ))}
            </Marquee>
          </div>
        </section>
      </div>
    </div>
  )
}
