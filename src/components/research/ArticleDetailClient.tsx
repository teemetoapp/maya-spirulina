"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ResearchArticle, ARTICLES_DATA } from "@/data/articles";
import { useCart } from "@/lib/cart-context";
import { formatToman, toPersianDigits } from "@/lib/currency";

interface ArticleDetailClientProps {
  article: ResearchArticle;
}

export default function ArticleDetailClient({ article }: ArticleDetailClientProps) {
  const { addItem, setIsOpen } = useCart();
  const [copiedLink, setCopiedLink] = useState(false);

  // Related articles from the same category or overall
  const relatedArticles = ARTICLES_DATA.filter(
    (a) => a.slug !== article.slug
  ).slice(0, 3);

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleAddToCart = () => {
    const plan = article.recommendedPlan;
    addItem({
      id: `maya_plan_${plan.id}_${plan.format}`,
      slug: `maya-plan-${plan.id}`,
      title: `اسپیرولینا مایا - ${plan.name} (${plan.format === "tablets" ? "کپسول" : "پودر"})`,
      sku: plan.format === "tablets" ? "MAYA-TAB-240" : "MAYA-POW-250",
      price: plan.price,
      compareAtPrice: plan.price + 100000,
      icon: "🌿",
      category: plan.format,
      categoryLabel: plan.format === "tablets" ? "قرص ارگانیک" : "پودر خالص",
      gradient: "from-neutral-800 to-neutral-900",
    });
    setIsOpen(true);
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 dark:bg-bg-page dark:text-neutral-100 selection:bg-accent-primary selection:text-white transition-colors">
      {/* 1. Breadcrumbs & Top Meta */}
      <div className="border-b border-neutral-200 dark:border-white/10 bg-neutral-50/60 dark:bg-bg-card py-4">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-right flex flex-wrap items-center justify-between gap-3 text-xs">
          <nav className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
            <Link href="/" className="hover:text-neutral-900 dark:hover:text-white transition">
              خانه
            </Link>
            <span>/</span>
            <Link href="/research" className="hover:text-neutral-900 dark:hover:text-white transition">
              پایگاه پژوهش و مقالات
            </Link>
            <span>/</span>
            <span className="text-neutral-800 dark:text-neutral-200 truncate max-w-[200px] sm:max-w-xs">
              {article.title}
            </span>
          </nav>

          <Link
            href="/research"
            className="text-xs font-bold text-accent-primary hover:underline flex items-center gap-1"
          >
            <svg className="w-4 h-4 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>بازگشت به تمام مقالات</span>
          </Link>
        </div>
      </div>

      {/* 2. Article Header */}
      <header className="relative py-12 sm:py-16 border-b border-neutral-200 dark:border-white/10 overflow-hidden">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-right space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-md text-xs font-bold bg-emerald-500/15 text-accent-primary border border-emerald-500/25">
              {article.category}
            </span>
            <span className="px-2.5 py-1 rounded-md text-[11px] font-mono text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10">
              {article.doiOrPmid}
            </span>
            <span className="text-xs text-neutral-400 dark:text-neutral-500">
              • {article.readTime}
            </span>
            <span className="text-xs text-neutral-400 dark:text-neutral-500">
              • تاریخ انتشار: {toPersianDigits(article.publishedAt)}
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-neutral-900 dark:text-white tracking-tight leading-tight">
            {article.title}
          </h1>

          <p className="text-sm sm:text-lg text-neutral-600 dark:text-neutral-300 leading-relaxed font-normal">
            {article.subtitle}
          </p>

          {/* Author Card & Actions Bar */}
          <div className="pt-6 flex flex-wrap items-center justify-between gap-4 border-t border-neutral-100 dark:border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-emerald-500/20 text-accent-primary font-mono font-bold text-sm flex items-center justify-center border border-emerald-500/30">
                {article.author.avatarInitials}
              </div>
              <div className="text-right">
                <span className="block text-sm font-bold text-neutral-900 dark:text-white">
                  {article.author.name}
                </span>
                <span className="block text-xs text-neutral-500 dark:text-neutral-400">
                  {article.author.title} • {article.author.role}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-white/10 bg-bg-card text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-white/5 transition flex items-center gap-1.5"
              >
                <span>🔗</span>
                <span>{copiedLink ? "لینک کپی شد!" : "اشتراک‌گذاری"}</span>
              </button>
              <button
                onClick={() => typeof window !== "undefined" && window.print()}
                className="hidden sm:flex px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-white/10 bg-bg-card text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-white/5 transition items-center gap-1.5"
              >
                <span>🖨️</span>
                <span>نسخه چاپی</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 3. Article Content & Sidebar */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-right">
        {/* Key Findings Card */}
        <div className="mb-10 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10 p-6 sm:p-7">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <h3 className="text-sm sm:text-base font-extrabold text-accent-primary">
              یافته‌های کلیدی کارآزمایی و نتایج آزمایشگاهی
            </h3>
          </div>
          <ul className="space-y-2.5 text-xs sm:text-sm text-neutral-800 dark:text-neutral-200">
            {article.keyFindings.map((finding, idx) => (
              <li key={idx} className="flex items-start gap-2.5">
                <span className="text-accent-primary font-bold text-sm leading-none mt-0.5">
                  ✓
                </span>
                <span className="leading-relaxed">{finding}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Dynamic Sections */}
        <div className="space-y-12">
          {article.sections.map((section, sIdx) => (
            <section key={sIdx} className="space-y-4">
              <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white tracking-tight border-r-4 border-accent-primary pr-3">
                {section.title}
              </h2>

              <div className="space-y-4 text-xs sm:text-base leading-relaxed text-neutral-700 dark:text-neutral-300 font-normal">
                {section.content.map((p, pIdx) => (
                  <p key={pIdx}>{p}</p>
                ))}
              </div>

              {/* Metrics Display */}
              {section.metrics && section.metrics.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-6">
                  {section.metrics.map((m, mIdx) => (
                    <div
                      key={mIdx}
                      className="p-4 rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-bg-card text-center space-y-1"
                    >
                      <span className="block text-2xl font-black text-accent-primary font-mono">
                        {m.value}
                      </span>
                      <span className="block text-xs font-bold text-neutral-900 dark:text-white">
                        {m.label}
                      </span>
                      {m.change && (
                        <span className="block text-[11px] text-neutral-500 dark:text-neutral-400">
                          {m.change}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Callout Box */}
              {section.callout && (
                <div
                  className={`p-4 sm:p-5 rounded-xl border text-xs sm:text-sm leading-relaxed my-6 ${
                    section.callout.type === "clinical"
                      ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10 text-emerald-900 dark:text-emerald-200"
                      : section.callout.type === "protocol"
                      ? "border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10 text-amber-900 dark:text-amber-200"
                      : "border-sky-500/30 bg-sky-500/5 dark:bg-sky-500/10 text-sky-900 dark:text-sky-200"
                  }`}
                >
                  <span className="font-extrabold block mb-1">
                    {section.callout.title}:
                  </span>
                  <p>{section.callout.text}</p>
                </div>
              )}
            </section>
          ))}
        </div>

        {/* 4. In-Article Product Recommendation Box (High-Converting Conversion Point) */}
        <div className="mt-14 rounded-2xl border border-emerald-500/40 bg-radial from-emerald-500/10 to-transparent bg-bg-card p-6 sm:p-8 text-right space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="inline-flex items-center gap-1.5 text-xs font-mono font-bold text-accent-primary">
                <span>💊</span>
                <span>RECOMMENDED PROTOCOL PACKAGE</span>
              </span>
              <h3 className="text-lg sm:text-xl font-black text-neutral-900 dark:text-white">
                پکیج مصرف پیشنهادی منطبق با یافته‌های این مقاله
              </h3>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 max-w-xl">
                {article.recommendedPlan.reason}
              </p>
            </div>

            <div className="text-left sm:text-right shrink-0">
              <span className="block text-xl font-black text-accent-primary font-mono">
                {formatToman(article.recommendedPlan.price)}
              </span>
              <span className="text-[11px] text-neutral-400">
                ارسال رایگان + ضمانت آزمایشگاهی
              </span>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-neutral-100 dark:border-white/10">
            <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
              {article.recommendedPlan.name}
            </span>

            <button
              onClick={handleAddToCart}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-accent-primary hover:bg-accent-deep text-white dark:bg-accent-primary dark:hover:bg-accent-hover dark:text-[#070a10] text-xs font-bold transition shadow-md flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>خرید آنلاین و افزودن آنی به سبد خرید</span>
            </button>
          </div>
        </div>

        {/* 5. Scientific References (Peer-Reviewed Citations) */}
        {article.references.length > 0 && (
          <div className="mt-14 pt-8 border-t border-neutral-200 dark:border-white/10 space-y-4">
            <h3 className="text-sm font-extrabold text-neutral-900 dark:text-white uppercase tracking-wider font-mono">
              منابع و ارجاعات علمی معتبر (Scientific References)
            </h3>
            <ol className="space-y-2 text-xs text-neutral-500 dark:text-neutral-400 list-decimal list-inside font-mono">
              {article.references.map((ref) => (
                <li key={ref.id} className="leading-relaxed">
                  <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                    {ref.authors} ({ref.year}).
                  </span>{" "}
                  {ref.title}.{" "}
                  <span className="italic">{ref.journal}</span>.{" "}
                  <span className="text-accent-primary font-bold">
                    [{ref.doiOrPmid}]
                  </span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* 6. Tags & Share */}
        <div className="mt-10 pt-6 border-t border-neutral-100 dark:border-white/5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-neutral-400 font-bold ml-1">کلمات کلیدی:</span>
            {article.tags.map((tag, tIdx) => (
              <span
                key={tIdx}
                className="px-2.5 py-1 rounded-md text-[11px] bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-white/5"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>

        {/* 7. Related Articles */}
        <div className="mt-16 pt-10 border-t border-neutral-200 dark:border-white/10 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
              سایر مقالات و پژوهش‌های علمی مایا
            </h3>
            <Link
              href="/research"
              className="text-xs font-bold text-accent-primary hover:underline"
            >
              مشاهده همه ←
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {relatedArticles.map((rel) => (
              <Link
                key={rel.slug}
                href={`/research/${rel.slug}`}
                className="p-4 rounded-xl border border-neutral-200 dark:border-white/10 bg-bg-card hover:border-emerald-500/40 hover:shadow-md transition group text-right flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-accent-primary">
                    {rel.category}
                  </span>
                  <h4 className="text-xs font-bold text-neutral-900 dark:text-white group-hover:text-accent-primary transition line-clamp-2 leading-snug">
                    {rel.title}
                  </h4>
                </div>
                <span className="text-[11px] text-neutral-400 mt-3 block">
                  {rel.readTime}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
