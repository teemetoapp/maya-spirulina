import { toPersianDigits } from "./currency";

// ==============================================================
// Zero-Dependency Pure Jalali (Shamsi) Date Converter & Formatter
// ==============================================================

const PERSIAN_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

const PERSIAN_DAYS = [
  "یکشنبه",
  "دوشنبه",
  "سه‌شنبه",
  "چهارشنبه",
  "پنجشنبه",
  "جمعه",
  "شنبه",
];

interface JalaliDate {
  jy: number;
  jm: number;
  jd: number;
}

/**
 * Gregorian to Jalali conversion algorithm
 */
export function gregorianToJalali(gy: number, gm: number, gd: number): JalaliDate {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy =
    gy <= 1600
      ? 0
      : 979;
  gy -= gy <= 1600 ? 621 : 1600;
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) -
    80 +
    gd +
    g_d_m[gm - 1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  jy += Math.floor((days - 1) / 365);
  if (days > 0) days = (days - 1) % 365;
  const jm =
    days < 186
      ? 1 + Math.floor(days / 31)
      : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return { jy, jm, jd };
}

/**
 * Jalali to Gregorian conversion (inverse of gregorianToJalali)
 */
export function jalaliToGregorian(jy: number, jm: number, jd: number): { gy: number; gm: number; gd: number } {
  jy += 1595;
  let days =
    -355668 +
    365 * jy +
    Math.floor(jy / 33) * 8 +
    Math.floor(((jy % 33) + 3) / 4) +
    jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  let gy = 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const leap = (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;
  const monthDays = [0, 31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  for (gm = 0; gm < 13 && gd > monthDays[gm]; gm++) gd -= monthDays[gm];
  return { gy, gm, gd };
}

/**
 * Parses "1405/08/04" (Persian or Latin digits) to a Date at local noon; null if invalid.
 */
export function parseJalaliDate(value: string): Date | null {
  const latin = value.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
  const m = /^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/.exec(latin.trim());
  if (!m) return null;
  const [jy, jm, jd] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (jm < 1 || jm > 12 || jd < 1 || jd > (jm <= 6 ? 31 : 30)) return null;
  const { gy, gm, gd } = jalaliToGregorian(jy, jm, jd);
  const date = new Date(gy, gm - 1, gd, 12);
  const back = toJalali(date);
  return back.jy === jy && back.jm === jm && back.jd === jd ? date : null;
}

/**
 * Converts a JS Date or UTC string to Jalali Date components
 */
export function toJalali(date: Date | string | number): JalaliDate {
  const d = new Date(date);
  return gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/**
 * Formats date as: "۱۴۰۳/۰۸/۰۱"
 */
export function formatJalaliShort(date: Date | string | number): string {
  const { jy, jm, jd } = toJalali(date);
  const m = jm < 10 ? `0${jm}` : `${jm}`;
  const d = jd < 10 ? `0${jd}` : `${jd}`;
  return toPersianDigits(`${jy}/${m}/${d}`);
}

/**
 * Formats date as: "۲۱ مهر ۱۴۰۵"
 */
export function formatJalaliLong(date: Date | string | number): string {
  const { jy, jm, jd } = toJalali(date);
  return `${toPersianDigits(jd)} ${PERSIAN_MONTHS[jm - 1]} ${toPersianDigits(jy)}`;
}

/**
 * Formats date with time: "۲۱ مهر ۱۴۰۵ - ساعت ۱۴:۳۰"
 */
export function formatJalaliDateTime(date: Date | string | number): string {
  const d = new Date(date);
  const dateStr = formatJalaliLong(d);
  const hours = d.getHours().toString().padStart(2, "0");
  const minutes = d.getMinutes().toString().padStart(2, "0");
  return `${dateStr} - ساعت ${toPersianDigits(`${hours}:${minutes}`)}`;
}
