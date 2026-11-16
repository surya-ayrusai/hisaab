/**
 * "How old are the dues": payments are counted against the oldest credit first.
 * Each unpaid credit portion is aged from its own date to the effective today.
 * The band totals always add up to the shop total outstanding.
 */

import { daysBetween } from "@/platform/dates";
import type { LedgerEntryLike } from "./balance";

export const AGE_BANDS = ["0-7", "8-15", "16-30", "31-60", "60+"] as const;
export type AgeBand = (typeof AGE_BANDS)[number];

export function bandForDays(days: number): AgeBand {
  if (days <= 7) return "0-7";
  if (days <= 15) return "8-15";
  if (days <= 30) return "16-30";
  if (days <= 60) return "31-60";
  return "60+";
}

export type AgeingSummary = Record<AgeBand, number>;

export function emptyAgeing(): AgeingSummary {
  return { "0-7": 0, "8-15": 0, "16-30": 0, "31-60": 0, "60+": 0 };
}

export interface OpenCredit {
  customerId: string;
  date: string;
  remainingPaise: number;
  ageDays: number;
  createdAt?: string;
}

/** Two entries on the same day keep the order they were written in. */
function oldestFirst(a: { date: string; createdAt?: string }, b: { date: string; createdAt?: string }): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  const ac = a.createdAt ?? "";
  const bc = b.createdAt ?? "";
  return ac < bc ? -1 : ac > bc ? 1 : 0;
}

/**
 * Age in days for an entry date, cached. A large book holds tens of thousands
 * of entries but only a few hundred distinct dates, and parsing a date is the
 * expensive part, so this turns the dominant cost into a map lookup.
 */
function ageCache(today: string): (date: string) => number {
  const seen = new Map<string, number>();
  return (date) => {
    const hit = seen.get(date);
    if (hit !== undefined) return hit;
    const days = Math.max(0, daysBetween(date, today));
    seen.set(date, days);
    return days;
  };
}

function openCredits(entries: readonly LedgerEntryLike[], ageOf: (d: string) => number): OpenCredit[] {
  const credits: OpenCredit[] = [];
  let toAllocate = 0;
  for (const e of entries) {
    if (e.status !== "active") continue;
    if (e.type === "payment") toAllocate += e.amountPaise;
    else
      credits.push({
        customerId: e.customerId,
        date: e.date,
        remainingPaise: e.amountPaise,
        ageDays: 0,
        createdAt: e.createdAt,
      });
  }
  credits.sort(oldestFirst);
  const open: OpenCredit[] = [];
  for (const c of credits) {
    if (toAllocate > 0) {
      const used = Math.min(c.remainingPaise, toAllocate);
      c.remainingPaise -= used;
      toAllocate -= used;
    }
    if (c.remainingPaise > 0) {
      c.ageDays = ageOf(c.date);
      open.push(c);
    }
  }
  return open;
}

/** Unpaid credit portions for one customer after applying all payments oldest-first. */
export function openCreditsForCustomer(entries: readonly LedgerEntryLike[], today: string): OpenCredit[] {
  return openCredits(entries, ageCache(today));
}

/**
 * Every customer's open credits in one pass over the book. Callers that need
 * both the band totals and the per-customer list should use this rather than
 * calling `ageingSummary` and `openCreditsForCustomer` separately, which would
 * do the same grouping and allocation twice.
 */
export function openCreditsByCustomer(entries: readonly LedgerEntryLike[], today: string): Map<string, OpenCredit[]> {
  const byCustomer = new Map<string, LedgerEntryLike[]>();
  for (const e of entries) {
    const list = byCustomer.get(e.customerId);
    if (list) list.push(e);
    else byCustomer.set(e.customerId, [e]);
  }
  const ageOf = ageCache(today);
  const result = new Map<string, OpenCredit[]>();
  for (const [customerId, list] of byCustomer) result.set(customerId, openCredits(list, ageOf));
  return result;
}

/** Band totals from an already-computed set of open credits. */
export function summariseOpenCredits(byCustomer: Map<string, OpenCredit[]>): AgeingSummary {
  const summary = emptyAgeing();
  for (const open of byCustomer.values()) {
    for (const credit of open) summary[bandForDays(credit.ageDays)] += credit.remainingPaise;
  }
  return summary;
}

/** Shop-wide dues by age band. */
export function ageingSummary(entries: readonly LedgerEntryLike[], today: string): AgeingSummary {
  return summariseOpenCredits(openCreditsByCustomer(entries, today));
}
