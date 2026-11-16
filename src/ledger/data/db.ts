/**
 * Ledger database (IndexedDB via Dexie). Lives only in this browser.
 * The Assistant module uses a separate database and never touches this one.
 */

import Dexie, { type Table } from "dexie";
import type { EntryStatus, EntryType } from "../domain/balance";
import type { ReminderLanguage, ReminderTone } from "../domain/reminder";

export const LEDGER_DB_NAME = "hisaab-ledger";
export const SCHEMA_VERSION = 1;

export interface CustomerRecord {
  id: string;
  phone: string;
  name: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
  seq: number;
}

export interface EntryRecord {
  id: string;
  customerId: string;
  type: EntryType;
  kind: "normal" | "opening";
  amountPaise: number;
  date: string;
  note: string;
  shotId?: string;
  status: EntryStatus;
  cancelledAt?: string;
  cancelReason?: string;
  source: "manual" | "import" | "demo";
  importKey: string;
  createdAt: string;
}

export interface ShotRecord {
  id: string;
  entryId: string;
  blob: Blob;
  mimeType: string;
  bytes: number;
  createdAt: string;
}

export interface SettingsRecord {
  key: "shop";
  shopName: string;
  reminderLanguage: ReminderLanguage;
  reminderTone: ReminderTone;
  isDemoData: boolean;
  schemaVersion: number;
  updatedAt: string;
}

export interface ImportLogRecord {
  id: string;
  at: string;
  mode: "add" | "replace" | "demo-replace";
  created: number;
  matched: number;
  added: number;
  skipped: number;
  rejected: number;
  format: string;
}

export class LedgerDb extends Dexie {
  customers!: Table<CustomerRecord, string>;
  entries!: Table<EntryRecord, string>;
  shots!: Table<ShotRecord, string>;
  settings!: Table<SettingsRecord, string>;
  importLog!: Table<ImportLogRecord, string>;

  constructor(name: string = LEDGER_DB_NAME) {
    super(name);
    this.version(1).stores({
      customers: "id, &phone, createdAt, seq",
      entries: "id, customerId, date, status, importKey",
      shots: "id, &entryId",
      settings: "key",
      importLog: "id, at",
    });
  }
}

export function newId(prefix: string): string {
  const uuid =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  return `${prefix}_${uuid}`;
}
