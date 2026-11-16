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

export interface OpenCredit {
  customerId: string;
  date: string;
  remainingPaise: number;
  ageDays: number;
}

function oldestFirst(a: LedgerEntryLike, b: LedgerEntryLike): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  const ac = a.createdAt ?? "";
  const bc = b.createdAt ?? "";
  return ac < bc ? -1 : ac > bc ? 1 : 0;
}

/** Unpaid credit portions for one customer after applying all payments oldest-first. */
export function openCreditsForCustomer(entries: readonly LedgerEntryLike[], today: string): OpenCredit[] {
  const active = entries.filter((e) => e.status === "active");
  const credits = active
    .filter((e) => e.type === "credit")
    .sort(oldestFirst)
    .map((e) => ({ customerId: e.customerId, date: e.date, remainingPaise: e.amountPaise }));
  let toAllocate = 0;
  for (const e of active) if (e.type === "payment") toAllocate += e.amountPaise;
  for (const c of credits) {
    if (toAllocate <= 0) break;
    const used = Math.min(c.remainingPaise, toAllocate);
    c.remainingPaise -= used;
    toAllocate -= used;
  }
  return credits
    .filter((c) => c.remainingPaise > 0)
    .map((c) => ({ ...c, ageDays: Math.max(0, daysBetween(c.date, today)) }));
}

export type AgeingSummary = Record<AgeBand, number>;

export function emptyAgeing(): AgeingSummary {
  return { "0-7": 0, "8-15": 0, "16-30": 0, "31-60": 0, "60+": 0 };
}

/** Shop-wide dues by age band. */
export function ageingSummary(entries: readonly LedgerEntryLike[], today: string): AgeingSummary {
  const byCustomer = new Map<string, LedgerEntryLike[]>();
  for (const e of entries) {
    const list = byCustomer.get(e.customerId);
    if (list) list.push(e);
    else byCustomer.set(e.customerId, [e]);
  }
  const summary = emptyAgeing();
  for (const list of byCustomer.values()) {
    for (const open of openCreditsForCustomer(list, today)) {
      summary[bandForDays(open.ageDays)] += open.remainingPaise;
    }
  }
  return summary;
}
