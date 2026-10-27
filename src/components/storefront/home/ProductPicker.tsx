"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart-context";
import { formatToman, toPersianDigits } from "@/lib/currency";
import type { StorefrontProduct } from "@/lib/commerce/catalog";

const FORMAT_LABEL = { CAPSULE: "کپسول", POWDER: "پودر" } as const;

// انتخاب بسته و افزودن به سبد؛ قیمت نهایی را سرور در صفحه پرداخت حساب می‌کند
export default function ProductPicker({ product }: { product: StorefrontProduct }) {
  const { addItem, setIsOpen } = useCart();
  const formats = (["CAPSULE", "POWDER"] as const).filter((f) => product.variants.some((v) => v.format === f));
  const [format, setFormat] = useState(formats[0]);
  const plans = product.variants.filter((v) => v.format === format).sort((a, b) => a.durationDays - b.durationDays);

  const add = (v: StorefrontProduct["variants"][number]) => {
    addItem({
      id: v.sku,
      slug: v.sku.toLowerCase(),
      title: `${product.title} - ${v.title} (${FORMAT_LABEL[v.format]})`,
      sku: v.sku,
      price: v.price,
      compareAtPrice: v.compareAtPrice ?? undefined,
      icon: "🌿",
      category: v.format === "CAPSULE" ? "tablets" : "powder",
      categoryLabel: FORMAT_LABEL[v.format],
      gradient: "from-neutral-800 to-neutral-900",
    });
    setIsOpen(true);
  };

  return (
    <div className="space-y-8">
      {formats.length > 1 && (
        <div role="tablist" aria-label="شکل محصول" className="mx-auto flex w-fit rounded-xl border border-border-hairline bg-bg-card p-1">
          {formats.map((f) => (
            <button
              key={f}
              role="tab"
              aria-selected={format === f}
              onClick={() => setFormat(f)}
              className={`min-w-28 rounded-lg px-5 py-2 text-sm font-bold transition ${format === f ? "bg-accent-deep text-white dark:bg-accent-primary dark:text-bg-page" : "text-text-muted hover:text-text-main"}`}
            >
              {FORMAT_LABEL[f]}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((v) => {
          const popular = v.badge === "پرفروش‌ترین";
          const inStock = v.stock > 0;
          return (
            <article key={v.sku} className={`relative flex flex-col rounded-2xl border bg-bg-card p-6 ${popular ? "border-accent-primary shadow-lg" : "border-border-hairline"}`}>
              {v.badge && <span className={`absolute -top-3 right-6 rounded-full px-3 py-1 text-xs font-bold ${popular ? "bg-accent-deep text-white dark:bg-accent-primary dark:text-bg-page" : "bg-bg-subtle text-brand-gold border border-border-hairline"}`}>{v.badge}</span>}
              <h3 className="text-lg font-black text-text-main">{v.title}</h3>
              <p className="mt-1 text-sm text-text-muted">{toPersianDigits(v.durationDays)} روز مصرف · {FORMAT_LABEL[v.format]}</p>
              {v.packDescription && <p className="mt-3 text-sm leading-7 text-text-muted">{v.packDescription}</p>}
              <div className="mt-auto pt-6 space-y-1">
                {v.compareAtPrice && v.compareAtPrice > v.price && <p className="text-sm text-text-subtle line-through">{formatToman(v.compareAtPrice)}</p>}
                <p className="text-2xl font-black text-text-main">{formatToman(v.price)}</p>
                <p className="text-xs text-text-muted">{v.price >= product.freeShippingThreshold ? "ارسال رایگان با پست" : `هزینه ارسال از ${formatToman(product.postShippingFee)}`}</p>
              </div>
              <button type="button" disabled={!inStock} onClick={() => add(v)} className={`btn mt-5 w-full py-3 text-sm ${popular ? "btn-primary" : "btn-outline"}`}>
                {inStock ? "افزودن به سبد خرید" : "فعلاً موجود نیست"}
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}
