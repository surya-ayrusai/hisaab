import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { formatIndianRupees, formatPlainRupees, parseRupeesToPaise } from "@/ledger/domain/money";
import { normalizePhone } from "@/ledger/domain/phone";
import { daysBetween, isValidIsoDate, resolveEffectiveDate } from "@/platform/dates";
import {
  balancesByCustomer,
  compareNewestFirst,
  countWithDues,
  customerBalance,
  totalOutstanding,
  type LedgerEntryLike,
} from "@/ledger/domain/balance";
import { ageingSummary, bandForDays, openCreditsForCustomer } from "@/ledger/domain/ageing";
import { buildReminderMessage, buildWhatsAppUrl } from "@/ledger/domain/reminder";
import { planImport } from "@/ledger/domain/importPlan";

const root = path.resolve(__dirname, "../..");
const sampleText = fs.readFileSync(path.join(root, "src/ledger/data/sample-shop.json"), "utf8");
const expected = JSON.parse(fs.readFileSync(path.join(root, "tests/fixtures/sample-expected.json"), "utf8"));

function entry(customerId: string, type: "credit" | "payment", rupees: number, date: string): LedgerEntryLike {
  return { customerId, type, amountPaise: rupees * 100, date, status: "active" };
}

function sampleEntries(): LedgerEntryLike[] {
  const plan = planImport(sampleText);
  if (!plan.ok) throw new Error(plan.error);
  return plan.entriesToAdd.map((e) => ({
    customerId: e.phone,
    type: e.type,
    amountPaise: e.amountPaise,
    date: e.date,
    status: e.status,
  }));
}

describe("money", () => {
  it("parses rupees into paise exactly", () => {
    expect(parseRupeesToPaise(250)).toBe(25000);
    expect(parseRupeesToPaise("250.5")).toBe(25050);
    expect(parseRupeesToPaise("1,250.75")).toBe(125075);
    expect(parseRupeesToPaise(0.1)! + parseRupeesToPaise(0.2)!).toBe(30);
  });
  it("rejects zero, negative, too many decimals and text", () => {
    for (const bad of [0, -5, "12.345", "abc", "", null, undefined, NaN, Infinity, "1e3", {}]) {
      expect(parseRupeesToPaise(bad)).toBeNull();
    }
  });
  it("formats plain and Indian-grouped amounts", () => {
    expect(formatPlainRupees(67000)).toBe("670");
    expect(formatPlainRupees(67050)).toBe("670.50");
    expect(formatPlainRupees(-20000)).toBe("-200");
    expect(formatPlainRupees(0)).toBe("0");
    expect(formatIndianRupees(1182000)).toBe("11,820");
    expect(formatIndianRupees(999999950)).toBe("99,99,999.50");
    expect(formatIndianRupees(10000000)).toBe("1,00,000");
    expect(formatIndianRupees(99900)).toBe("999");
  });
});

describe("phone", () => {
  it("normalises common ways of typing a number", () => {
    for (const raw of ["9000000101", "+91 90000 00101", "919000000101", "09000000101", "90000-00101", 9000000101]) {
      expect(normalizePhone(raw)).toBe("9000000101");
    }
  });
  it("rejects numbers that are not Indian mobile numbers", () => {
    for (const raw of ["900000010", "90000001011", "1234567890", "5000000101", "abc", "", null, "90000x0101"]) {
      expect(normalizePhone(raw)).toBeNull();
    }
  });
});

describe("dates and effective today", () => {
  it("validates real calendar dates", () => {
    expect(isValidIsoDate("2026-11-15")).toBe(true);
    expect(isValidIsoDate("2024-02-29")).toBe(true);
    for (const bad of ["2026-02-30", "2026-13-01", "15-11-2026", "2026-1-5", "", null, 20261115]) {
      expect(isValidIsoDate(bad)).toBe(false);
    }
  });
  it("honours ?today= and falls back safely", () => {
    const now = new Date(2026, 0, 5, 10, 0, 0);
    expect(resolveEffectiveDate("?today=2026-11-15", now)).toEqual({ today: "2026-11-15", overridden: true });
    expect(resolveEffectiveDate("?q=hello&today=2026-11-15", now).today).toBe("2026-11-15");
    expect(resolveEffectiveDate("", now)).toEqual({ today: "2026-01-05", overridden: false });
    expect(resolveEffectiveDate("?today=abc", now)).toEqual({ today: "2026-01-05", overridden: false });
    expect(resolveEffectiveDate("?today=2026-02-30", now).overridden).toBe(false);
  });
  it("counts days between dates", () => {
    expect(daysBetween("2026-10-25", "2026-11-15")).toBe(21);
    expect(daysBetween("2026-11-15", "2026-11-15")).toBe(0);
  });
});

