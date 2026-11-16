/**
 * Ledger repository. All writes go through here; every multi-record change
 * runs in one database transaction so a failure leaves data unchanged.
 */

import { isValidIsoDate } from "@/platform/dates";
import type { EntryType } from "../domain/balance";
import { entryFingerprint, planImport, type ImportPlan } from "../domain/importPlan";
import { normalizePhone } from "../domain/phone";
import {
  LedgerDb,
  SCHEMA_VERSION,
  newId,
  type CustomerRecord,
  type EntryRecord,
  type SettingsRecord,
  type ShotRecord,
} from "./db";

export class LedgerError extends Error {
  constructor(
    public code: "invalid-name" | "invalid-phone" | "duplicate-phone" | "invalid-amount" | "invalid-date" | "not-found",
    message: string,
  ) {
    super(message);
    this.name = "LedgerError";
  }
}

export interface LedgerSnapshot {
  customers: CustomerRecord[];
  entries: EntryRecord[];
  settings: SettingsRecord | undefined;
}

export interface ImportOutcome {
  mode: "add" | "demo-replace";
  created: number;
  matched: number;
  added: number;
  skipped: number;
  rejected: number;
  snapshot: LedgerSnapshot;
}

const DEFAULT_SHOP_NAME = "My Shop";

export class LedgerRepo {
  constructor(public readonly db: LedgerDb) {}

  async getSettings(): Promise<SettingsRecord> {
    const found = await this.db.settings.get("shop");
    if (found) return found;
    const fresh: SettingsRecord = {
      key: "shop",
      shopName: DEFAULT_SHOP_NAME,
      reminderLanguage: "en",
      reminderTone: "polite",
      isDemoData: false,
      schemaVersion: SCHEMA_VERSION,
      updatedAt: new Date().toISOString(),
    };
    await this.db.settings.put(fresh);
    return fresh;
  }

  async saveSettings(patch: Partial<Omit<SettingsRecord, "key">>): Promise<SettingsRecord> {
    const current = await this.getSettings();
    const next = { ...current, ...patch, key: "shop" as const, updatedAt: new Date().toISOString() };
    await this.db.settings.put(next);
    return next;
  }

  listCustomers(): Promise<CustomerRecord[]> {
    return this.db.customers.toArray();
  }

  listEntries(): Promise<EntryRecord[]> {
    return this.db.entries.toArray();
  }

  async addCustomer(input: { name: string; phone: string; notes?: string }): Promise<CustomerRecord> {
    const name = input.name.trim();
    if (name.length < 1 || name.length > 60) throw new LedgerError("invalid-name", "Enter the customer's name.");
    const phone = normalizePhone(input.phone);
    if (!phone) throw new LedgerError("invalid-phone", "Enter a valid 10-digit mobile number.");
    return this.db.transaction("rw", this.db.customers, this.db.settings, async () => {
      if (await this.db.customers.where("phone").equals(phone).first()) {
        throw new LedgerError("duplicate-phone", "This number is already in your ledger.");
      }
      const now = new Date().toISOString();
      const record: CustomerRecord = {
        id: newId("c"),
        phone,
        name,
        notes: (input.notes ?? "").trim().slice(0, 200),
        createdAt: now,
        updatedAt: now,
        seq: await this.nextSeq(),
      };
      await this.db.customers.add(record);
      await this.markEdited();
      return record;
    });
  }

