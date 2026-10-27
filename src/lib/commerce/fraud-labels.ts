// برچسب فارسی دلایل تقلب (بدون وابستگی سرور؛ در پنل هم استفاده می‌شود)
export const FRAUD_LABELS: Record<string, string> = {
  SAME_PHONE: "شماره گیرنده همان شماره معرف است",
  SAME_ADDRESS: "کد پستی گیرنده با آدرس معرف یکی است",
  SAME_IP: "ثبت‌نام از همان اینترنت معرف",
  MONTHLY_CAP: "سقف ماهانه پاداش معرفی پر شده",
  REFERRER_MISSING: "معرف پیدا نشد",
  AMBASSADOR_SELF_PURCHASE: "خرید سفیر برای خودش با کد خودش (تخفیف و پورسانت حذف شد)",
};
