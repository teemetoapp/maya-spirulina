"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ARTICLES_DATA, ResearchArticle } from "@/data/articles";
import { toPersianDigits } from "@/lib/currency";

export default function ResearchHubClient() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const categories = [
    { id: "all", name: "همه مقالات و پژوهش‌ها", count: ARTICLES_DATA.length },
    {
      id: "clinical",
      name: "پژوهش‌های بالینی",
      count: ARTICLES_DATA.filter((a) => a.categorySlug === "clinical").length,
    },
    {
      id: "sports",
      name: "ورزش و ریکاوری",
      count: ARTICLES_DATA.filter((a) => a.categorySlug === "sports").length,
    },
    {
      id: "biotech",
      name: "تغذیه و بیوتکنولوژی",
      count: ARTICLES_DATA.filter((a) => a.categorySlug === "biotech").length,
    },
    {
      id: "lab",
      name: "فناوری و آزمایشگاه",
      count: ARTICLES_DATA.filter((a) => a.categorySlug === "lab").length,
    },
  ];

  const featuredArticle = ARTICLES_DATA.find((a) => a.featured) || ARTICLES_DATA[0];

  const filteredArticles = ARTICLES_DATA.filter((article) => {
      const matchesCategory =
        selectedCategory === "all" || article.categorySlug === selectedCategory;
      const matchesSearch =
        searchQuery.trim() === "" ||
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
        article.doiOrPmid.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });

  return (
    <div className="min-h-screen bg-white text-neutral-900 dark:bg-bg-page dark:text-neutral-100 selection:bg-accent-primary selection:text-white transition-colors">
      {/* 1. Header Banner & Scientific Identity */}
      <section className="relative overflow-hidden border-b border-neutral-200 dark:border-white/10 bg-neutral-50/50 dark:bg-bg-card py-16 sm:py-20">
        {/* Glow Effects */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-72 h-72 bg-emerald-600/5 rounded-full blur-2xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-right">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-accent-primary text-xs font-mono font-medium mb-4">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>CLINICAL RESEARCH & BIOTECH HUB</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-neutral-900 dark:text-white tracking-tight leading-tight max-w-4xl">
            پایگاه تحقیقات علمی و مقالات تخصصی بیوتکنولوژی مایا
          </h1>
          <p className="mt-4 text-sm sm:text-base text-neutral-600 dark:text-neutral-400 max-w-2xl leading-relaxed">
            مستندات بیوشیمیایی، کارآزمایی‌های بالینی داوری‌شده (Peer-Reviewed) و دیتاشیت‌های آزمایشگاهی پیرامون خواص درمانی فیکوسیانین، ارتقای توان ورزشی و بازسازی سلولی.
          </p>

          {/* Quick Metrics Bar */}
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl">
            <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-bg-card shadow-xs">
              <span className="block text-xl font-black text-accent-primary font-mono">
                ۱۷.۴٪
              </span>
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
                خلوص فیکوسیانین مایا
              </span>
            </div>
            <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-bg-card shadow-xs">
              <span className="block text-xl font-black text-neutral-900 dark:text-white font-mono">
                ۴۰x
              </span>
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
                قدرت آنتی‌اکسیدانی vs ویتامین C
              </span>
            </div>
            <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-bg-card shadow-xs">
              <span className="block text-xl font-black text-accent-primary font-mono">
                ۱۰۰٪
              </span>
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
                کشت ایزوله و پرس سرد
              </span>
            </div>
            <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-white/10 bg-bg-card shadow-xs">
              <span className="block text-xl font-black text-neutral-900 dark:text-white font-mono">
                PubMed
              </span>
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
                استناد به مقالات بین‌المللی
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Main Body with Search & Filters */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        {/* Controls Bar: Category Tabs & Search */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pb-8 border-b border-neutral-200 dark:border-white/10">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2 md:pb-0">
            {categories.map((cat) => {
              const active = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    active
                      ? "bg-accent-primary text-white shadow-xs dark:bg-accent-primary dark:text-[#070a10]"
                      : "bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-white/10"
                  }`}
                >
                  <span>{cat.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      active
                        ? "bg-black/20 text-white dark:bg-black/30 dark:text-[#070a10]"
                        : "bg-neutral-200 dark:bg-white/10 text-neutral-500 dark:text-neutral-400"
                    }`}
                  >
                    {toPersianDigits(cat.count)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در مقالات، کلمات کلیدی، PMID..."
              className="w-full pl-3 pr-9 py-2 text-xs rounded-lg border border-neutral-200 dark:border-white/10 bg-bg-card text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-hidden focus:border-emerald-500 transition"
            />
            <svg
              className="w-4 h-4 text-neutral-400 absolute right-3 top-2.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute left-2.5 top-2.5 text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-white"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Featured Article Card (Shown when on "all" and no search) */}
        {selectedCategory === "all" && searchQuery === "" && featuredArticle && (
          <div className="mt-8 mb-12">
            <div className="relative group rounded-2xl border border-emerald-500/30 bg-radial from-emerald-500/5 to-transparent dark:from-emerald-500/10 dark:to-transparent bg-bg-card p-6 sm:p-8 overflow-hidden shadow-lg transition-all hover:border-emerald-500/50">
              <div className="flex flex-col lg:flex-row items-start justify-between gap-6">
                <div className="flex-1 space-y-4 text-right">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 rounded-md bg-emerald-500/20 text-accent-primary text-[11px] font-bold border border-emerald-500/30">
                      ★ مقاله لیدر و شاخص پژوهشی
                    </span>
                    <span className="text-xs text-neutral-400 dark:text-neutral-500 font-mono">
                      {featuredArticle.doiOrPmid}
                    </span>
                    <span className="text-xs text-neutral-400 dark:text-neutral-500">
                      • {featuredArticle.readTime}
                    </span>
                  </div>

                  <Link href={`/research/${featuredArticle.slug}`}>
                    <h2 className="text-xl sm:text-3xl font-black text-neutral-900 dark:text-white hover:text-accent-primary transition cursor-pointer leading-tight">
                      {featuredArticle.title}
                    </h2>
                  </Link>

                  <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed max-w-3xl">
                    {featuredArticle.subtitle}
                  </p>

                  {/* Highlights Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                    {featuredArticle.keyFindings.slice(0, 2).map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 text-xs text-neutral-700 dark:text-neutral-300"
                      >
                        <span className="text-accent-primary font-bold mt-0.5">✓</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>

                  {/* Author & CTA Button */}
                  <div className="pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-neutral-100 dark:border-white/5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-mono font-bold text-xs flex items-center justify-center border border-emerald-500/30">
                        {featuredArticle.author.avatarInitials}
                      </div>
                      <div className="text-right">
                        <span className="block text-xs font-bold text-neutral-900 dark:text-white">
                          {featuredArticle.author.name}
                        </span>
                        <span className="block text-[11px] text-neutral-500 dark:text-neutral-400">
                          {featuredArticle.author.role}
                        </span>
                      </div>
                    </div>

                    <Link
                      href={`/research/${featuredArticle.slug}`}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-primary hover:bg-accent-deep text-white dark:bg-accent-primary dark:hover:bg-accent-hover dark:text-[#070a10] text-xs font-bold transition shadow-md"
                    >
                      <span>مطالعه کامل مقاله بالینی</span>
                      <svg className="w-4 h-4 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. Articles Grid */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-white">
              {searchQuery
                ? `نتایج جستجو برای «${searchQuery}» (${toPersianDigits(filteredArticles.length)} مقاله)`
                : "فهرست مقالات و انتشارات علمی"}
            </h3>
            <span className="text-xs text-neutral-400 dark:text-neutral-500">
              {toPersianDigits(filteredArticles.length)} مقاله علمی معتبر
            </span>
          </div>

          {filteredArticles.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-neutral-200 dark:border-white/10 rounded-2xl bg-neutral-50/50 dark:bg-white/5">
              <span className="text-3xl">🔬</span>
              <p className="mt-3 text-sm font-bold text-neutral-900 dark:text-white">
                هیچ مقاله‌ای با این عبارت پیدا نشد
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                لطفاً کلیدواژه دیگری مانند «فیکوسیانین»، «ورزش»، «آهن» یا «کبد» را امتحان کنید.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("all");
                }}
                className="mt-4 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 transition"
              >
                پاکسازی فیلترها
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredArticles.map((article) => (
                <article
                  key={article.slug}
                  className="flex flex-col justify-between rounded-xl border border-neutral-200 dark:border-white/10 bg-bg-card p-5 hover:border-emerald-500/40 hover:shadow-lg transition-all group text-right"
                >
                  <div className="space-y-3">
                    {/* Top Badges */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                        {article.category}
                      </span>
                      <span className="text-[11px] text-neutral-400 dark:text-neutral-500">
                        {article.readTime}
                      </span>
                    </div>

                    {/* Title */}
                    <Link href={`/research/${article.slug}`}>
                      <h4 className="text-sm sm:text-base font-extrabold text-neutral-900 dark:text-white group-hover:text-accent-primary transition leading-snug line-clamp-2">
                        {article.title}
                      </h4>
                    </Link>

                    {/* Excerpt */}
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-3 leading-relaxed">
                      {article.excerpt}
                    </p>

                    {/* DOI / Citation Tag */}
                    <div className="pt-2">
                      <span className="inline-block text-[10px] font-mono text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-white/5 px-2 py-1 rounded-md border border-neutral-200 dark:border-white/5 truncate max-w-full">
                        {article.doiOrPmid}
                      </span>
                    </div>
                  </div>

                  {/* Footer: Author & Link */}
                  <div className="pt-4 mt-4 border-t border-neutral-100 dark:border-white/5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-mono font-bold text-[10px] flex items-center justify-center">
                        {article.author.avatarInitials}
                      </div>
                      <span className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300 truncate max-w-[140px]">
                        {article.author.name}
                      </span>
                    </div>

                    <Link
                      href={`/research/${article.slug}`}
                      className="text-xs font-bold text-accent-primary flex items-center gap-1 group-hover:translate-x-[-3px] transition"
                    >
                      <span>مطالعه</span>
                      <svg className="w-3.5 h-3.5 rtl:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        {/* 4. Scientific Newsletter & Lab Consultation Banner */}
        <div className="mt-16 rounded-2xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-bg-card p-6 sm:p-8 text-right flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold text-accent-primary">
              <span>📑</span>
              <span>BIOTECH MONTHLY BRIEFING</span>
            </span>
            <h3 className="text-lg sm:text-xl font-black text-neutral-900 dark:text-white">
              دریافت بروشور و جدیدترین مقالات بالینی اسپیرولینا در ایمیل یا تلگرام
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
              هر ماه یک گزارش تخصصی از جدیدترین کارآزمایی‌های بالینی جهانی در خصوص اسپیرولینا، دوزبندی هدفمند و آنالیزهای زیستی برای پزشکان و علاقه‌مندان ارسال می‌گردد.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full md:w-auto">
            <Link
              href="/portal/ambassador/register"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-accent-primary border border-emerald-500/30 text-xs font-bold text-center transition"
            >
              درخواست کیت مقالات پزشکان
            </Link>
            <a
              href="https://t.me"
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-accent-primary hover:bg-accent-deep text-white dark:bg-accent-primary dark:hover:bg-accent-hover dark:text-[#070a10] text-xs font-bold text-center transition shadow-md"
            >
              عضویت در کانال پژوهش‌های مایا
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
