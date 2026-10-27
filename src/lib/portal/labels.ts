// Client-safe labels and constants (no server imports)

export const TIER_LABELS = { SILVER: "نقره‌ای", GOLD: "طلایی", DIAMOND: "الماس" } as const;

export const SAMPLE_KIT_STATUS_LABELS = {
  DELIVERED: "تحویل شد",
  FOLLOWED_UP: "پیگیری شد",
  CONVERTED: "به خرید رسید",
  LOST: "منصرف شد",
} as const;

export const SETTLEMENT_STATUS_LABELS = {
  PENDING: "در انتظار بررسی",
  APPROVED: "تأیید شده، در صف واریز",
  REJECTED: "رد شده",
  PAID: "واریز شد",
} as const;

// Loyalty tiers by total delivered purchases (Toman)
export const LOYALTY_TIERS = [
  { key: "BRONZE", label: "برنزی", min: 0 },
  { key: "SILVER", label: "نقره‌ای", min: 1_000_000 },
  { key: "GOLD", label: "طلایی", min: 3_000_000 },
  { key: "DIAMOND", label: "الماس", min: 8_000_000 },
] as const;

export const EXPENSE_CATEGORY_LABELS = {
  MARKETING: "تبلیغات و بازاریابی",
  SHIPPING: "هزینه ارسال",
  PACKAGING: "بسته‌بندی",
  SALARY: "حقوق و دستمزد",
  RENT: "اجاره و قبوض",
  GATEWAY: "کارمزد درگاه و بانک",
  OTHER: "سایر",
} as const;