describe("balance engine", () => {
  it("handles credit, partial payment and advance", () => {
    const a = [entry("a", "credit", 250, "2026-01-01"), entry("a", "payment", 100, "2026-01-02")];
    expect(customerBalance(a)).toBe(15000);
    expect(customerBalance([...a, entry("a", "payment", 350, "2026-01-03")])).toBe(-20000);
  });
  it("ignores cancelled entries", () => {
    const list: LedgerEntryLike[] = [
      entry("a", "credit", 250, "2026-01-01"),
      { ...entry("a", "credit", 999, "2026-01-01"), status: "cancelled" },
    ];
    expect(customerBalance(list)).toBe(25000);
  });
  it("never lets one customer's advance reduce the shop total", () => {
    const balances = balancesByCustomer(
      [entry("a", "credit", 500, "2026-01-01"), entry("b", "payment", 200, "2026-01-01")],
      ["a", "b", "c"],
    );
    expect(balances.get("b")).toBe(-20000);
    expect(balances.get("c")).toBe(0);
    expect(totalOutstanding(balances.values())).toBe(50000);
    expect(countWithDues(balances.values())).toBe(1);
  });
  it("shows zero for an empty ledger", () => {
    expect(totalOutstanding([])).toBe(0);
  });
  it("orders newest first by date then creation time", () => {
    const list = [
      { date: "2026-01-01", createdAt: "2026-01-01T10:00:00.000Z" },
      { date: "2026-01-02", createdAt: "2026-01-02T09:00:00.000Z" },
      { date: "2026-01-02", createdAt: "2026-01-02T11:00:00.000Z" },
    ].sort(compareNewestFirst);
    expect(list.map((e) => e.createdAt)).toEqual([
      "2026-01-02T11:00:00.000Z",
      "2026-01-02T09:00:00.000Z",
      "2026-01-01T10:00:00.000Z",
    ]);
  });
});

describe("supplied sample reproduces the expected results", () => {
  const entries = sampleEntries();
  const phones = Object.keys(expected.balances);
  const balances = balancesByCustomer(entries, phones);

  it("matches every customer balance", () => {
    for (const phone of phones) {
      expect(formatPlainRupees(balances.get(phone)!)).toBe(String(expected.balances[phone]));
    }
    expect(balances.size).toBe(8);
  });
  it("matches total, top customer and count with dues", () => {
    expect(totalOutstanding(balances.values())).toBe(expected.total_outstanding * 100);
    expect(formatIndianRupees(totalOutstanding(balances.values()))).toBe("11,820");
    const top = [...balances.entries()].sort((x, y) => y[1] - x[1])[0][0];
    expect(top).toBe(expected.top_defaulter_phone);
    expect(countWithDues(balances.values())).toBe(expected.customers_with_balance);
  });
  it("ages dues oldest-credit-first and the bands add up to the total", () => {
    const summary = ageingSummary(entries, expected.today);
    expect(summary).toEqual({ "0-7": 0, "8-15": 0, "16-30": 241000, "31-60": 918000, "60+": 23000 });
    const sum = Object.values(summary).reduce((a, b) => a + b, 0);
    expect(sum).toBe(totalOutstanding(balances.values()));
  });
});

describe("ageing", () => {
  it("assigns bands at the boundaries", () => {
    expect([0, 7, 8, 15, 16, 30, 31, 60, 61].map(bandForDays)).toEqual([
      "0-7", "0-7", "8-15", "8-15", "16-30", "16-30", "31-60", "31-60", "60+",
    ]);
  });
  it("applies payments to the oldest credit first", () => {
    const open = openCreditsForCustomer(
      [
        entry("a", "credit", 100, "2026-01-01"),
        entry("a", "credit", 200, "2026-02-01"),
        entry("a", "payment", 150, "2026-02-10"),
      ],
      "2026-02-11",
    );
    expect(open).toEqual([{ customerId: "a", date: "2026-02-01", remainingPaise: 15000, ageDays: 10 }]);
  });
  it("shows nothing open for a customer in advance", () => {
    expect(openCreditsForCustomer([entry("a", "credit", 100, "2026-01-01"), entry("a", "payment", 300, "2026-01-02")], "2026-03-01")).toEqual([]);
  });
});

