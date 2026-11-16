import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { LedgerDb } from "@/ledger/data/db";
import { LedgerError, LedgerRepo } from "@/ledger/data/ledgerRepo";
import { balancesByCustomer, totalOutstanding } from "@/ledger/domain/balance";

const root = path.resolve(__dirname, "../..");
const sampleText = fs.readFileSync(path.join(root, "src/ledger/data/sample-shop.json"), "utf8");

let counter = 0;
let repo: LedgerRepo;
let dbName: string;

async function total(r: LedgerRepo): Promise<number> {
  const [customers, entries] = await Promise.all([r.listCustomers(), r.listEntries()]);
  return totalOutstanding(balancesByCustomer(entries, customers.map((c) => c.id)).values());
}

async function importText(r: LedgerRepo, text: string) {
  const plan = await r.planImport(text);
  if (!plan.ok) throw new Error(plan.error);
  return r.applyImport(plan);
}

beforeEach(() => {
  dbName = `test-ledger-${++counter}`;
  repo = new LedgerRepo(new LedgerDb(dbName));
});

describe("customers and entries", () => {
  it("adds a customer and blocks a duplicate phone", async () => {
    const c = await repo.addCustomer({ name: " Ravi Kumar ", phone: "+91 90000 00101" });
    expect(c.phone).toBe("9000000101");
    expect(c.name).toBe("Ravi Kumar");
    await expect(repo.addCustomer({ name: "Other", phone: "09000000101" })).rejects.toMatchObject({ code: "duplicate-phone" });
    await expect(repo.addCustomer({ name: "", phone: "9000000102" })).rejects.toBeInstanceOf(LedgerError);
    await expect(repo.addCustomer({ name: "X", phone: "12345" })).rejects.toMatchObject({ code: "invalid-phone" });
    expect(await repo.listCustomers()).toHaveLength(1);
  });

  it("records entries, cancels without deleting, and keeps totals right", async () => {
    const c = await repo.addCustomer({ name: "Ravi", phone: "9000000101" });
    const credit = await repo.addEntry({ customerId: c.id, type: "credit", amountPaise: 25000, date: "2026-11-01" });
    await repo.addEntry({ customerId: c.id, type: "payment", amountPaise: 10000, date: "2026-11-02" });
    expect(await total(repo)).toBe(15000);
    const cancelled = await repo.cancelEntry(credit.id, "wrong amount");
    expect(cancelled.status).toBe("cancelled");
    expect(await repo.listEntries()).toHaveLength(2);
    expect(await total(repo)).toBe(0);
    await expect(repo.addEntry({ customerId: c.id, type: "credit", amountPaise: 0, date: "2026-11-01" })).rejects.toMatchObject({ code: "invalid-amount" });
    await expect(repo.addEntry({ customerId: c.id, type: "credit", amountPaise: 100, date: "2026-02-30" })).rejects.toMatchObject({ code: "invalid-date" });
    await expect(repo.addEntry({ customerId: "nope", type: "credit", amountPaise: 100, date: "2026-11-01" })).rejects.toMatchObject({ code: "not-found" });
  });

  it("keeps data when the database is reopened", async () => {
    const c = await repo.addCustomer({ name: "Ravi", phone: "9000000101" });
    await repo.addEntry({ customerId: c.id, type: "credit", amountPaise: 25000, date: "2026-11-01" });
    repo.db.close();
    const reopened = new LedgerRepo(new LedgerDb(dbName));
    expect(await reopened.listCustomers()).toHaveLength(1);
    expect(await total(reopened)).toBe(25000);
  });
});

describe("import", () => {
  it("imports the sample into an empty ledger with the expected total", async () => {
    const outcome = await importText(repo, sampleText);
    expect(outcome).toMatchObject({ mode: "add", created: 8, added: 38, skipped: 0, rejected: 0 });
    expect(await total(repo)).toBe(1182000);
  });

  it("changes nothing when the same file is imported twice", async () => {
    await importText(repo, sampleText);
    const second = await importText(repo, sampleText);
    expect(second).toMatchObject({ created: 0, matched: 8, added: 0, skipped: 38 });
    expect(await repo.listCustomers()).toHaveLength(8);
    expect(await total(repo)).toBe(1182000);
  });

  it("adds to real data without touching existing records", async () => {
    const c = await repo.addCustomer({ name: "Mine", phone: "9811111111" });
    await repo.addEntry({ customerId: c.id, type: "credit", amountPaise: 50000, date: "2026-11-01" });
    await importText(repo, sampleText);
    expect(await repo.listCustomers()).toHaveLength(9);
    expect(await total(repo)).toBe(1182000 + 50000);
  });

  it("undo restores the previous state exactly", async () => {
    const c = await repo.addCustomer({ name: "Mine", phone: "9811111111" });
    await repo.addEntry({ customerId: c.id, type: "credit", amountPaise: 50000, date: "2026-11-01" });
    await repo.getSettings(); // settings are created on first use
    const before = await repo.snapshot();
    const outcome = await importText(repo, sampleText);
    await repo.restoreSnapshot(outcome.snapshot);
    expect(await repo.snapshot()).toEqual(before);
  });
});

