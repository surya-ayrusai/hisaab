/**
 * Indian mobile numbers are stored as exactly 10 digits starting 6-9.
 * The country code is added only when a WhatsApp link is built.
 */

const INDIAN_MOBILE = /^[6-9]\d{9}$/;

/** Returns the normalised 10-digit number, or null if it is not a valid Indian mobile number. */
export function normalizePhone(raw: unknown): string | null {
  if (typeof raw !== "string" && typeof raw !== "number") return null;
  const text = String(raw).trim();
  if (!/^\+?[\d\s\-().]+$/.test(text)) return null;
  let digits = text.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return INDIAN_MOBILE.test(digits) ? digits : null;
}

export function isValidPhone(phone: string): boolean {
  return INDIAN_MOBILE.test(phone);
}
