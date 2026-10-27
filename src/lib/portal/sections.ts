// ==============================================================
// Portal sections — one registry for the sidebar, the portal switcher
// in the top bar, routing and permission checks. Every portal page
// lives at /portal/[id].
//
// The portal is split into three areas (portals). The top bar shows a
// switch for each area the user can open; the sidebar lists only the
// sections of the current area:
//   admin       — organisation management (staff, by permission)
//   control     — organisation control centre (super admin): modules,
//                 roles, settings, audit
//   consultant  — nutrition consultants answer consultation requests
//   ambassador  — the ambassador's own workspace
//   account     — the customer's own account (orders they bought, wallet…)
//
// A section that belongs to a module (src/lib/modules/registry.ts) also
// needs the token module:<key>, which getAccess() adds while the module is on.
// ==============================================================

import type { Permission } from "@/lib/rbac/permissions";
import { moduleForSection, moduleToken } from "@/lib/modules/registry";

export type PortalArea = "admin" | "control" | "consultant" | "ambassador" | "wholesale" | "account";

export interface PortalSection {
  id: string;
  label: string;
  group: string;
  area: PortalArea;
  // کاربر باید حداقل یکی از این مجوزها را داشته باشد
  anyOf: Permission[];
  // در صورت داشتن این مجوز، بخش پنهان می‌شود (مثلاً «سفیر شوید» برای سفیران)
  hideIf?: Permission;
}

export const PORTAL_AREAS: { id: PortalArea; label: string; landing: string[] }[] = [
  { id: "admin", label: "پنل مدیریت", landing: ["overview"] },
  { id: "control", label: "مرکز کنترل", landing: ["modules"] },
  { id: "consultant", label: "پرتال مشاور", landing: ["consultations"] },
  { id: "ambassador", label: "پرتال سفیر", landing: ["ambassador"] },
  { id: "wholesale", label: "پنل عمده", landing: ["wholesale"] },
  { id: "account", label: "حساب من", landing: ["home"] },
];

export const PORTAL_GROUPS = [
  "حساب من",
  "سفیر برند",
  "همکار عمده",
  "مشاوره",
  "عمومی",
  "فروش",
  "محصول",
  "بازاریابی",
  "مالی",
  "ارتباط با مشتری",
  "پشتیبانی",
  "مدیریت",
  "مرکز کنترل سازمان",
] as const;

const CUSTOMER: Pick<PortalSection, "anyOf" | "area" | "group"> = { anyOf: ["portal.customer"], area: "account", group: "حساب من" };
const AMBASSADOR: Pick<PortalSection, "anyOf" | "area" | "group"> = { anyOf: ["portal.ambassador"], area: "ambassador", group: "سفیر برند" };

