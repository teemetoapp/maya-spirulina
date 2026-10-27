// Pure pricing helpers (shared by the server and the costing page)

// قیمت پیشنهادی برای حاشیه هدف (درصد سود از قیمت فروش)، گرد به بالا
export function priceForMargin(fullCost: number, marginPercent: number, rounding: number): number {
  const m = Math.min(95, Math.max(0, marginPercent)) / 100;
  const raw = fullCost / (1 - m);
  const step = Math.max(1, rounding);
  return Math.ceil(raw / step) * step;
}

// حاشیه سود یک قیمت (درصد از قیمت فروش)
export function marginOf(price: number, fullCost: number): number {
  return price > 0 ? Math.round(((price - fullCost) / price) * 1000) / 10 : 0;
}

export const FIXED_COST_LABELS = {
  SALARY: "حقوق و دستمزد",
  RENT: "اجاره",
  UTILITIES: "قبوض و انرژی",
  DEPRECIATION: "استهلاک تجهیزات",
  MARKETING: "بازاریابی ثابت",
  SOFTWARE: "نرم‌افزار و سرویس‌ها",
  OTHER: "سایر",
} as const;
export type FixedCostCategoryKey = keyof typeof FIXED_COST_LABELS;
