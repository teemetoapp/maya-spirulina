// ==============================================================
// RBAC — Permission catalog & default roles
// Single source for every permission key used in API routes,
// portal sections and the role editor of the super admin.
// ==============================================================

export interface PermissionDef {
  key: string;
  label: string;
  group: string;
}

export const PERMISSIONS = [
  // پرتال‌های شخصی
  { key: "portal.customer", label: "دسترسی به حساب کاربری (سفارش‌ها، کیف پول، امتیاز)", group: "پرتال‌ها" },
  { key: "portal.ambassador", label: "پرتال سفیر (لینک معرفی، پورسانت، کیت سمپل)", group: "پرتال‌ها" },
  { key: "portal.consultant", label: "پرتال مشاور (پاسخ به درخواست‌های مشاوره ارجاع‌شده)", group: "پرتال‌ها" },
  { key: "portal.wholesale", label: "پنل همکار عمده (قیمت پلکانی و سفارش عمده)", group: "پرتال‌ها" },

  // عمومی
  { key: "dashboard.view", label: "مشاهده داشبورد تحلیلی", group: "عمومی" },
  { key: "chat.use", label: "پیام‌رسان و هماهنگی داخلی", group: "عمومی" },
  { key: "chat.groups.create", label: "ساخت گروه در پیام‌ها", group: "عمومی" },
  { key: "chat.moderate", label: "حذف و ویرایش پیام دیگران و بلاک کاربر در پیام‌ها", group: "عمومی" },

  // فروش
  { key: "orders.view", label: "مشاهده سفارش‌ها", group: "فروش" },
  { key: "orders.manage", label: "تغییر وضعیت سفارش و ثبت کد رهگیری", group: "فروش" },
  { key: "carts.view", label: "مشاهده سبدهای رهاشده", group: "فروش" },

  // محصول
  { key: "products.view", label: "مشاهده محصولات", group: "محصول و انبار" },
  { key: "products.manage", label: "ویرایش محصولات و قیمت‌ها", group: "محصول و انبار" },
  { key: "inventory.manage", label: "مدیریت موجودی و بچ‌های تولید", group: "محصول و انبار" },
  { key: "costing.manage", label: "تعریف بهای تمام‌شده کالاها", group: "محصول و انبار" },

  // بازاریابی
  { key: "ambassadors.manage", label: "مدیریت سفیران و درخواست‌های همکاری", group: "بازاریابی" },
  { key: "settlements.approve", label: "تأیید و پرداخت تسویه سفیران", group: "بازاریابی" },
  { key: "samplekits.manage", label: "مدیریت کیت‌های سمپل", group: "بازاریابی" },
  { key: "marketing.manage", label: "کدهای تخفیف و کمپین‌ها", group: "بازاریابی" },
  { key: "content.manage", label: "دیدگاه‌ها و پرونده‌های بالینی", group: "بازاریابی" },

  // مالی
  { key: "finance.view", label: "حسابداری، سود و زیان", group: "مالی" },
  { key: "finance.manage", label: "ثبت و ویرایش هزینه‌ها", group: "مالی" },

  // پشتیبانی
  { key: "tickets.manage", label: "پاسخ به تیکت‌های پشتیبانی", group: "پشتیبانی" },
  { key: "livechat.answer", label: "پاسخ به گفت‌وگوی آنلاین سایت", group: "پشتیبانی" },
  { key: "crm.followup", label: "ثبت تماس، رضایت و پیگیری در پرونده مخاطب", group: "پشتیبانی" },
  { key: "consult.manage", label: "مدیریت همه درخواست‌های مشاوره و ارجاع به مشاوران", group: "پشتیبانی" },

  // مدیریت
  { key: "users.view", label: "مشاهده مخاطبان و کاربران", group: "مدیریت سامانه" },
  { key: "users.manage", label: "ویرایش مخاطبان، یادداشت CRM و غیرفعال‌سازی", group: "مدیریت سامانه" },
  { key: "roles.manage", label: "تعریف نقش و تعیین سطح دسترسی", group: "مدیریت سامانه" },
  { key: "settings.manage", label: "تنظیمات فروشگاه و قوانین تجاری", group: "مدیریت سامانه" },
  { key: "notifications.manage", label: "قالب‌ها و قوانین اعلان", group: "مدیریت سامانه" },
  { key: "audit.view", label: "مشاهده لاگ امنیتی", group: "مدیریت سامانه" },
  { key: "modules.manage", label: "مرکز ماژول‌ها: خاموش و روشن کردن ماژول‌ها و ویرایش قوانین", group: "مدیریت سامانه" },
] as const satisfies readonly PermissionDef[];

