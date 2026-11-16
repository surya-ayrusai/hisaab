/**
 * Import planning. Parses and validates a whole pasted payload and works out
 * what would change, without writing anything. Accepts:
 *  - the legacy format (no version): { shop, customers[{name, phone}], entries[{phone, type, amount, date, note}] }
 *  - Hisaab format version 1 (a superset of the legacy format).
 * Imported text is treated as untrusted data: only known fields are copied.
 */

import { isValidIsoDate } from "./dates";
import { parseRupeesToPaise } from "./money";
import { normalizePhone } from "./phone";
import type { EntryStatus, EntryType } from "./balance";

export const SUPPORTED_VERSION = 1;
export const MAX_IMPORT_CHARS = 10_000_000;
export const MAX_CUSTOMERS = 5_000;
export const MAX_ENTRIES = 100_000;
export const MAX_NAME = 60;
export const MAX_NOTE = 80;

export interface ExistingCustomer {
  phone: string;
}

export interface ExistingEntry {
  id?: string;
  phone: string;
  type: EntryType;
  amountPaise: number;
  date: string;
  note: string;
}

export interface PlannedCustomer {
  phone: string;
  name: string;
  notes: string;
  createdAt?: string;
}

export interface PlannedEntry {
  id?: string;
  phone: string;
  type: EntryType;
  kind: "normal" | "opening";
  amountPaise: number;
  date: string;
  note: string;
  status: EntryStatus;
  createdAt?: string;
  importKey: string;
}

export interface Rejection {
  list: "customers" | "entries";
  row: number; // 1-based position in the pasted list
  reason: string;
}

export interface ImportPlan {
  ok: true;
  format: "legacy" | "hisaab-v1";
  shopName: string | null;
  customersToCreate: PlannedCustomer[];
  customersMatched: number;
  entriesToAdd: PlannedEntry[];
  entriesSkipped: number;
  rejected: Rejection[];
  warnings: string[];
}

export interface ImportFailure {
  ok: false;
  error: string;
}