export const PORTAL_SECTIONS: PortalSection[] = [
  // حساب من (خریدهای خود کاربر)
  { id: "home", label: "داشبورد", ...CUSTOMER },
  { id: "my-orders", label: "سفارش‌های من", ...CUSTOMER },
  { id: "wallet", label: "کیف پول و امتیاز", ...CUSTOMER },
  { id: "addresses", label: "آدرس‌ها", ...CUSTOMER },
  { id: "my-consultations", label: "مشاوره تغذیه", ...CUSTOMER },
  { id: "my-tickets", label: "تیکت", ...CUSTOMER },
  { id: "profile", label: "پروفایل", ...CUSTOMER },
  { id: "become-ambassador", label: "سفیر برند شوید", ...CUSTOMER, hideIf: "portal.ambassador" },

  // پرتال سفیر
  { id: "ambassador", label: "داشبورد", ...AMBASSADOR },
  { id: "ambassador-links", label: "لینک و QR", ...AMBASSADOR },
  { id: "ambassador-referrals", label: "زیرمجموعه‌ها", ...AMBASSADOR },
  { id: "ambassador-settlements", label: "پورسانت و تسویه", ...AMBASSADOR },
  { id: "ambassador-samples", label: "کیت سمپل", ...AMBASSADOR },
  { id: "ambassador-tickets", label: "تیکت", ...AMBASSADOR },
  { id: "ambassador-profile", label: "پروفایل", ...AMBASSADOR },

  // پنل همکار عمده
  { id: "wholesale", label: "سفارش عمده", group: "همکار عمده", area: "wholesale", anyOf: ["portal.wholesale"] },

  // پرتال مشاور
  { id: "consultations", label: "درخواست‌های مشاوره", group: "مشاوره", area: "consultant", anyOf: ["portal.consultant", "consult.manage"] },
  { id: "consult-livechat", label: "گفت‌وگوی آنلاین مشاوره", group: "مشاوره", area: "consultant", anyOf: ["portal.consultant"] },

  // پنل مدیریت سازمان
  { id: "overview", label: "داشبورد مدیریتی", group: "عمومی", area: "admin", anyOf: ["dashboard.view"] },
  { id: "messages", label: "پیام‌ها و هماهنگی", group: "عمومی", area: "admin", anyOf: ["chat.use"] },

  { id: "orders", label: "همه سفارش‌ها", group: "فروش", area: "admin", anyOf: ["orders.view"] },
  { id: "abandoned", label: "سبدهای رهاشده", group: "فروش", area: "admin", anyOf: ["carts.view"] },
  { id: "refills", label: "تمدیدهای پیش رو", group: "فروش", area: "admin", anyOf: ["orders.view"] },
  { id: "sales-report", label: "منبع فروش و قیف", group: "فروش", area: "admin", anyOf: ["dashboard.view"] },

  { id: "catalog", label: "محصولات و انبار", group: "محصول", area: "admin", anyOf: ["products.view", "inventory.manage"] },
  { id: "costing", label: "بهای تمام‌شده", group: "محصول", area: "admin", anyOf: ["costing.manage", "finance.view"] },

  { id: "ambassadors", label: "سفیران و تسویه", group: "بازاریابی", area: "admin", anyOf: ["ambassadors.manage", "settlements.approve"] },
  { id: "samplekits", label: "کیت سمپل", group: "بازاریابی", area: "admin", anyOf: ["samplekits.manage"] },
  { id: "promotions", label: "کوپن و کمپین", group: "بازاریابی", area: "admin", anyOf: ["marketing.manage"] },
  { id: "campaigns", label: "کمپین پیامکی", group: "بازاریابی", area: "admin", anyOf: ["marketing.manage"] },
  { id: "reviews", label: "نظرات و رضایت خریداران", group: "ارتباط با مشتری", area: "admin", anyOf: ["content.manage", "tickets.manage"] },
  { id: "articles", label: "بلاگ و محتوای آموزشی", group: "بازاریابی", area: "admin", anyOf: ["content.manage"] },
  { id: "content", label: "پرونده‌های بالینی", group: "بازاریابی", area: "admin", anyOf: ["content.manage"] },

  { id: "finance", label: "حسابداری و سود", group: "مالی", area: "admin", anyOf: ["finance.view"] },

  { id: "livechat", label: "گفت‌وگوی آنلاین", group: "پشتیبانی", area: "admin", anyOf: ["livechat.answer"] },
  { id: "tickets", label: "تیکت‌ها", group: "پشتیبانی", area: "admin", anyOf: ["tickets.manage"] },

  { id: "contacts", label: "مخاطبان", group: "ارتباط با مشتری", area: "admin", anyOf: ["users.view"] },
  { id: "followups", label: "پیگیری‌ها", group: "ارتباط با مشتری", area: "admin", anyOf: ["crm.followup"] },

  // مرکز کنترل سازمان
  { id: "modules", label: "ماژول‌ها و قوانین", group: "مرکز کنترل سازمان", area: "control", anyOf: ["modules.manage"] },
  { id: "users", label: "نقش‌ها و دسترسی‌ها", group: "مرکز کنترل سازمان", area: "control", anyOf: ["roles.manage", "users.view"] },
  { id: "settings", label: "تنظیمات و اعلان‌ها", group: "مرکز کنترل سازمان", area: "control", anyOf: ["settings.manage", "notifications.manage"] },
  { id: "health", label: "سلامت سرویس‌ها", group: "مرکز کنترل سازمان", area: "control", anyOf: ["settings.manage", "audit.view"] },
  { id: "audit", label: "لاگ امنیتی", group: "مرکز کنترل سازمان", area: "control", anyOf: ["audit.view"] },
];

// permissions: مجوزها به‌همراه module:<key> ماژول‌های روشن (Access.tokens)
export function canAccessSection(section: PortalSection, permissions: readonly string[]): boolean {
  if (section.hideIf && permissions.includes(section.hideIf)) return false;
  const mod = moduleForSection(section.id);
  if (mod && !permissions.includes(moduleToken(mod.key))) return false;
  return section.anyOf.some((p) => permissions.includes(p));
}

export function getSection(id: string): PortalSection | undefined {
  return PORTAL_SECTIONS.find((s) => s.id === id);
}

export function getAllowedSections(permissions: readonly string[]): PortalSection[] {
  return PORTAL_SECTIONS.filter((s) => canAccessSection(s, permissions));
}

// پرتال‌هایی که کاربر به آن‌ها دسترسی دارد، با صفحه شروع هر کدام
export function getAllowedAreas(permissions: readonly string[]): { id: PortalArea; label: string; href: string }[] {
  const allowed = getAllowedSections(permissions);
  return PORTAL_AREAS.flatMap((area) => {
    const inArea = allowed.filter((s) => s.area === area.id);
    if (inArea.length === 0) return [];
    const landing = area.landing.find((id) => inArea.some((s) => s.id === id)) ?? inArea[0].id;
    return [{ id: area.id, label: area.label, href: `/portal/${landing}` }];
  });
}

// صفحه شروع: پنل مدیریت برای کارکنان، پرتال سفیر برای سفیران، حساب من برای مشتریان
export function getLandingSection(permissions: readonly string[]): string {
  return getAllowedAreas(permissions)[0]?.href.replace("/portal/", "") ?? "home";
}
