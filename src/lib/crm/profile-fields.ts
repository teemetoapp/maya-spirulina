// ==============================================================
// Extra profile fields. One list drives the profile form (customers and
// ambassadors fill it themselves), API validation and the «مخاطبان»
// (contacts/CRM) card, so a new field only needs to be added here and
// in prisma/schema.prisma.
// ==============================================================

export const GENDER_LABELS = { MALE: "مرد", FEMALE: "زن", OTHER: "ترجیح می‌دهم نگویم" } as const;

export interface ProfileField {
  key:
    | "province"
    | "city"
    | "occupation"
    | "company"
    | "landline"
    | "mobile2"
    | "whatsapp"
    | "telegramUsername"
    | "instagram"
    | "website"
    | "education"
    | "maritalStatus"
    | "preferredContact"
    | "bestCallTime"
    | "source"
    | "interests"
    | "healthNotes";
  label: string;
  placeholder?: string;
  max: number;
  ltr?: boolean;
  options?: string[];
  wide?: boolean; // تمام عرض فرم
  group: "contact" | "personal" | "health";
}

export const SOURCE_OPTIONS = ["اینستاگرام", "معرفی پزشک یا مربی", "معرفی دوستان", "جستجو در گوگل", "سفیر برند", "داروخانه یا باشگاه", "سایر"];

export const EDUCATION_OPTIONS = ["زیر دیپلم", "دیپلم", "کاردانی", "کارشناسی", "کارشناسی ارشد", "دکتری", "پزشک / دکترای حرفه‌ای"];
export const MARITAL_OPTIONS = ["مجرد", "متأهل", "ترجیح می‌دهم نگویم"];
export const CONTACT_OPTIONS = ["تماس تلفنی", "پیامک", "واتساپ", "تلگرام", "ایمیل"];
export const CALL_TIME_OPTIONS = ["صبح (۹ تا ۱۲)", "ظهر (۱۲ تا ۱۶)", "عصر (۱۶ تا ۲۰)", "شب (۲۰ تا ۲۲)", "فرقی نمی‌کند"];

export const PROFILE_FIELDS: ProfileField[] = [
  { key: "province", label: "استان", max: 40, group: "contact" },
  { key: "city", label: "شهر", max: 40, group: "contact" },
  { key: "landline", label: "تلفن ثابت", placeholder: "021xxxxxxxx", max: 15, ltr: true, group: "contact" },
  { key: "mobile2", label: "موبایل دوم", placeholder: "09xxxxxxxxx", max: 15, ltr: true, group: "contact" },
  { key: "whatsapp", label: "واتساپ", placeholder: "09xxxxxxxxx", max: 15, ltr: true, group: "contact" },
  { key: "telegramUsername", label: "آیدی تلگرام", placeholder: "@username", max: 40, ltr: true, group: "contact" },
  { key: "instagram", label: "اینستاگرام", placeholder: "@username", max: 60, ltr: true, group: "contact" },
  { key: "website", label: "وب‌سایت", placeholder: "https://", max: 120, ltr: true, group: "contact" },
  { key: "preferredContact", label: "راه ارتباطی ترجیحی", max: 20, options: CONTACT_OPTIONS, group: "contact" },
  { key: "bestCallTime", label: "بهترین زمان تماس", max: 30, options: CALL_TIME_OPTIONS, group: "contact" },
  { key: "occupation", label: "شغل یا تخصص", placeholder: "مثلاً پزشک، مربی ورزشی، دانشجو", max: 80, group: "personal" },
  { key: "company", label: "محل کار، مطب یا باشگاه", max: 120, group: "personal" },
  { key: "education", label: "تحصیلات", max: 40, options: EDUCATION_OPTIONS, group: "personal" },
  { key: "maritalStatus", label: "وضعیت تأهل", max: 30, options: MARITAL_OPTIONS, group: "personal" },
  { key: "source", label: "نحوه آشنایی با مایا", max: 60, options: SOURCE_OPTIONS, group: "personal" },
  { key: "interests", label: "هدف از مصرف یا علاقه‌مندی", placeholder: "مثلاً ورزش، رژیم، کم‌خونی", max: 200, wide: true, group: "health" },
  {
    key: "healthNotes",
    label: "شرایط سلامت، حساسیت یا داروی مصرفی (برای مشاوره)",
    placeholder: "مثلاً بارداری، فشار خون، داروی رقیق‌کننده خون",
    max: 500,
    wide: true,
    group: "health",
  },
];

export const PROFILE_GROUPS = { contact: "راه‌های ارتباط", personal: "اطلاعات فردی", health: "هدف و سلامت" } as const;

// درصد تکمیل پروفایل برای کارت مخاطب
export function profileCompleteness(u: Record<string, unknown>): number {
  const keys = ["name", "email", "nationalCode", "birthDate", "gender", ...PROFILE_FIELDS.map((f) => f.key)];
  const filled = keys.filter((k) => {
    const v = u[k];
    return typeof v === "string" ? v.trim() !== "" : v != null;
  }).length;
  return Math.round((filled / keys.length) * 100);
}