describe("sample (demo) data", () => {
  const otherShop = JSON.stringify({
    shop: "Another Shop",
    customers: [{ name: "New Person", phone: "9822222222" }],
    entries: [{ phone: "9822222222", type: "credit", amount: 700, date: "2026-11-10", note: "rice" }],
  });

  it("seeds only an empty ledger and marks it as sample data", async () => {
    expect(await repo.seedDemoIfEmpty(sampleText)).toBe(true);
    expect(await repo.seedDemoIfEmpty(sampleText)).toBe(false);
    const settings = await repo.getSettings();
    expect(settings.isDemoData).toBe(true);
    expect(settings.shopName).toBe("Lakshmi Provision Store (fictional)");
    expect(await total(repo)).toBe(1182000);
  });

  it("is replaced by the first import, so totals equal the imported shop alone", async () => {
    await repo.seedDemoIfEmpty(sampleText);
    const outcome = await importText(repo, otherShop);
    expect(outcome.mode).toBe("demo-replace");
    expect(await repo.listCustomers()).toHaveLength(1);
    expect(await total(repo)).toBe(70000);
    expect((await repo.getSettings()).isDemoData).toBe(false);
    await repo.restoreSnapshot(outcome.snapshot);
    expect(await total(repo)).toBe(1182000);
    expect((await repo.getSettings()).isDemoData).toBe(true);
  });

  it("re-importing the sample over sample data still gives the expected total", async () => {
    await repo.seedDemoIfEmpty(sampleText);
    await importText(repo, sampleText);
    expect(await repo.listCustomers()).toHaveLength(8);
    expect(await total(repo)).toBe(1182000);
  });

  it("is treated as real data once the shopkeeper edits it", async () => {
    await repo.seedDemoIfEmpty(sampleText);
    await repo.addCustomer({ name: "Mine", phone: "9811111111" });
    const outcome = await importText(repo, otherShop);
    expect(outcome.mode).toBe("add");
    expect(await repo.listCustomers()).toHaveLength(10);
  });

  it("is not wiped by an import that has nothing usable", async () => {
    await repo.seedDemoIfEmpty(sampleText);
    await importText(repo, '{"customers":[{"name":"Bad","phone":"123"}],"entries":[]}');
    expect(await repo.listCustomers()).toHaveLength(8);
  });
});

describe("opening balance", () => {
  it("is recorded as one credit entry and counts towards the balance", async () => {
    const customer = await repo.addCustomer({
      name: "Carried Over",
      phone: "9812345678",
      opening: { amountPaise: 250000, date: "2026-10-01" },
    });
    const entries = await repo.listEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      customerId: customer.id,
      type: "credit",
      kind: "opening",
      amountPaise: 250000,
      date: "2026-10-01",
      note: "Opening balance",
    });
    expect(await total(repo)).toBe(250000);
  });

  it("is rejected without saving the customer when the amount is not valid", async () => {
    await expect(
      repo.addCustomer({ name: "Bad", phone: "9812345670", opening: { amountPaise: 0, date: "2026-10-01" } }),
    ).rejects.toBeInstanceOf(LedgerError);
    expect(await repo.listCustomers()).toHaveLength(0);
  });

  it("is optional", async () => {
    await repo.addCustomer({ name: "Fresh", phone: "9812345671" });
    expect(await repo.listEntries()).toHaveLength(0);
  });
});

describe("backup and restore", () => {
  const smallShop = JSON.stringify({
    shop: "Another Shop",
    customers: [{ name: "New Person", phone: "9822222222" }],
    entries: [{ phone: "9822222222", type: "credit", amount: 700, date: "2026-11-10", note: "rice" }],
  });

  it("exports a file that can be read back as the same ledger", async () => {
    await repo.seedDemoIfEmpty(sampleText);
    const before = await total(repo);
    const backup = await repo.exportBackup();
    const parsed = JSON.parse(backup);
    expect(parsed.format).toBe("hisaab-ledger");
    expect(parsed.version).toBe(1);
    expect(parsed.customers).toHaveLength(8);
    expect(parsed.entries).toHaveLength(38);

    const fresh = new LedgerRepo(new LedgerDb(`test-ledger-restore-${counter}`));
    await importText(fresh, backup);
    expect(await fresh.listCustomers()).toHaveLength(8);
    expect(await total(fresh)).toBe(before);
  });

  it("replaces the whole ledger and can be undone", async () => {
    await repo.seedDemoIfEmpty(sampleText);
    await repo.addCustomer({ name: "Mine", phone: "9811111111" });
    const before = await repo.snapshot();

    const plan = await repo.planImport(smallShop);
    if (!plan.ok) throw new Error(plan.error);
    const outcome = await repo.applyReplace(plan);
    expect(outcome.mode).toBe("replace");
    expect(await repo.listCustomers()).toHaveLength(1);
    expect(await total(repo)).toBe(70000);

    await repo.restoreSnapshot(outcome.snapshot);
    expect(await repo.listCustomers()).toHaveLength(9);
    expect(await repo.listEntries()).toHaveLength(before.entries.length);
  });

  it("erases customers and entries but keeps the shop settings", async () => {
    await repo.seedDemoIfEmpty(sampleText);
    await repo.saveSettings({ shopName: "Sharma Kirana" });
    const snapshot = await repo.eraseAll();
    expect(await repo.listCustomers()).toHaveLength(0);
    expect(await repo.listEntries()).toHaveLength(0);
    expect((await repo.getSettings()).shopName).toBe("Sharma Kirana");

    await repo.restoreSnapshot(snapshot);
    expect(await repo.listCustomers()).toHaveLength(8);
  });
});