  async addEntry(input: {
    customerId: string;
    type: EntryType;
    amountPaise: number;
    date: string;
    note?: string;
    kind?: "normal" | "opening";
    /** Payment screenshot, already validated and downscaled. Payments only. */
    shot?: { blob: Blob; mimeType: string };
  }): Promise<EntryRecord> {
    if (!Number.isSafeInteger(input.amountPaise) || input.amountPaise <= 0) {
      throw new LedgerError("invalid-amount", "Enter an amount more than zero.");
    }
    if (!isValidIsoDate(input.date)) throw new LedgerError("invalid-date", "Choose a valid date.");
    const tables = [this.db.customers, this.db.entries, this.db.settings, this.db.shots];
    return this.db.transaction("rw", tables, async () => {
      const customer = await this.db.customers.get(input.customerId);
      if (!customer) throw new LedgerError("not-found", "Customer not found.");
      const note = (input.note ?? "").trim().slice(0, 80);
      const record: EntryRecord = {
        id: newId("e"),
        customerId: customer.id,
        type: input.type,
        kind: input.kind ?? "normal",
        amountPaise: input.amountPaise,
        date: input.date,
        note,
        status: "active",
        source: "manual",
        importKey: entryFingerprint({
          phone: customer.phone,
          type: input.type,
          amountPaise: input.amountPaise,
          date: input.date,
          note,
        }),
        createdAt: new Date().toISOString(),
      };
      if (input.shot && input.type === "payment") {
        const shot: ShotRecord = {
          id: newId("s"),
          entryId: record.id,
          blob: input.shot.blob,
          mimeType: input.shot.mimeType,
          bytes: input.shot.blob.size,
          createdAt: record.createdAt,
        };
        record.shotId = shot.id;
        await this.db.shots.add(shot);
      }
      await this.db.entries.add(record);
      await this.markEdited();
      return record;
    });
  }

  listShots(): Promise<ShotRecord[]> {
    return this.db.shots.toArray();
  }

  /** Removes the bundled sample shop so the shopkeeper can start their own ledger. */
  async clearSampleData(): Promise<void> {
    const tables = [this.db.customers, this.db.entries, this.db.settings, this.db.shots];
    await this.db.transaction("rw", tables, async () => {
      const settings = await this.getSettings();
      if (!settings.isDemoData) return;
      await this.db.customers.clear();
      await this.db.entries.clear();
      await this.db.shots.clear();
      await this.db.settings.put({ ...settings, shopName: "My Shop", isDemoData: false, updatedAt: new Date().toISOString() });
    });
  }

  /** Cancelled entries stay stored and visible but stop counting. Nothing is deleted. */
  async cancelEntry(entryId: string, reason = ""): Promise<EntryRecord> {
    return this.db.transaction("rw", this.db.entries, this.db.settings, async () => {
      const entry = await this.db.entries.get(entryId);
      if (!entry) throw new LedgerError("not-found", "Entry not found.");
      if (entry.status === "cancelled") return entry;
      const next: EntryRecord = {
        ...entry,
        status: "cancelled",
        cancelledAt: new Date().toISOString(),
        cancelReason: reason.trim().slice(0, 80),
      };
      await this.db.entries.put(next);
      await this.markEdited();
      return next;
    });
  }

  async snapshot(): Promise<LedgerSnapshot> {
    const [customers, entries, settings] = await Promise.all([
      this.db.customers.toArray(),
      this.db.entries.toArray(),
      this.db.settings.get("shop"),
    ]);
    return { customers, entries, settings };
  }

  /** Puts the ledger back exactly as it was in the snapshot (used by Undo). */
  async restoreSnapshot(snapshot: LedgerSnapshot): Promise<void> {
    await this.db.transaction("rw", this.db.customers, this.db.entries, this.db.settings, async () => {
      await this.db.customers.clear();
      await this.db.entries.clear();
      await this.db.customers.bulkAdd(snapshot.customers);
      await this.db.entries.bulkAdd(snapshot.entries);
      if (snapshot.settings) await this.db.settings.put(snapshot.settings);
    });
  }

  /** Builds an import plan against what is stored now. Writes nothing. */
  async planImport(text: string) {
    const settings = await this.getSettings();
    if (settings.isDemoData) return planImport(text);
    const [customers, entries] = await Promise.all([this.db.customers.toArray(), this.db.entries.toArray()]);
    const phoneById = new Map(customers.map((c) => [c.id, c.phone]));
    return planImport(text, {
      customers,
      entries: entries.map((e) => ({
        id: e.id,
        phone: phoneById.get(e.customerId) ?? "",
        type: e.type,
        amountPaise: e.amountPaise,
        date: e.date,
        note: e.note,
      })),
    });
  }

