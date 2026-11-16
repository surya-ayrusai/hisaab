/**
 * The single source of truth for every ledger figure.
 * balance = active credits - active payments; cancelled entries never count.
 * shop total = sum of balances that are greater than zero.
 */

export type EntryType = "credit" | "payment";
export type EntryStatus = "active" | "cancelled";

export interface LedgerEntryLike {
  customerId: string;
  type: EntryType;
  amountPaise: number;
  date: string;
  status: EntryStatus;
  createdAt?: string;
}

export function signedAmount(entry: LedgerEntryLike): number {
  if (entry.status !== "active") return 0;
  return entry.type === "credit" ? entry.amountPaise : -entry.amountPaise;
}

export function customerBalance(entries: readonly LedgerEntryLike[]): number {
  let sum = 0;
  for (const e of entries) sum += signedAmount(e);
  return sum;
}

/** Balance per customer id. Customers with no entries are included with 0 when ids are supplied. */
export function balancesByCustomer(
  entries: readonly LedgerEntryLike[],
  customerIds: readonly string[] = [],
): Map<string, number> {
  const out = new Map<string, number>();
  for (const id of customerIds) out.set(id, 0);
  for (const e of entries) out.set(e.customerId, (out.get(e.customerId) ?? 0) + signedAmount(e));
  return out;
}

/** An advance (negative balance) never offsets another customer's dues. */
export function totalOutstanding(balances: Iterable<number>): number {
  let sum = 0;
  for (const b of balances) if (b > 0) sum += b;
  return sum;
}

export function countWithDues(balances: Iterable<number>): number {
  let n = 0;
  for (const b of balances) if (b > 0) n += 1;
  return n;
}

/** Newest first: by entry date, then by creation time. */
export function compareNewestFirst(
  a: { date: string; createdAt?: string },
  b: { date: string; createdAt?: string },
): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1;
  const ac = a.createdAt ?? "";
  const bc = b.createdAt ?? "";
  if (ac !== bc) return ac < bc ? 1 : -1;
  return 0;
}
