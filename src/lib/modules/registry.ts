// ==============================================================
// Module registry — every feature of the platform is a module the
// super admin can switch on or off in «مرکز کنترل سازمان › ماژول‌ها».
//
// A module owns:
//   permissions  stripped from every user while the module is off, so
//                its API routes answer 403 and its admin pages vanish
//   sections     portal pages that need the module token (module:<key>)
//                in addition to their permissions
//   rules        Setting keys edited from the module card
//   dependsOn    modules that must stay on for this one to work
//
// Server-side effects (checkout, cron, notifications…) read the state
// with isModuleEnabled() from src/lib/modules/server.ts.
// No imports from prisma here: this file is shared with client components.
// ==============================================================

import type { Permission } from "@/lib/rbac/permissions";
import type { SETTING_DEFAULTS } from "@/lib/settings-defaults";
import { toPersianDigits } from "@/lib/currency";

export type ModuleGroup = "core" | "sales" | "marketing" | "service" | "finance" | "system";

export const MODULE_GROUPS: { id: ModuleGroup; label: string }[] = [
  { id: "core", label: "هسته فروشگاه" },
  { id: "sales", label: "فروش و وفاداری" },
  { id: "marketing", label: "بازاریابی و سفیران" },
  { id: "service", label: "پشتیبانی و مشاوره" },
  { id: "finance", label: "مالی" },
  { id: "system", label: "ابزارهای سازمان" },
];

export type RuleType = "toman" | "percent" | "days" | "hours" | "count" | "boolean" | "text";

export interface ModuleRule {
  key: keyof typeof SETTING_DEFAULTS;
  type: RuleType;
  min?: number;
  max?: number;
  // فقط برای text: الگوی مجاز و نمونه درست برای پیام خطا
  pattern?: string;
  example?: string;
}

export interface ModuleDef {
  key: string;
  label: string;
  description: string;
  // اثر خاموش شدن، برای نمایش در پنجره تأیید
  offEffect: string;
  group: ModuleGroup;
  core?: boolean;
  defaultEnabled?: boolean;
  permissions: Permission[];
  sections: string[];
  dependsOn?: string[];
  rules: ModuleRule[];
}

