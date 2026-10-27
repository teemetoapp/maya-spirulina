"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { formatToman, toPersianDigits } from "@/lib/currency";

export default function CartDrawer() {
  const {
    items,
    isOpen,
    setIsOpen,
    removeItem,
    updateQuantity,
    totalCount,
    totalAmount,
    totalDiscount,
    freeShippingThreshold,
    remainingForFreeShipping,
    postShippingFee,
  } = useCart();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, setIsOpen]);

  if (!isOpen) return null;

  const freeShippingProgress = Math.min(
    100,
    Math.round(((freeShippingThreshold - remainingForFreeShipping) / freeShippingThreshold) * 100)
  );

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true" aria-label="سبد خرید">
      {/* Backdrop */}
      <div
        onClick={() => setIsOpen(false)}
        className="fixed inset-0 bg-black/40 backdrop-blur-2xs transition-opacity duration-200"
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div className="fixed inset-y-0 left-0 max-w-full flex">
        <div className="w-screen max-w-md bg-bg-card border-r border-neutral-200 dark:border-white/10 shadow-xl flex flex-col justify-between overscroll-contain">
          {/* Header */}
          <div className="p-4 border-b border-neutral-200 dark:border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" aria-hidden="true" />
              <h2 className="text-sm font-bold text-neutral-900 dark:text-white">
                سبد خرید ({toPersianDigits(totalCount)})
              </h2>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 rounded-md border border-neutral-200 dark:border-white/10 text-neutral-400 hover:text-neutral-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500"
              aria-label="بستن سبد خرید"
            >
              ✕
            </button>
          </div>

          {/* Free Shipping Progress */}
          <div className="p-4 bg-neutral-50 dark:bg-white/5 border-b border-neutral-200 dark:border-white/10 text-xs">
            <div className="flex items-center justify-between mb-1.5">
              {remainingForFreeShipping > 0 ? (
                <span className="text-neutral-600 dark:text-neutral-400">
                  <strong className="text-neutral-900 dark:text-white font-mono">{formatToman(remainingForFreeShipping)}</strong> دیگر تا ارسال رایگان
                </span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  سفارش شما مشمول ارسال رایگان شد ✓
                </span>
              )}
              <span className="font-mono text-neutral-400 text-[10px]">
                {toPersianDigits(freeShippingProgress)}٪
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-[width] duration-300"
                style={{ width: `${freeShippingProgress}%` }}
              />
            </div>
          </div>

          {/* Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                <span className="text-2xl text-neutral-400" aria-hidden="true">🛒</span>
                <p className="text-xs text-neutral-500">سبد خرید شما خالی است.</p>
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded-lg border border-neutral-200 dark:border-white/10 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-white/5 transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  مشاهده کاتالوگ محصولات
                </button>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg border border-neutral-200 dark:border-white/10 bg-white dark:bg-white/5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-neutral-400 font-mono block">
                      {item.sku}
                    </span>
                    <h4 className="font-bold text-neutral-900 dark:text-white truncate">
                      {item.title}
                    </h4>
                    <div className="font-mono text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                      {formatToman(item.price)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center rounded-lg border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-neutral-900">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="w-6 h-6 flex items-center justify-center text-neutral-500 hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors text-xs focus-visible:ring-1 focus-visible:ring-emerald-500"
                        aria-label="کاهش تعداد"
                      >
                        -
                      </button>
                      <span className="w-6 text-center font-mono font-bold text-neutral-900 dark:text-white">
                        {toPersianDigits(item.quantity)}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="w-6 h-6 flex items-center justify-center text-neutral-500 hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors text-xs focus-visible:ring-1 focus-visible:ring-emerald-500"
                        aria-label="افزایش تعداد"
                      >
                        +
                      </button>
                    </div>

                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1 text-neutral-400 hover:text-rose-500 transition-colors cursor-pointer focus-visible:ring-1 focus-visible:ring-rose-500 rounded"
                      aria-label="حذف محصول از سبد خرید"
                      title="حذف"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Checkout */}
          {items.length > 0 && (
            <div className="p-4 border-t border-neutral-200 dark:border-white/10 bg-white dark:bg-bg-page space-y-3">
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-neutral-500">مبلغ کل سفارش:</span>
                <span className="text-base font-bold text-neutral-900 dark:text-white font-mono">
                  {formatToman(totalAmount + (remainingForFreeShipping === 0 ? 0 : postShippingFee))}
                </span>
              </div>

              <Link
                href="/checkout"
                onClick={() => setIsOpen(false)}
                className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-extrabold flex items-center justify-center transition active:scale-[0.99] cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.25)]"
              >
                ادامه فرآیند خرید و تسویه
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
