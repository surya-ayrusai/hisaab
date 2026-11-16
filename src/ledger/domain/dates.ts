/**
 * Entry dates are calendar dates ("YYYY-MM-DD") with no time zone.
 * The effective "today" can be overridden with ?today=YYYY-MM-DD and is
 * resolved in one place so every feature agrees.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const m = ISO_DATE.exec(value);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (y < 1900 || y > 2200 || mo < 1 || mo > 12 || d < 1) return false;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

/** Local calendar date of the device as YYYY-MM-DD. */
export function deviceToday(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export interface EffectiveDate {
  today: string;
  overridden: boolean;
}

/** Reads ?today= from a query string. Absent or invalid values fall back to the device date. */
export function resolveEffectiveDate(search: string, now: Date = new Date()): EffectiveDate {
  let candidate: string | null = null;
  try {
    candidate = new URLSearchParams(search).get("today");
  } catch {
    candidate = null;
  }
  if (candidate && isValidIsoDate(candidate)) return { today: candidate, overridden: true };
  return { today: deviceToday(now), overridden: false };
}

/** Whole days from `from` to `to` (to - from). Both must be valid ISO dates. */
export function daysBetween(from: string, to: string): number {
  const a = Date.UTC(Number(from.slice(0, 4)), Number(from.slice(5, 7)) - 1, Number(from.slice(8, 10)));
  const b = Date.UTC(Number(to.slice(0, 4)), Number(to.slice(5, 7)) - 1, Number(to.slice(8, 10)));
  return Math.round((b - a) / 86_400_000);
}