  /**
   * Applies a plan in one transaction. While the ledger holds only untouched
   * sample data, the import replaces it; otherwise the import only adds.
   * The returned snapshot allows Undo.
   */
  async applyImport(plan: ImportPlan, source: "import" | "demo" = "import"): Promise<ImportOutcome> {
    const snapshot = await this.snapshot();
    const tables = [this.db.customers, this.db.entries, this.db.settings, this.db.importLog];
    return this.db.transaction("rw", tables, async () => {
      const settings = await this.getSettings();
      // An import with nothing usable never wipes the sample data.
      const replacingDemo = settings.isDemoData && source === "import" && plan.customersToCreate.length > 0;
      if (replacingDemo) {
        await this.db.customers.clear();
        await this.db.entries.clear();
      }
      const now = new Date().toISOString();
      let seq = await this.nextSeq();
      const idByPhone = new Map((await this.db.customers.toArray()).map((c) => [c.phone, c.id]));

      const newCustomers: CustomerRecord[] = plan.customersToCreate.map((c) => {
        const record: CustomerRecord = {
          id: newId("c"),
          phone: c.phone,
          name: c.name,
          notes: c.notes,
          createdAt: c.createdAt ?? now,
          updatedAt: now,
          seq: seq++,
        };
        idByPhone.set(c.phone, record.id);
        return record;
      });
      await this.db.customers.bulkAdd(newCustomers);

      const newEntries: EntryRecord[] = [];
      plan.entriesToAdd.forEach((e, index) => {
        const customerId = idByPhone.get(e.phone);
        if (!customerId) return;
        newEntries.push({
          id: e.id ?? newId("e"),
          customerId,
          type: e.type,
          kind: e.kind,
          amountPaise: e.amountPaise,
          date: e.date,
          note: e.note,
          status: e.status,
          source,
          importKey: e.importKey,
          // Keeps file order stable for entries created in the same instant.
          createdAt: e.createdAt ?? new Date(Date.parse(now) + index).toISOString(),
        });
      });
      await this.db.entries.bulkAdd(newEntries);

      await this.db.settings.put({
        ...settings,
        shopName: (replacingDemo || source === "demo") && plan.shopName ? plan.shopName : settings.shopName,
        isDemoData: source === "demo",
        updatedAt: now,
      });

      const outcome: ImportOutcome = {
        mode: replacingDemo ? "demo-replace" : "add",
        created: newCustomers.length,
        matched: plan.customersMatched,
        added: newEntries.length,
        skipped: plan.entriesSkipped,
        rejected: plan.rejected.length,
        snapshot,
      };
      await this.db.importLog.add({
        id: newId("i"),
        at: now,
        mode: outcome.mode,
        created: outcome.created,
        matched: outcome.matched,
        added: outcome.added,
        skipped: outcome.skipped,
        rejected: outcome.rejected,
        format: plan.format,
      });
      return outcome;
    });
  }

  /** Loads the bundled sample shop into an empty ledger and marks it as sample data. */
  async seedDemoIfEmpty(sampleJson: string): Promise<boolean> {
    if ((await this.db.customers.count()) > 0 || (await this.db.settings.get("shop"))) return false;
    const plan = planImport(sampleJson);
    if (!plan.ok) return false;
    await this.applyImport(plan, "demo");
    return true;
  }

  private async nextSeq(): Promise<number> {
    const last = await this.db.customers.orderBy("seq").last();
    return (last?.seq ?? 0) + 1;
  }

  /** Any manual change means the ledger is no longer untouched sample data. */
  private async markEdited(): Promise<void> {
    const settings = await this.db.settings.get("shop");
    if (settings?.isDemoData) await this.db.settings.put({ ...settings, isDemoData: false });
  }
}
