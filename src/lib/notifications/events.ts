// ==============================================================
// Notification events — every message the platform can send.
// Variables in {{double_braces}} are filled from the event payload.
// Default templates and routing rules are written by prisma/seed.ts
// and are editable by the super admin in «تنظیمات و اعلان‌ها».
// ==============================================================

export interface NotificationEventDef {
  key: string;
  label: string;
  variables: string[];
}

export const NOTIFICATION_EVENTS = [
  { key: "order.paid", label: "ثبت و پرداخت سفارش", variables: ["name", "orderNumber", "amount"] },
  { key: "order.shipped", label: "ارسال سفارش", variables: ["name", "orderNumber", "trackingCode", "carrier"] },
  { key: "order.delivered", label: "تحویل سفارش", variables: ["name", "orderNumber"] },
  { key: "order.cancelled", label: "لغو سفارش", variables: ["name", "orderNumber"] },
  { key: "admin.new_user", label: "ثبت‌نام کاربر جدید (برای مدیر ارشد)", variables: ["phone", "date"] },
  { key: "admin.new_order", label: "سفارش جدید (برای تیم)", variables: ["orderNumber", "amount", "customer"] },
  { key: "ambassador.commission", label: "ثبت پورسانت برای سفیر", variables: ["name", "orderNumber", "commission"] },
  { key: "settlement.requested", label: "درخواست تسویه (برای مالی)", variables: ["name", "amount"] },
  { key: "settlement.paid", label: "پرداخت تسویه سفیر", variables: ["name", "amount", "receipt"] },
  { key: "settlement.rejected", label: "رد درخواست تسویه", variables: ["name", "amount", "reason"] },
  { key: "ambassador.application", label: "درخواست سفیر جدید (برای تیم)", variables: ["name", "profession", "city"] },
  { key: "ambassador.approved", label: "تأیید درخواست سفیر", variables: ["name"] },
  { key: "samplekit.followup", label: "پیگیری روز سوم کیت سمپل (برای سفیر)", variables: ["name", "recipient", "phone"] },
  { key: "ticket.created", label: "تیکت جدید (برای پشتیبانی)", variables: ["subject", "customer"] },
  { key: "ticket.answered", label: "پاسخ به تیکت", variables: ["name", "subject"] },
  { key: "inventory.low_stock", label: "کمبود موجودی (برای انبار)", variables: ["sku", "stock"] },
  { key: "inventory.expiring", label: "نزدیک شدن تاریخ انقضا (برای انبار)", variables: ["batchCode", "sku", "date"] },
  { key: "consult.created", label: "درخواست مشاوره جدید (برای مشاوران)", variables: ["subject", "customer"] },
  { key: "consult.answered", label: "پاسخ مشاور تغذیه", variables: ["name", "subject"] },
  { key: "livechat.new", label: "گفت‌وگوی آنلاین جدید (برای پشتیبانی)", variables: ["customer", "topic", "message"] },
  { key: "return.requested", label: "درخواست مرجوعی (برای تیم)", variables: ["orderNumber", "customer", "reason"] },
  { key: "return.updated", label: "نتیجه درخواست مرجوعی", variables: ["name", "orderNumber", "status", "note"] },
  { key: "review.request", label: "نظرسنجی بعد از تحویل", variables: ["name", "orderNumber", "link"] },
  { key: "review.low", label: "نارضایتی خریدار (برای تیم)", variables: ["customer", "orderNumber", "rating", "comment"] },
  { key: "referral.reward", label: "پاداش معرفی دوست", variables: ["name", "points"] },
  { key: "winback.offer", label: "پیامک بازگشت مشتری غیرفعال (تبلیغاتی)", variables: ["name", "discount", "coupon", "days", "link"] },
  { key: "refill.reminder", label: "یادآوری تمدید مصرف", variables: ["name", "days", "product", "coupon", "link"] },
] as const satisfies readonly NotificationEventDef[];

export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number]["key"];
