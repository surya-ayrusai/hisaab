/**
 * Measures the ledger with a large book. Run against a production build:
 *   npx next build && npx next start -p 3100 &
 *   node scripts/perf.mjs
 * Pass a different base with HISAAB_URL.
 */
import { chromium } from "@playwright/test";

/*
 * Selectors here are deliberately CSS, never getByRole. Playwright computes an
 * accessible name for every element in the page to resolve a role selector, and
 * on a 2,000-customer ledger that walk alone takes seven seconds — which once
 * made the app look far slower than it is. CSS selectors measure the app.
 */

const BASE = process.env.HISAAB_URL ?? "http://localhost:3100";
const CUSTOMERS = Number(process.env.PERF_CUSTOMERS ?? 500);
const ENTRIES_EACH = Number(process.env.PERF_ENTRIES_EACH ?? 20);

function buildLedger() {
  const customers = [];
  const entries = [];
  const first = ["Ravi", "Sunita", "Prakash", "Meena", "Arjun", "Fatima", "Venkat", "Kavitha", "Imran", "Lakshmi"];
  const last = ["Kumar", "Devi", "Rao", "Sharma", "Reddy", "Begum", "Naidu", "Iyer", "Shaikh", "Patel"];
  for (let i = 0; i < CUSTOMERS; i++) {
    const phone = String(6000000000 + i * 7919);
    customers.push({ name: `${first[i % 10]} ${last[(i * 3) % 10]} ${i}`, phone });
    for (let j = 0; j < ENTRIES_EACH; j++) {
      const day = 1 + ((i + j) % 28);
      entries.push({
        phone,
        type: j % 3 === 2 ? "payment" : "credit",
        amount: 50 + ((i * 13 + j * 29) % 950),
        date: `2026-${String(1 + ((i + j) % 10)).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
        note: j % 2 ? "groceries" : "",
      });
    }
  }
  return { shop: "Perf Test Store", customers, entries };
}

const ledger = buildLedger();
const payload = JSON.stringify(ledger);
console.log(`Ledger: ${ledger.customers.length} customers, ${ledger.entries.length} entries, ${(payload.length / 1024 / 1024).toFixed(2)} MB of JSON`);

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
const results = [];
const record = (name, ms, budget) => {
  results.push({ name, ms: Math.round(ms), budget, ok: ms <= budget });
  console.log(`${ms <= budget ? "PASS" : "FAIL"}  ${name.padEnd(42)} ${String(Math.round(ms)).padStart(6)} ms   (budget ${budget} ms)`);
};

await page.goto(`${BASE}/?today=2026-11-15`);
await page.waitForSelector("#total-outstanding");

// Import
await page.evaluate((text) => {
  const box = document.querySelector("#import-box");
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
  setter.call(box, text);
  box.dispatchEvent(new Event("input", { bubbles: true }));
}, payload);
let t = Date.now();
await page.click("#import-go");
await page.waitForSelector('[data-import-result="ok"]', { timeout: 180_000 });
record("Import, paste to confirmation", Date.now() - t, 30_000);

const rows = await page.locator("[data-customer]").count();
const total = await page.locator("#total-outstanding").textContent();
console.log(`       rows rendered: ${rows}, total: ${total.trim()}`);

// Cold load of a big ledger
t = Date.now();
await page.reload();
await page.waitForSelector("[data-customer]");
record("Reload to first customer row", Date.now() - t, 5_000);

// Search responsiveness
t = Date.now();
await page.fill("#customer-search", "Kavitha Patel 7");
await page.waitForFunction((n) => document.querySelectorAll("[data-customer]").length < n, rows, { timeout: 20_000 });
record("Search keystroke to filtered list", Date.now() - t, 1_500);
await page.fill("#customer-search", "");

// Sorting by highest dues
t = Date.now();
await page.selectOption("#customer-sort", "due");
await page.waitForTimeout(0);
await page.locator("[data-customer]").first().waitFor();
record("Re-sort by highest dues", Date.now() - t, 2_000);

// Opening a customer with a long history
t = Date.now();
await page.locator("[data-customer] button").first().click();
await page.waitForSelector("[role=dialog]");
record("Open customer detail", Date.now() - t, 1_500);
await page.click("[role=dialog] button[aria-label=Close]");

// Ageing across the whole book
t = Date.now();
await page.click("[data-open-ageing]");
await page.waitForSelector("[data-ageing-total]");
record("Dues by age across the whole book", Date.now() - t, 3_000);

const bands = await page.locator("[data-band]").allTextContents();
const ageingTotal = await page.locator("[data-ageing-total]").textContent();
const digits = (s) => Number((s ?? "").replace(/[^\d]/g, ""));
console.log(`       ageing total ${ageingTotal.trim()} vs #total-outstanding ${total.trim()} — ${digits(ageingTotal) === digits(total) ? "match" : "MISMATCH"}`);
console.log(`       bands: ${bands.map((b) => b.replace(/\s+/g, " ").trim()).join(" | ")}`);

await browser.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length} of ${results.length} within budget`);
process.exit(failed.length === 0 ? 0 : 1);