export const MODULES = [
  // ------------------------------------------------------------ core
  {
    key: "orders",
    label: "فروشگاه و سفارش‌ها",
    description: "سبد خرید، پرداخت، ارسال، لغو و مرجوعی سفارش‌ها.",
    offEffect: "ثبت سفارش جدید در سایت متوقف و بخش سفارش‌ها از پنل پنهان می‌شود. سفارش‌های قبلی حذف نمی‌شوند.",
    group: "core",
    core: true,
    permissions: ["orders.view", "orders.manage"],
    sections: ["orders"],
    rules: [
      { key: "FREE_SHIPPING_THRESHOLD", type: "toman", min: 0 },
      { key: "SHIPPING_FEE_POST", type: "toman", min: 0 },
      { key: "SHIPPING_ZONES", type: "text", min: 0, max: 800, pattern: "^[^:,]+:\\d+(,[^:,]+:\\d+)*$", example: "تهران:45000,کرج:55000,مشهد:70000" },
      { key: "SHIPPING_FEE_EXPRESS", type: "toman", min: 0 },
      { key: "PENDING_ORDER_EXPIRY_HOURS", type: "hours", min: 0, max: 720 },
      { key: "RETURN_WINDOW_DAYS", type: "days", min: 0, max: 60 },
    ],
  },
  {
    key: "catalog",
    label: "محصولات و انبار",
    description: "تعریف محصول و بسته، قیمت، موجودی و بچ‌های تولید.",
    offEffect: "ویرایش محصولات و موجودی از پنل پنهان می‌شود؛ ویترین سایت با آخرین اطلاعات باقی می‌ماند.",
    group: "core",
    core: true,
    permissions: ["products.view", "products.manage", "inventory.manage"],
    sections: ["catalog"],
    // متن وضعیت مجوزها در پایین همه صفحه‌های سایت؛ فقط بر اساس مدرک واقعی
    rules: [
      { key: "LICENSE_SHILAT", type: "text", max: 80 },
      { key: "LICENSE_FDA", type: "text", max: 80 },
      { key: "LICENSE_SIB", type: "text", max: 80 },
      { key: "LICENSE_FDA_IRC", type: "text", min: 0, max: 40 },
      { key: "ENAMAD_ID", type: "text", min: 0, max: 20 },
      { key: "ENAMAD_CODE", type: "text", min: 0, max: 40 },
    ],
  },
  {
    key: "crm",
    label: "مخاطبان و CRM",
    description: "پرونده کامل هر شخص: اطلاعات تماس، سفارش‌ها، تیکت‌ها، گفت‌وگوها، تماس‌ها، رضایت و نارضایتی، مسئول ارتباط و پیگیری‌ها.",
    offEffect: "مخاطبان و پیگیری‌ها از پنل پنهان می‌شوند.",
    group: "core",
    core: true,
    permissions: ["users.view", "users.manage", "crm.followup"],
    sections: ["contacts", "followups"],
    rules: [{ key: "CRM_AT_RISK_DAYS", type: "days", min: 15, max: 720 }],
  },
  {
    key: "notifications",
    label: "اعلان‌ها (پیامک، تلگرام، ایمیل)",
    description: "ارسال خودکار پیام برای رویدادهای سفارش، سفیران، تیکت و انبار.",
    offEffect: "هیچ پیامک، پیام تلگرام یا ایمیلی ارسال نمی‌شود؛ ورود با کد یک‌بارمصرف همچنان کار می‌کند.",
    group: "core",
    core: true,
    permissions: ["notifications.manage"],
    sections: [],
    rules: [],
  },

  // ------------------------------------------------------------ sales
  {
    key: "refill",
    label: "یادآوری تمدید مصرف",
    description: "چند روز قبل از تمام شدن دوره مصرف هر بسته، به مشتری یادآوری و کد تخفیف تمدید ارسال می‌شود.",
    offEffect: "یادآوری تمدید ارسال نمی‌شود و کارت «تا پایان دوره مصرف» از حساب مشتری پنهان می‌شود.",
    group: "sales",
    dependsOn: ["orders"],
    permissions: [],
    sections: ["refills"],
    rules: [
      { key: "REFILL_REMIND_DAYS_BEFORE", type: "days", min: 1, max: 60 },
      { key: "REFILL_DISCOUNT_PERCENT", type: "percent", min: 0, max: 50 },
      { key: "REFILL_COUPON_VALID_DAYS", type: "days", min: 1, max: 90 },
    ],
  },
  {
    key: "loyalty",
    label: "امتیاز وفاداری",
    description: "امتیاز خوش‌آمد، خرید و معرفی دوستان (فقط یک سطح، پس از تحویل و پایان مهلت مرجوعی) با تاریخ انقضا؛ قابل تبدیل به اعتبار کیف پول.",
    offEffect: "امتیاز جدیدی داده نمی‌شود و تبدیل امتیاز به اعتبار بسته می‌شود. امتیازهای قبلی محفوظ می‌مانند.",
    group: "sales",
    permissions: [],
    sections: [],
    rules: [
      { key: "SIGNUP_REWARD_POINTS", type: "count", min: 0 },
      { key: "PURCHASE_POINTS_PER_100K", type: "count", min: 0 },
      { key: "POINTS_TO_TOMAN_RATIO", type: "toman", min: 0 },
      { key: "MIN_POINTS_TO_REDEEM", type: "count", min: 0 },
      { key: "POINTS_EXPIRY_DAYS", type: "days", min: 0, max: 3650 },
      { key: "REFERRAL_REWARD_POINTS", type: "count", min: 0 },
      { key: "REFERRAL_MAX_PER_MONTH", type: "count", min: 0, max: 100 },
    ],
  },
  {
    key: "coupons",
    label: "کد تخفیف و کمپین",
    description: "کدهای تخفیف درصدی یا مبلغی با سقف، تاریخ انقضا و ظرفیت؛ بنرهای کمپین.",
    offEffect: "کد تخفیف در صفحه پرداخت پذیرفته نمی‌شود و بخش کوپن از پنل پنهان می‌شود.",
    group: "sales",
    permissions: ["marketing.manage"],
    sections: ["promotions"],
    rules: [],
  },
  {
    key: "campaigns",
    label: "کمپین پیامکی و بازگرداندن مشتری",
    description: "پیامک گروهی به هر بخش از مشتریان (فقط دارای رضایت، با «لغو۱۱»)، و پیامک خودکار با کد تخفیف برای مشتریان در خطر ریزش.",
    offEffect: "ارسال کمپین و پیامک بازگشت متوقف می‌شود؛ گزارش کمپین‌های قبلی می‌ماند.",
    group: "sales",
    dependsOn: ["notifications"],
    permissions: [],
    sections: ["campaigns"],
    rules: [
      { key: "WINBACK_ENABLED", type: "boolean" },
      { key: "WINBACK_DISCOUNT_PERCENT", type: "percent", min: 0, max: 50 },
      { key: "WINBACK_COUPON_DAYS", type: "days", min: 1, max: 90 },
      { key: "WINBACK_REPEAT_DAYS", type: "days", min: 30, max: 720 },
    ],
  },
  {
    key: "reviews",
    label: "نظرسنجی و نظرات خریداران",
    description: "چند روز بعد از تحویل از خریدار امتیاز رضایت گرفته می‌شود؛ نظرهایی که خریدار اجازه انتشار داده، پس از تأیید با برچسب «خرید تأییدشده» در سایت نمایش داده می‌شوند.",
    offEffect: "پیامک نظرسنجی ارسال نمی‌شود، ثبت نظر بسته و نظرات از سایت پنهان می‌شوند.",
    group: "sales",
    dependsOn: ["orders"],
    permissions: [],
    sections: ["reviews"],
    rules: [{ key: "REVIEW_REQUEST_DAYS", type: "days", min: 1, max: 60 }],
  },
  {
    key: "abandoned",
    label: "سبدهای رهاشده",
    description: "فهرست پرداخت‌های ناتمام برای پیگیری تلفنی یا پیامکی.",
    offEffect: "بخش سبدهای رهاشده از پنل پنهان می‌شود.",
    group: "sales",
    permissions: ["carts.view"],
    sections: ["abandoned"],
    rules: [],
  },

  // ------------------------------------------------------------ marketing
  {
    key: "ambassadors",
    label: "سفیران برند",
    description: "لینک و کد معرفی، تخفیف خریدار، پورسانت پله‌ای، ارتقای خودکار و تسویه.",
    offEffect: "لینک‌های معرفی تخفیف و پورسانت نمی‌دهند، پرتال سفیر و فرم «سفیر شوید» بسته می‌شوند. کیف پول سفیران محفوظ می‌ماند.",
    group: "marketing",
    permissions: ["portal.ambassador", "ambassadors.manage", "settlements.approve"],
    sections: ["ambassadors", "become-ambassador"],
    rules: [
      { key: "AMBASSADOR_CUSTOMER_DISCOUNT", type: "percent", min: 0, max: 50 },
      { key: "COMMISSION_SILVER", type: "percent", min: 0, max: 50 },
      { key: "COMMISSION_GOLD", type: "percent", min: 0, max: 50 },
      { key: "COMMISSION_DIAMOND", type: "percent", min: 0, max: 50 },
      { key: "TIER_GOLD_MIN_SALES", type: "toman", min: 0 },
      { key: "TIER_DIAMOND_MIN_SALES", type: "toman", min: 0 },
      { key: "REFERRAL_COOKIE_DAYS", type: "days", min: 1, max: 365 },
      { key: "MIN_SETTLEMENT_TOMAN", type: "toman", min: 0 },
    ],
  },
  {
    key: "wholesale",
    label: "فروش عمده (فروشگاه‌ها و باشگاه‌ها)",
    description: "همکاران عمده با نقش «همکار عمده» از پنل خودشان سفارش می‌دهند و بر اساس تعداد کل، تخفیف پلکانی می‌گیرند. سفارش عمده پورسانت سفیر ندارد.",
    offEffect: "پنل عمده بسته و قیمت پلکانی غیرفعال می‌شود؛ همکاران مثل مشتری عادی خرید می‌کنند.",
    group: "marketing",
    dependsOn: ["orders"],
    permissions: ["portal.wholesale"],
    sections: ["wholesale"],
    rules: [
      { key: "WHOLESALE_MIN_QTY", type: "count", min: 1, max: 1000 },
      { key: "WHOLESALE_TIERS", type: "text", max: 120, pattern: "^\\d+:\\d{1,2}(,\\d+:\\d{1,2})*$", example: "10:15,30:20,60:25" },
    ],
  },
  {
    key: "trace",
    label: "ردیابی بچ تولید با QR",
    description: "مشتری با اسکن QR روی بسته، تاریخ برداشت، تولید و انقضا و برگه آزمایش همان سری را می‌بیند. فقط سری‌هایی نمایش داده می‌شوند که انبار منتشر کرده باشد.",
    offEffect: "صفحه ردیابی سری‌ها از سایت برداشته می‌شود؛ اطلاعات بچ‌ها در انبار می‌ماند.",
    group: "marketing",
    permissions: [],
    sections: [],
    rules: [],
  },
  {
    key: "blog",
    label: "بلاگ و محتوای آموزشی",
    description: "مقاله، دستور مصرف و راهنما برای سئو؛ با منبع برای هر ادعا. نقشه سایت برای گوگل خودکار ساخته می‌شود.",
    offEffect: "بلاگ از سایت و پنل پنهان می‌شود؛ مقاله‌ها حذف نمی‌شوند.",
    group: "marketing",
    permissions: [],
    sections: ["articles"],
    rules: [],
  },
  {
    key: "samplekits",
    label: "کیت سمپل",
    description: "ثبت کیت تحویل‌شده در مطب و پیگیری خودکار تا تبدیل به خرید.",
    offEffect: "ثبت کیت سمپل و پیام‌های پیگیری متوقف می‌شود.",
    group: "marketing",
    dependsOn: ["ambassadors"],
    permissions: ["samplekits.manage"],
    sections: ["samplekits", "ambassador-samples"],
    rules: [{ key: "SAMPLE_KIT_FOLLOWUP_DAYS", type: "days", min: 1, max: 30 }],
  },
  {
    key: "content",
    label: "پرونده‌های بالینی",
    description: "مدیریت پرونده‌های بالینی منتشرشده (فقط با مدرک و رضایت کتبی).",
    offEffect: "بخش محتوا از پنل پنهان می‌شود.",
    group: "marketing",
    permissions: ["content.manage"],
    sections: ["content"],
    rules: [],
  },

  // ------------------------------------------------------------ service
  {
    key: "tickets",
    label: "تیکت پشتیبانی",
    description: "تیکت مشتریان و سفیران، کانبان پشتیبانی، زمان پاسخ و امتیاز رضایت.",
    offEffect: "ثبت تیکت جدید بسته و بخش تیکت از همه پرتال‌ها پنهان می‌شود.",
    group: "service",
    permissions: ["tickets.manage"],
    sections: ["tickets", "my-tickets", "ambassador-tickets"],
    rules: [],
  },
  {
    key: "consultation",
    label: "مشاوره تغذیه و پرتال مشاور",
    description: "مشتری فرم مشاوره پر می‌کند، درخواست به مشاور تغذیه ارجاع می‌شود و مشاور در پرتال خودش پاسخ می‌دهد.",
    offEffect: "ثبت درخواست مشاوره بسته و پرتال مشاور غیرفعال می‌شود. گفت‌وگوهای قبلی حذف نمی‌شوند.",
    group: "service",
    permissions: ["portal.consultant", "consult.manage"],
    sections: ["my-consultations", "consultations"],
    rules: [
      { key: "CONSULT_MAX_OPEN", type: "count", min: 1, max: 10 },
      { key: "CONSULT_BUYERS_ONLY", type: "boolean" },
      { key: "CONSULT_RESPONSE_HOURS", type: "hours", min: 1, max: 240 },
    ],
  },
  {
    key: "livechat",
    label: "گفت‌وگوی آنلاین سایت",
    description: "ابزارک گفت‌وگو در سایت و حساب کاربری برای پشتیبانی، مشاوره و خرید؛ کارشناس کنار هر گفت‌وگو پرونده مشتری را می‌بیند.",
    offEffect: "ابزارک گفت‌وگو از سایت حذف و صندوق گفت‌وگوها پنهان می‌شود. گفت‌وگوهای قبلی در پرونده مخاطب می‌مانند.",
    group: "service",
    permissions: ["livechat.answer"],
    sections: ["livechat", "consult-livechat"],
    rules: [
      { key: "LIVECHAT_GUESTS", type: "boolean" },
      { key: "LIVECHAT_START_HOUR", type: "hours", min: 0, max: 23 },
      { key: "LIVECHAT_END_HOUR", type: "hours", min: 1, max: 24 },
    ],
  },
  {
    key: "chat",
    label: "پیام‌رسان داخلی",
    description: "گفت‌وگوی مستقیم و گروهی کارکنان، با ابزار مدیریت پیام.",
    offEffect: "پیام‌رسان برای همه کارکنان بسته می‌شود؛ پیام‌های قبلی حذف نمی‌شوند.",
    group: "service",
    permissions: ["chat.use", "chat.groups.create", "chat.moderate"],
    sections: ["messages"],
    rules: [],
  },

  // ------------------------------------------------------------ finance
  {
    key: "finance",
    label: "حسابداری و سود و زیان",
    description: "سود و زیان ماهانه، ثبت هزینه‌ها و خروجی اکسل.",
    offEffect: "گزارش‌های مالی و ثبت هزینه از پنل پنهان می‌شود.",
    group: "finance",
    permissions: ["finance.view", "finance.manage"],
    sections: ["finance"],
    rules: [],
  },
  {
    key: "invoice",
    label: "صورتحساب رسمی (سامانه مودیان)",
    description: "شماره صورتحساب پیاپی برای هر سفارش پرداخت‌شده، صورتحساب قابل چاپ برای مشتری و خروجی اکسل برای بارگذاری در سامانه مودیان. اطلاعات و نرخ مالیات را با حسابدار تأیید کنید.",
    offEffect: "صورتحساب و خروجی مودیان پنهان می‌شود؛ شماره‌های صادرشده محفوظ می‌مانند.",
    group: "finance",
    // پیش‌فرض خاموش تا اطلاعات فروشنده و نرخ مالیات با حسابدار تأیید و وارد شود
    defaultEnabled: false,
    dependsOn: ["orders"],
    permissions: [],
    sections: [],
    rules: [
      { key: "SELLER_NAME", type: "text", min: 0, max: 120 },
      { key: "SELLER_NATIONAL_ID", type: "text", min: 0, max: 20 },
      { key: "SELLER_ECONOMIC_CODE", type: "text", min: 0, max: 20 },
      { key: "SELLER_ADDRESS", type: "text", min: 0, max: 200 },
      { key: "SELLER_POSTAL_CODE", type: "text", min: 0, max: 10 },
      { key: "SELLER_PHONE", type: "text", min: 0, max: 20 },
      { key: "VAT_PERCENT", type: "percent", min: 0, max: 30 },
      { key: "TAX_GOODS_ID", type: "text", min: 0, max: 20 },
    ],
  },
  {
    key: "costing",
    label: "بهای تمام‌شده",
    description: "فرمول هزینه هر بسته با نرخ منابع مشترک (آب، برق، مواد)، سهم هزینه‌های ثابت (حقوق، اجاره، …) و اسلایدر حاشیه سود برای تعیین قیمت سایت.",
    offEffect: "بخش بهای تمام‌شده پنهان می‌شود؛ گزارش سود از آخرین بهای ثبت‌شده استفاده می‌کند.",
    group: "finance",
    permissions: ["costing.manage"],
    sections: ["costing"],
    rules: [
      { key: "COSTING_MONTHLY_UNITS", type: "count", min: 1 },
      { key: "COSTING_PRICE_ROUNDING", type: "toman", min: 1, max: 1000000 },
    ],
  },

  // ------------------------------------------------------------ system
  {
    key: "dashboard",
    label: "داشبورد مدیریتی",
    description: "شاخص‌های فروش، سود، کانال‌ها، استان‌ها و سفیران برتر؛ گزارش منبع فروش و قیف فروش.",
    offEffect: "داشبورد پنهان می‌شود و کارکنان مستقیم وارد اولین بخش مجاز می‌شوند.",
    group: "system",
    permissions: ["dashboard.view"],
    sections: ["overview", "sales-report"],
    rules: [],
  },
  {
    key: "expiry",
    label: "کنترل انقضا",
    description: "هشدار خودکار به انبار پیش از رسیدن تاریخ انقضای هر بچ تولید.",
    offEffect: "هشدار انقضا ارسال نمی‌شود.",
    group: "system",
    permissions: [],
    sections: [],
    rules: [{ key: "EXPIRY_ALERT_DAYS", type: "days", min: 1, max: 365 }],
  },
  {
    key: "monitoring",
    label: "هشدار خرابی سرویس‌ها",
    description: "هر بار که کار زمان‌بندی‌شده اجرا می‌شود، دیتابیس، Redis، پنل پیامک و درگاه پرداخت بررسی می‌شوند. اگر یکی از کار بیفتد یا خطای سرور رخ دهد، در گروه تلگرام مدیران هشدار می‌آید و بعد از رفع مشکل هم خبر داده می‌شود.",
    offEffect: "هشدار تلگرامی ارسال نمی‌شود و صفحه سلامت سرویس‌ها پنهان می‌شود.",
    group: "system",
    permissions: [],
    sections: ["health"],
    rules: [
      { key: "SMS_CREDIT_ALERT", type: "count", min: 0 },
      { key: "ALERT_REPEAT_MINUTES", type: "count", min: 10, max: 1440 },
    ],
  },
  {
    key: "warehouses",
    label: "چند انبار",
    description: "موجودی فیزیکی هر انبار جدا نگه داشته می‌شود، بچ‌ها در انبار مشخص ثبت می‌شوند و بین انبارها انتقال ثبت می‌شود. هنگام ارسال سفارش، انبار مبدأ انتخاب می‌شود.",
    offEffect: "همه چیز مثل یک انبار نمایش داده می‌شود؛ موجودی هر انبار حذف نمی‌شود.",
    group: "core",
    dependsOn: ["catalog"],
    permissions: [],
    sections: [],
    rules: [],
  },
  {
    key: "audit",
    label: "لاگ امنیتی",
    description: "نمایش رویدادهای حساس: ورود، تغییر نقش، تغییر وضعیت سفارش و ماژول‌ها.",
    offEffect: "صفحه لاگ پنهان می‌شود؛ ثبت رویدادها برای امنیت ادامه دارد.",
    group: "system",
    permissions: ["audit.view"],
    sections: ["audit"],
    rules: [],
  },
] as const satisfies readonly ModuleDef[];

