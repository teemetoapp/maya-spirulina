"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { toPersianDigits } from "@/lib/currency";
import ThemeToggle from "@/components/ui/ThemeToggle";

interface StoreHeaderProps {
  userSession?: {
    name?: string | null;
    phone: string;
  } | null;
}

export default function StoreHeader({ userSession }: StoreHeaderProps) {
  const { totalCount, setIsOpen } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      if (ref && /^[A-Za-z0-9-]{3,20}$/.test(ref)) {
        // The server reads the referral from this cookie at checkout
        document.cookie = `ref_code=${ref.toUpperCase()}; path=/; max-age=${30 * 24 * 60 * 60}; samesite=lax`;
      }
      // منبع تبلیغ (utm) برای گزارش «فروش از کجا آمد»؛ آخرین منبع حساب می‌شود
      const utm = ["utm_source", "utm_medium", "utm_campaign"].map((k) => (params.get(k) ?? "").replace(/[|;]/g, "").slice(0, 60));
      if (utm[0]) document.cookie = `utm=${encodeURIComponent(utm.join("|"))}; path=/; max-age=${30 * 24 * 60 * 60}; samesite=lax`;
    }
  }, []);

  // The unified portal opens the right landing section for each role
  const dashboardHref = "/portal";

  const links = [
    { href: "/#order", label: "خرید" },
    { href: "/#how", label: "راهنمای مصرف" },
    { href: "/#farm", label: "مزرعه" },
    { href: "/research", label: "مقالات" },
    { href: "/#faq", label: "پرسش‌ها" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-bg-page/90 backdrop-blur-md border-b border-border-hairline">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 -mr-2 rounded-md text-text-muted hover:bg-bg-subtle"
            aria-label="منو"
            aria-expanded={mobileMenuOpen}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={mobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
            </svg>
          </button>
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-deep text-white dark:bg-accent-primary dark:text-bg-page font-black text-sm">MS</span>
            <span className="flex flex-col leading-tight min-w-0">
              <span className="text-sm font-black text-text-main truncate">مایا اسپیرولینا</span>
              <span className="text-[11px] text-text-muted truncate">مزرعه آفرینش مایا</span>
            </span>
          </Link>
        </div>

        <nav aria-label="منوی اصلی" className="hidden lg:flex items-center gap-1 text-sm text-text-muted">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="px-3 py-2 rounded-md hover:text-text-main hover:bg-bg-subtle transition">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <ThemeToggle />
          <button
            onClick={() => setIsOpen(true)}
            className="relative p-2 rounded-md border border-border-hairline bg-bg-card text-text-main hover:border-border-strong transition cursor-pointer"
            aria-label="سبد خرید"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            {totalCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-accent-deep dark:bg-accent-primary text-white text-[10px] font-bold flex items-center justify-center">
                {toPersianDigits(totalCount)}
              </span>
            )}
          </button>
          <Link
            href={userSession ? dashboardHref : "/login"}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-border-hairline bg-bg-card text-xs font-semibold text-text-main hover:border-border-strong transition max-w-32"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="truncate hidden min-[360px]:inline">{userSession ? userSession.name || "حساب من" : "ورود"}</span>
          </Link>
          {/* .btn sets display, so visibility lives on a wrapper */}
          <span className="hidden sm:inline-flex">
            <Link href="/#order" className="btn btn-primary px-4 py-2 text-xs font-bold">
              خرید محصول
            </Link>
          </span>
        </div>
      </div>

      {mobileMenuOpen && (
        <nav aria-label="منوی موبایل" className="lg:hidden border-t border-border-hairline bg-bg-page px-4 py-3">
          {[...links, { href: "/blog", label: "بلاگ" }, { href: "/club-rules", label: "قوانین و مرجوعی" }].map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setMobileMenuOpen(false)} className="block px-3 py-3 rounded-md text-sm text-text-main hover:bg-bg-subtle">
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
