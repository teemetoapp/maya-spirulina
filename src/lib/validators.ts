import { toEnglishDigits } from "./currency";

// ==============================================================
// Iranian Identifiers & Form Validators
// ==============================================================

/**
 * Validates an Iranian mobile phone number.
 * Must start with 09 and contain 11 digits (e.g. 09121234567).
 */
export function isValidIranianMobile(phone: string): boolean {
  if (!phone) return false;
  const normalized = toEnglishDigits(phone.trim().replace(/[\s-+]/g, ""));
  
  // Handles +989... or 00989... normalization
  let formatted = normalized;
  if (formatted.startsWith("+98")) formatted = "0" + formatted.slice(3);
  else if (formatted.startsWith("0098")) formatted = "0" + formatted.slice(4);
  else if (formatted.startsWith("98") && formatted.length === 12) formatted = "0" + formatted.slice(2);
  else if (!formatted.startsWith("0") && formatted.length === 10) formatted = "0" + formatted;

  const regex = /^09\d{9}$/;
  return regex.test(formatted);
}

/**
 * Normalizes an Iranian mobile phone to standard 09xxxxxxxxx format.
 */
export function normalizeIranianMobile(phone: string): string {
  const normalized = toEnglishDigits(phone.trim().replace(/[\s-+]/g, ""));
  if (normalized.startsWith("+98")) return "0" + normalized.slice(3);
  if (normalized.startsWith("0098")) return "0" + normalized.slice(4);
  if (normalized.startsWith("98") && normalized.length === 12) return "0" + normalized.slice(2);
  if (!normalized.startsWith("0") && normalized.length === 10) return "0" + normalized;
  return normalized;
}

/**
 * Validates an Iranian National Identity Code (کد ملی).
 * Uses the official 10-digit modulo 11 algorithm.
 */
export function isValidIranianNationalCode(code: string): boolean {
  if (!code) return false;
  const clean = toEnglishDigits(code.trim());

  if (!/^\d{10}$/.test(clean)) return false;

  // Reject repeating patterns like 0000000000, 1111111111, etc.
  const allEqual = clean.split("").every((c) => c === clean[0]);
  if (allEqual) return false;

  const check = parseInt(clean[9], 10);
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean[i], 10) * (10 - i);
  }
  const remainder = sum % 11;

  if (remainder < 2) {
    return check === remainder;
  } else {
    return check === 11 - remainder;
  }
}

/**
 * Validates an Iranian Sheba (IBAN) number.
 * Standard format: IR + 24 digits (Total 26 chars).
 * Validated using the ISO 7064 Mod 97-10 algorithm.
 */
export function isValidIranianSheba(sheba: string): boolean {
  if (!sheba) return false;
  let clean = toEnglishDigits(sheba.trim().toUpperCase().replace(/\s/g, ""));

  if (!clean.startsWith("IR")) {
    if (clean.length === 24 && /^\d{24}$/.test(clean)) {
      clean = "IR" + clean;
    } else {
      return false;
    }
  }

  if (clean.length !== 26) return false;

  // Move first 4 characters to end: IRxx -> end
  const rearranged = clean.slice(4) + clean.slice(0, 4);

  // Replace letters with numbers: I=18, R=27
  const numericString = rearranged
    .replace(/I/g, "18")
    .replace(/R/g, "27");

  // BigInt modulo 97 check
  try {
    const remainder = BigInt(numericString) % BigInt(97);
    return remainder === BigInt(1);
  } catch {
    return false;
  }
}

/**
 * Formats Sheba with standard 4-digit grouping for display: IRxx xxxx xxxx xxxx xxxx xxxx xx
 */
export function formatShebaForDisplay(sheba: string): string {
  if (!sheba) return "";
  let clean = toEnglishDigits(sheba.trim().toUpperCase().replace(/\s/g, ""));
  if (!clean.startsWith("IR") && clean.length === 24) clean = "IR" + clean;
  return clean.replace(/(.{4})/g, "$1 ").trim();
}

/**
 * Validates a 10-digit Iranian Postal Code (کد پستی).
 */
export function isValidIranianPostalCode(code: string): boolean {
  if (!code) return false;
  const clean = toEnglishDigits(code.trim().replace(/\D/g, ""));
  return /^\d{10}$/.test(clean) && !/^(\d)\1{9}$/.test(clean);
}
export function detectBankFromSheba(sheba: string): string {
  const clean = sheba.toUpperCase().replace(/\s/g, "");
  // Sheba format: IR + 2 check digits + 3 bank digits
  const code = clean.startsWith("IR") ? clean.slice(4, 7) : clean.slice(2, 5);
  const bankMap: Record<string, string> = {
    "012": "بانک ملت",
    "017": "بانک ملی ایران",
    "018": "بانک تجارت",
    "019": "بانک صادرات ایران",
    "054": "بانک پارسیان",
    "056": "بانک سامان",
    "057": "بانک پاسارگاد",
    "061": "بانک شهر",
    "021": "پست بانک ایران",
    "062": "بانک آینده",
    "078": "بانک خاورمیانه",
    "055": "بانک اقتصاد نوین",
    "013": "بانک رفاه کارگران",
    "014": "بانک مسکن",
    "015": "بانک سپه",
    "016": "بانک کشاورزی",
    "051": "موسسه اعتباری ملل",
  };
  return bankMap[code] || "بانک عضو شتاب";
}

