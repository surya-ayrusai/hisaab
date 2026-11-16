/**
 * Money is stored as integer paise. Rupee text is parsed without
 * floating-point multiplication so sums are always exact.
 */

const RUPEE_PATTERN = /^(\d{1,12})(?:\.(\d{1,2}))?$/;

/** Parse a rupee amount ("250", "250.5", 250) into paise. Returns null if invalid or not positive. */
export function parseRupeesToPaise(input: unknown): number | null {
  let text: string;
  if (typeof input === "number") {
    if (!Number.isFinite(input)) return null;
    text = String(input);
  } else if (typeof input === "string") {
    text = input.trim().replace(/,/g, "");
  } else {
    return null;
  }
  const match = RUPEE_PATTERN.exec(text);
  if (!match) return null;
  const rupees = Number(match[1]);
  const fraction = (match[2] ?? "").padEnd(2, "0");
  const paise = rupees * 100 + Number(fraction || "0");
  if (!Number.isSafeInteger(paise) || paise <= 0) return null;
  return paise;
}

/** Plain rupee number for machine-readable places: 67000 -> "670", 67050 -> "670.50", -20000 -> "-200". */
export function formatPlainRupees(paise: number): string {
  const sign = paise < 0 ? "-" : "";
  const abs = Math.abs(paise);
  const rupees = Math.trunc(abs / 100);
  const rest = abs % 100;
  return rest === 0 ? `${sign}${rupees}` : `${sign}${rupees}.${String(rest).padStart(2, "0")}`;
}

/** Indian digit grouping: 1182000 -> "11,820", 9999999950 -> "9,99,99,999.50". */
export function formatIndianRupees(paise: number): string {
  const sign = paise < 0 ? "-" : "";
  const abs = Math.abs(paise);
  const digits = String(Math.trunc(abs / 100));
  const rest = abs % 100;
  let grouped: string;
  if (digits.length <= 3) {
    grouped = digits;
  } else {
    const last3 = digits.slice(-3);
    const head = digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
    grouped = `${head},${last3}`;
  }
  return rest === 0 ? `${sign}${grouped}` : `${sign}${grouped}.${String(rest).padStart(2, "0")}`;
}
