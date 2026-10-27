// ==============================================================
// Iranian Currency & Number Formatting Utilities
// ==============================================================

const PERSIAN_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
const ENGLISH_DIGITS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

/**
 * Converts English or Arabic digits in a string to standard Persian digits.
 */
export function toPersianDigits(input: string | number): string {
  if (input === null || input === undefined) return "";
  const str = String(input);
  return str.replace(/[0-9]/g, (w) => PERSIAN_DIGITS[+w]);
}

/**
 * Converts Persian digits to English digits for database/API processing.
 */
export function toEnglishDigits(input: string): string {
  if (!input) return "";
  let result = input;
  for (let i = 0; i < 10; i++) {
    result = result.replace(new RegExp(PERSIAN_DIGITS[i], "g"), ENGLISH_DIGITS[i]);
  }
  return result;
}

/**
 * Formats a number with Persian thousand separators (e.g. ۱۲۵,۰۰۰ تومان).
 */
export function formatToman(amount: number, withSuffix: boolean = true): string {
  if (isNaN(amount) || amount === null) return withSuffix ? "۰ تومان" : "۰";
  const formatted = new Intl.NumberFormat("fa-IR").format(amount);
  return withSuffix ? `${formatted} تومان` : formatted;
}

/**
 * Formats an amount in Rial.
 */
export function formatRial(amountInToman: number): string {
  const amountInRial = amountInToman * 10;
  return `${new Intl.NumberFormat("fa-IR").format(amountInRial)} ریال`;
}

/**
 * Calculates discount percentage.
 */
export function calculateDiscountPercent(originalPrice: number, discountedPrice: number): number {
  if (!originalPrice || originalPrice <= discountedPrice) return 0;
  return Math.round(((originalPrice - discountedPrice) / originalPrice) * 100);
}