describe("WhatsApp reminder", () => {
  const input = { customerName: "Sunita Devi", shopName: "Lakshmi Provision Store", balancePaise: 347000 };
  it("builds the contracted link", () => {
    const url = buildWhatsAppUrl("9000000102", input)!;
    expect(url.startsWith("https://wa.me/919000000102?text=")).toBe(true);
    expect(url).not.toContain("9191");
    const decoded = decodeURIComponent(url.split("?text=")[1]);
    expect(decoded).toBe(buildReminderMessage(input));
    expect(decoded).toContain("Sunita Devi");
    expect(decoded).toContain("Lakshmi Provision Store");
    expect(decoded).toContain("3,470");
  });
  it("encodes special characters reversibly in every tone", () => {
    for (const tone of ["friendly", "polite", "formal"] as const) {
      const special = { ...input, customerName: "R&D #1 + Sons?", tone };
      const url = buildWhatsAppUrl("9000000102", special)!;
      const query = url.slice(url.indexOf("?text=") + 6);
      expect(query).not.toMatch(/[ &#+?]/);
      expect(new URL(url).searchParams.get("text")).toBe(buildReminderMessage(special));
    }
  });
  it("uses English only", () => {
    for (const tone of ["friendly", "polite", "formal"] as const) {
      expect(buildReminderMessage({ ...input, tone })).toMatch(/^[\x20-\x7E]+$/);
    }
  });
  it("offers no link without a due or with a bad number", () => {
    expect(buildWhatsAppUrl("9000000102", { ...input, balancePaise: 0 })).toBeNull();
    expect(buildWhatsAppUrl("9000000102", { ...input, balancePaise: -500 })).toBeNull();
    expect(buildWhatsAppUrl("12345", input)).toBeNull();
  });
});

describe("import planning", () => {
  it("plans the sample: 8 customers and 38 entries", () => {
    const plan = planImport(sampleText);
    expect(plan.ok).toBe(true);
    if (!plan.ok) return;
    expect(plan.format).toBe("legacy");
    expect(plan.customersToCreate).toHaveLength(8);
    expect(plan.entriesToAdd).toHaveLength(38);
    expect(plan.rejected).toEqual([]);
    expect(plan.shopName).toBe("Lakshmi Provision Store (fictional)");
  });
  it("changes nothing when the same file is imported again", () => {
    const first = planImport(sampleText);
    if (!first.ok) throw new Error("unexpected");
    const again = planImport(sampleText, {
      customers: first.customersToCreate,
      entries: first.entriesToAdd,
    });
    if (!again.ok) throw new Error("unexpected");
    expect(again.customersToCreate).toHaveLength(0);
    expect(again.customersMatched).toBe(8);
    expect(again.entriesToAdd).toHaveLength(0);
    expect(again.entriesSkipped).toBe(38);
  });
  it("keeps genuinely repeated identical entries", () => {
    const text = JSON.stringify({
      customers: [{ name: "A", phone: "9000000001" }],
      entries: [
        { phone: "9000000001", type: "credit", amount: 10, date: "2026-01-01", note: "tea" },
        { phone: "9000000001", type: "credit", amount: 10, date: "2026-01-01", note: "tea" },
      ],
    });
    const plan = planImport(text);
    if (!plan.ok) throw new Error("unexpected");
    expect(plan.entriesToAdd).toHaveLength(2);
  });
  it("refuses whole payloads that cannot be trusted", () => {
    for (const text of ["", "   ", "{not json", "[]", "42", '{"customers":{}}', '{"entries":[]}']) {
      expect(planImport(text).ok).toBe(false);
    }
    expect(planImport('{"version":99,"customers":[],"entries":[]}').ok).toBe(false);
    expect(planImport('{"format":"other","customers":[],"entries":[]}').ok).toBe(false);
    expect(planImport('{"format":"hisaab-ledger","version":1,"customers":[],"entries":[]}').ok).toBe(true);
  });
  it("rejects bad rows with reasons and keeps the valid ones", () => {
    const text = JSON.stringify({
      customers: [
        { name: "Good", phone: "9000000001" },
        { name: "Bad phone", phone: "12345" },
        { name: "", phone: "9000000002" },
        "junk",
      ],
      entries: [
        { phone: "9000000001", type: "CREDIT", amount: "100.50", date: "2026-01-01" },
        { phone: "9000000001", type: "credit", amount: 0, date: "2026-01-01" },
        { phone: "9000000001", type: "refund", amount: 5, date: "2026-01-01" },
        { phone: "9000000001", type: "credit", amount: 5, date: "2026-02-30" },
        { phone: "9000000009", type: "credit", amount: 5, date: "2026-01-01" },
        { phone: "9000000001", type: "payment", amount: 5, date: "2026-01-02", note: "x".repeat(200) },
      ],
    });
    const plan = planImport(text);
    if (!plan.ok) throw new Error("unexpected");
    expect(plan.customersToCreate.map((c) => c.phone)).toEqual(["9000000001"]);
    expect(plan.entriesToAdd).toHaveLength(2);
    expect(plan.entriesToAdd[0].amountPaise).toBe(10050);
    expect(plan.entriesToAdd[1].note).toHaveLength(80);
    expect(plan.rejected.map((r) => `${r.list}:${r.row}`)).toEqual([
      "customers:2", "customers:3", "customers:4", "entries:2", "entries:3", "entries:4", "entries:5",
    ]);
    expect(plan.warnings).toHaveLength(1);
  });
  it("copies only known fields from untrusted input", () => {
    const text = '{"customers":[{"name":"<script>alert(1)</script>","phone":"9000000001","__proto__":{"x":1},"evil":true}],"entries":[]}';
    const plan = planImport(text);
    if (!plan.ok) throw new Error("unexpected");
    expect(Object.keys(plan.customersToCreate[0]).sort()).toEqual(["createdAt", "name", "notes", "phone"]);
    expect(plan.customersToCreate[0].name).toBe("<script>alert(1)</script>");
    expect(({} as Record<string, unknown>).x).toBeUndefined();
  });
});
