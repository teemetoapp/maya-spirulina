"use client";

import { useIsClient } from "@/lib/use-is-client";
import React from "react";
import { useTheme } from "@/lib/theme-context";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export default function ThemeToggle({ className = "", showLabel = false }: ThemeToggleProps) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const mounted = useIsClient();

  if (!mounted) {
    return (
      <div
        className={`w-9 h-9 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 opacity-50 ${className}`}
        aria-hidden="true"
      />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative inline-flex items-center gap-2 p-2 rounded-xl transition-all duration-300 cursor-pointer select-none
        border border-slate-200 dark:border-white/10
        bg-white dark:bg-white/5 
        hover:bg-slate-100 dark:hover:bg-white/10
        text-slate-700 dark:text-slate-200
        shadow-xs active:scale-95 group ${className}`}
      title={isDark ? "تغییر به تم روز (روشن)" : "تغییر به تم شب (تاریک)"}
      aria-label="تغییر تم روز و شب"
    >
      <div className="relative w-5 h-5 flex items-center justify-center">
        {/* Sun Icon for Light Mode */}
        <svg
          className={`w-5 h-5 text-amber-500 transition-all duration-500 transform ${
            isDark ? "rotate-90 scale-0 opacity-0 absolute" : "rotate-0 scale-100 opacity-100"
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>

        {/* Moon Icon for Dark Mode */}
        <svg
          className={`w-5 h-5 text-emerald-400 transition-all duration-500 transform ${
            isDark ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0 absolute"
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      </div>

      {showLabel && (
        <span className="text-xs font-semibold hidden sm:inline">
          {isDark ? "تم شب" : "تم روز"}
        </span>
      )}
    </button>
  );
}