export type Permission = (typeof PERMISSIONS)[number]["key"];

export const ALL_PERMISSIONS: Permission[] = PERMISSIONS.map((p) => p.key);

export function isPermission(value: string): value is Permission {
  return (ALL_PERMISSIONS as string[]).includes(value);
}

// نقش‌های پیش‌فرض؛ seed آن‌ها را می‌سازد و مدیر ارشد می‌تواند ویرایش کند
export const SUPER_ADMIN_ROLE = "super_admin";
export const CUSTOMER_ROLE = "customer";
export const AMBASSADOR_ROLE = "ambassador";
export const CONSULTANT_ROLE = "consultant";
export const WHOLESALE_ROLE = "wholesale";

export interface DefaultRole {
  key: string;
  name: string;
  description: string;
  isSystem: boolean;
  permissions: Permission[];
}

export const DEFAULT_ROLES: DefaultRole[] = [
  {
    key: SUPER_ADMIN_ROLE,
    name: "مدیر ارشد",
    description: "دسترسی کامل به همه بخش‌ها؛ تنها نقشی که سطح دسترسی دیگران را تعیین می‌کند.",
    isSystem: true,
    permissions: ALL_PERMISSIONS,
  },
  {
    key: "admin",
    name: "مدیر فروشگاه",
    description: "مدیریت روزانه سفارش، محصول، بازاریابی و پشتیبانی؛ بدون دسترسی به نقش‌ها و تنظیمات.",
    isSystem: false,
    permissions: [
      "portal.customer",
      "dashboard.view",
      "chat.use",
      "orders.view",
      "orders.manage",
      "carts.view",
      "products.view",
      "products.manage",
      "inventory.manage",
      "ambassadors.manage",
      "samplekits.manage",
      "marketing.manage",
      "content.manage",
      "tickets.manage",
      "users.view",
      "livechat.answer",
      "crm.followup",
    ],
  },
  {
    key: "accountant",
    name: "حسابدار",
    description: "گزارش‌های مالی، سود و زیان و تأیید تسویه سفیران.",
    isSystem: false,
    permissions: ["portal.customer", "dashboard.view", "chat.use", "orders.view", "finance.view", "finance.manage", "costing.manage", "settlements.approve"],
  },
  {
    key: "warehouse",
    name: "انباردار",
    description: "آماده‌سازی و ارسال سفارش‌ها، موجودی و تاریخ انقضا.",
    isSystem: false,
    permissions: ["portal.customer", "chat.use", "orders.view", "orders.manage", "products.view", "inventory.manage"],
  },
  {
    key: "support",
    name: "پشتیبان",
    description: "پاسخ به تیکت‌ها و پیگیری سفارش مشتریان.",
    isSystem: false,
    permissions: ["portal.customer", "chat.use", "orders.view", "tickets.manage", "users.view", "livechat.answer", "crm.followup"],
  },
  {
    key: AMBASSADOR_ROLE,
    name: "سفیر برند",
    description: "پزشک، مربی یا همکار فروش با لینک معرفی و پورسانت.",
    isSystem: true,
    permissions: ["portal.customer", "portal.ambassador"],
  },
  {
    key: CONSULTANT_ROLE,
    name: "مشاور تغذیه",
    description: "پزشک یا کارشناس تغذیه که به درخواست‌های مشاوره مشتریان پاسخ می‌دهد.",
    isSystem: true,
    permissions: ["portal.customer", "portal.consultant", "chat.use"],
  },
  {
    key: WHOLESALE_ROLE,
    name: "همکار عمده",
    description: "فروشگاه، داروخانه یا باشگاهی که با قیمت پلکانی عمده سفارش می‌دهد.",
    isSystem: true,
    permissions: ["portal.customer", "portal.wholesale"],
  },
  {
    key: CUSTOMER_ROLE,
    name: "مشتری",
    description: "نقش پیش‌فرض هر کاربر پس از ثبت‌نام.",
    isSystem: true,
    permissions: ["portal.customer"],
  },
];