export type ModuleKey = (typeof MODULES)[number]["key"];

export const MODULE_KEYS: ModuleKey[] = MODULES.map((m) => m.key);

export function getModule(key: string): ModuleDef | undefined {
  return (MODULES as readonly ModuleDef[]).find((m) => m.key === key);
}

export const moduleToken = (key: ModuleKey | string) => `module:${key}`;

// ماژولی که بخش به آن تعلق دارد
export function moduleForSection(sectionId: string): ModuleDef | undefined {
  return (MODULES as readonly ModuleDef[]).find((m) => m.sections.includes(sectionId));
}

// ماژول‌هایی که با خاموش شدن این ماژول از کار می‌افتند
export function dependentsOf(key: string): ModuleDef[] {
  return (MODULES as readonly ModuleDef[]).filter((m) => m.dependsOn?.includes(key));
}

export const RULE_UNITS: Record<RuleType, string> = {
  toman: "تومان",
  percent: "درصد",
  days: "روز",
  hours: "ساعت",
  count: "",
  boolean: "",
  text: "",
};

// اعتبارسنجی مقدار یک قانون (هم در فرم و هم در API)
export function validateRule(rule: ModuleRule, raw: string, label: string): { value: string } | { error: string } {
  if (rule.type === "text") {
    const text = raw.trim();
    // min: 0 یعنی خالی گذاشتن مجاز است (مثلاً کد اینماد تا وقتی گرفته نشده)
    if (!text && rule.min === 0) return { value: "" };
    if (!text || text.length > (rule.max ?? 80)) return { error: `«${label}» باید بین ۱ تا ${toPersianDigits(rule.max ?? 80)} حرف باشد.` };
    const clean = rule.pattern ? text.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/\s+/g, "") : text;
    if (rule.pattern && !new RegExp(rule.pattern).test(clean)) return { error: `«${label}» درست نیست؛ نمونه: ${rule.example ?? ""}` };
    return { value: clean };
  }
  const value = raw.trim().replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
  if (rule.type === "boolean") {
    if (value !== "0" && value !== "1") return { error: `«${label}» باید روشن یا خاموش باشد.` };
    return { value };
  }
  if (!/^\d+$/.test(value)) return { error: `«${label}» باید عدد صحیح و نامنفی باشد.` };
  const n = Number(value);
  if (rule.min !== undefined && n < rule.min) return { error: `«${label}» نباید کمتر از ${toPersianDigits(rule.min)} باشد.` };
  if (rule.max !== undefined && n > rule.max) return { error: `«${label}» نباید بیشتر از ${toPersianDigits(rule.max)} باشد.` };
  return { value };
}

export function ruleOwner(settingKey: string): ModuleDef | undefined {
  return (MODULES as readonly ModuleDef[]).find((m) => m.rules.some((r) => r.key === settingKey));
}
