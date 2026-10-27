import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import { getAllAmbassadors } from "@/data/ambassadors";
import { toPersianDigits } from "@/lib/currency";

export const metadata: Metadata = {
  title: "بورد علمی و سفیران سلامت | مایا اسپیرولینا",
  description: "داستان‌های واقعی پزشکان، متخصصان تغذیه و مربیان ورزشی همکار مایا اسپیرولینا و پروتکل‌های تجویزی برای مراجعین.",
};

export default function AmbassadorDirectoryPage() {
  const ambassadors = getAllAmbassadors();

  return (
    <div className="min-h-screen bg-[#070a10] text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-10">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            بورد سلامت و سفیران بالینی
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            روایت بالینی پزشکان و سفیران مایا اسپیرولینا
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            متخصصان و پزشکانی که پس از آزمایشات خون و مشاهده تحول زیستی مراجعین، پروتکل‌های اختصاصی مایا را در کلینیک‌های خود تجویز می‌کنند.
          </p>
        </div>

        {/* Ambassador Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {ambassadors.map((a) => (
            <div
              key={a.slug}
              className="rounded-3xl bg-[#0d121c] border border-white/8 hover:border-emerald-500/40 p-6 flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 shadow-xl group"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`size-14 rounded-2xl ${a.avatarColor} text-white font-black text-xl flex items-center justify-center shadow-lg`}>
                    {a.avatarInitial}
                  </div>
                  <div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/5 text-emerald-400 border border-white/10">
                      {a.badge}
                    </span>
                    <h3 className="text-sm font-bold text-white mt-1 group-hover:text-emerald-300 transition">
                      {a.fullName}
                    </h3>
                  </div>
                </div>

                <div className="text-xs space-y-1">
                  <p className="text-emerald-400/90 font-medium">{a.specialty}</p>
                  <p className="text-zinc-500 text-[11px]">{a.institution} • {a.city}</p>
                </div>

                <p className="text-xs text-zinc-300 line-clamp-3 leading-relaxed italic border-r-2 border-emerald-500/40 pr-2">
                  «{a.heroQuote}»
                </p>

                <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-[11px] space-y-1">
                  <span className="text-zinc-500 block text-[10px]">پروتکل تجویزی سفیر:</span>
                  <p className="text-zinc-200 font-medium line-clamp-1">{a.prescribedProtocol.packageName}</p>
                  <span className="text-emerald-400 block text-[10px] font-mono">
                    با {toPersianDigits(a.prescribedProtocol.discountPercent)}٪ تخفیف اختصاصی
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-white/6 mt-4">
                <Link
                  href={`/story/${a.slug}`}
                  className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-emerald-500 hover:text-black border border-white/10 text-white text-xs font-bold transition flex items-center justify-center gap-1.5"
                >
                  <span>مشاهده پرونده و داستان بالینی</span>
                  <span>←</span>
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA for prospective ambassadors */}
        <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-950/30 to-teal-950/30 border border-emerald-500/20 text-center space-y-3">
          <h3 className="text-sm font-bold text-white">پزشک، متخصص تغذیه یا مربی ورزشی هستید؟</h3>
          <p className="text-xs text-zinc-400 max-w-xl mx-auto">
            برای دریافت کیت سمپل بالینی رایگان مایا جهت بررسی در مطب یا عضویت در بورد سفیران سلامت، وارد پرتال همکاران شوید.
          </p>
          <div className="pt-1">
            <Link
              href="/portal/ambassador"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-500 text-black text-xs font-bold hover:bg-emerald-400 transition"
            >
              <span>ورود به پرتال سفیران سلامت و کیت مطب</span>
              <span>←</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