export function entryFingerprint(e: {
  phone: string;
  type: EntryType;
  amountPaise: number;
  date: string;
  note: string;
}): string {
  return [e.phone, e.type, e.amountPaise, e.date, e.note].join("|");
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanText(value: unknown, max: number): { text: string; trimmed: boolean } {
  const raw = typeof value === "string" ? value.trim() : "";
  return raw.length > max ? { text: raw.slice(0, max), trimmed: true } : { text: raw, trimmed: false };
}

function optionalTimestamp(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const t = Date.parse(value);
  return Number.isNaN(t) ? undefined : new Date(t).toISOString();
}

export function planImport(
  text: string,
  existing: { customers: readonly ExistingCustomer[]; entries: readonly ExistingEntry[] } = {
    customers: [],
    entries: [],
  },
): ImportPlan | ImportFailure {
  if (typeof text !== "string" || text.trim() === "") {
    return { ok: false, error: "Nothing to import. Paste the JSON text first." };
  }
  if (text.length > MAX_IMPORT_CHARS) {
    return { ok: false, error: "This text is too large to import." };
  }

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "This is not valid JSON. Check that the whole text was pasted." };
  }
  if (!isPlainObject(data)) {
    return { ok: false, error: "The JSON must be an object with customers and entries." };
  }

  const hasFormat = Object.prototype.hasOwnProperty.call(data, "format");
  const hasVersion = Object.prototype.hasOwnProperty.call(data, "version");
  if (hasFormat && data.format !== "hisaab-ledger") {
    return { ok: false, error: "This file was made by a different app and cannot be imported." };
  }
  if (hasVersion && (typeof data.version !== "number" || data.version !== SUPPORTED_VERSION)) {
    return { ok: false, error: "This file was made by a newer or unknown version of Hisaab." };
  }
  const format: ImportPlan["format"] = hasVersion ? "hisaab-v1" : "legacy";

  const rawCustomers = data.customers;
  const rawEntries = data.entries ?? [];
  if (!Array.isArray(rawCustomers) || !Array.isArray(rawEntries)) {
    return { ok: false, error: "The JSON must contain a customers list and an entries list." };
  }
  if (rawCustomers.length > MAX_CUSTOMERS || rawEntries.length > MAX_ENTRIES) {
    return { ok: false, error: "This file has too many records to import at once." };
  }

  const rejected: Rejection[] = [];
  const warnings: string[] = [];
  const storedPhones = new Set(existing.customers.map((c) => c.phone));
  const filePhones = new Set<string>();
  const customersToCreate: PlannedCustomer[] = [];
  let customersMatched = 0;

  rawCustomers.forEach((item, index) => {
    const row = index + 1;
    if (!isPlainObject(item)) {
      rejected.push({ list: "customers", row, reason: "Not a customer record." });
      return;
    }
    const phone = normalizePhone(item.phone);
    if (!phone) {
      rejected.push({ list: "customers", row, reason: "Mobile number must be a 10-digit Indian number starting with 6-9." });
      return;
    }
    const name = cleanText(item.name, MAX_NAME);
    if (name.text === "") {
      rejected.push({ list: "customers", row, reason: "Customer name is missing." });
      return;
    }
    if (filePhones.has(phone) || storedPhones.has(phone)) {
      customersMatched += 1;
      filePhones.add(phone);
      return;
    }
    filePhones.add(phone);
    customersToCreate.push({
      phone,
      name: name.text,
      notes: cleanText(item.notes, 200).text,
      createdAt: optionalTimestamp(item.createdAt),
    });
  });

  const storedIds = new Set<string>();
  const storedCounts = new Map<string, number>();
  for (const e of existing.entries) {
    if (e.id) storedIds.add(e.id);
    const key = entryFingerprint(e);
    storedCounts.set(key, (storedCounts.get(key) ?? 0) + 1);
  }
  const seenCounts = new Map<string, number>();
  const seenIds = new Set<string>();
  const entriesToAdd: PlannedEntry[] = [];
  let entriesSkipped = 0;
  let trimmedNotes = 0;

  rawEntries.forEach((item, index) => {
    const row = index + 1;
    if (!isPlainObject(item)) {
      rejected.push({ list: "entries", row, reason: "Not an entry record." });
      return;
    }
    const phone = normalizePhone(item.phone);
    if (!phone || !(filePhones.has(phone) || storedPhones.has(phone))) {
      rejected.push({ list: "entries", row, reason: "No customer with this mobile number." });
      return;
    }
    const typeText = typeof item.type === "string" ? item.type.trim().toLowerCase() : "";
    if (typeText !== "credit" && typeText !== "payment") {
      rejected.push({ list: "entries", row, reason: "Type must be credit or payment." });
      return;
    }
    const amountPaise = parseRupeesToPaise(item.amount);
    if (amountPaise === null) {
      rejected.push({ list: "entries", row, reason: "Amount must be more than zero, with at most two decimals." });
      return;
    }
    if (!isValidIsoDate(item.date)) {
      rejected.push({ list: "entries", row, reason: "Date must be a real date written as YYYY-MM-DD." });
      return;
    }
    const note = cleanText(item.note, MAX_NOTE);
    if (note.trimmed) trimmedNotes += 1;

    const planned: PlannedEntry = {
      phone,
      type: typeText,
      kind: item.kind === "opening" ? "opening" : "normal",
      amountPaise,
      date: item.date,
      note: note.text,
      status: item.status === "cancelled" ? "cancelled" : "active",
      createdAt: optionalTimestamp(item.createdAt),
      importKey: "",
    };
    planned.importKey = entryFingerprint(planned);

    const id = typeof item.id === "string" && item.id.trim() !== "" ? item.id.trim().slice(0, 64) : undefined;
    if (id) {
      if (storedIds.has(id) || seenIds.has(id)) {
        entriesSkipped += 1;
        return;
      }
      seenIds.add(id);
      planned.id = id;
    }
    const seen = (seenCounts.get(planned.importKey) ?? 0) + 1;
    seenCounts.set(planned.importKey, seen);
    if (seen <= (storedCounts.get(planned.importKey) ?? 0)) {
      entriesSkipped += 1;
      return;
    }
    entriesToAdd.push(planned);
  });

  if (trimmedNotes > 0) warnings.push(`${trimmedNotes} note(s) were shortened to ${MAX_NOTE} characters.`);

  const shop = cleanText(data.shop, MAX_NAME).text;
  return {
    ok: true,
    format,
    shopName: shop === "" ? null : shop,
    customersToCreate,
    customersMatched,
    entriesToAdd,
    entriesSkipped,
    rejected,
    warnings,
  };
}
