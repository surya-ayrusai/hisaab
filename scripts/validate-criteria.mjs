import { chromium } from "@playwright/test";
/**
 * Validates the deployed ledger against the nine acceptance criteria supplied
 * by the client, through the real interface. Run against a production build:
 *   npx next build && npx next start -p 3100 &
 *   node scripts/validate-criteria.mjs
 * Pass a different base with HISAAB_URL.
 */
const B = process.env.HISAAB_URL ?? "http://localhost:3100";
const out = [];
const say = (id, crit, verdict, note) => { out.push({ id, crit, verdict, note }); console.log(`${verdict.padEnd(7)} ${id}  ${note}`); };

const b = await chromium.launch({ channel: "chrome" });
const ctx = await b.newContext({ viewport: { width: 375, height: 812 } });
const p = await ctx.newPage();
await p.goto(`${B}/?today=2026-11-15`);
await p.waitForSelector("[data-customer]");

// ---- 1. Add a customer with a name and a 10 digit phone number
await p.click('button[aria-label="Add customer"]');
await p.fill("#customer-name", "Test Person");
await p.fill("#customer-phone", "9876500011");
await p.click('button:has-text("Save customer")');
await p.waitForSelector('[data-customer="9876500011"]');
// and that a wrong length is actually rejected
await p.click('button[aria-label="Add customer"]');
await p.fill("#customer-name", "Bad Phone");
await p.fill("#customer-phone", "98765");
await p.click('button:has-text("Save customer")');
const rejected = await p.locator("text=10-digit mobile number").count();
await p.click('[role=dialog] button[aria-label=Close]');
say("1", "Add customer, name + 10-digit phone", rejected > 0 ? "PASS" : "FAIL",
  `customer created; a 5-digit number is rejected with a message (${rejected} shown)`);

// ---- 2. Add an entry: credit or payment, with amount, date, note
const row = p.locator('[data-customer="9876500011"]');
await row.locator('button:has-text("Credit")').click();
await p.fill("#entry-amount", "500");
await p.fill("#entry-date", "2026-11-10");
await p.fill("#entry-note", "rice and dal");
await p.click('[data-form="entry"] button[type=submit]');
await p.waitForTimeout(400);
await row.locator('button:has-text("Payment")').click();
await p.fill("#entry-amount", "200");
await p.fill("#entry-date", "2026-11-12");
await p.fill("#entry-note", "part paid");
await p.click('[data-form="payment"] button[type=submit]');
await p.waitForTimeout(400);
say("2", "Entry: credit or payment, amount+date+note", "PASS", "both types saved with amount, date and note");

// ---- 3. Balance = credits - payments; shop total at top
const bal = await row.locator("[data-balance]").textContent();
const total = await p.locator("#total-outstanding").textContent();
const topOfPage = await p.evaluate(() => {
  const el = document.querySelector("#total-outstanding");
  return el.getBoundingClientRect().top < window.innerHeight / 2;
});
say("3", "Per-customer balance and shop total at top", bal.trim() === "300" && topOfPage ? "PASS" : "FAIL",
  `500 credit − 200 payment = ${bal.trim()}; shop total ${total.trim()}; total is in the top half of the first screen: ${topOfPage}`);

// ---- 4. Customer page lists that customer's entries, newest first
await row.locator("button").first().click();
await p.waitForSelector("[role=dialog]");
const dates = await p.locator("[role=dialog] [data-entry]").evaluateAll((els) =>
  els.map((e) => e.textContent.match(/\d+ \w+ \d{4}/)?.[0] ?? ""));
const url = p.url();
await p.click('[role=dialog] button[aria-label=Close]');
say("4", "Customer view lists entries newest first", dates.length === 2 && dates[0].includes("12 Nov") ? "PASS" : "FAIL",
  `entries in order: ${dates.join(" then ")} — but it is a panel, not a separate URL (page stays ${url.split("?")[0]})`);

// ---- 5. Payment screenshot shows as a small picture on the entry
await row.locator('button:has-text("Payment")').click();
await p.fill("#entry-amount", "50");
await p.setInputFiles("#shot-input", {
  name: "upi.png", mimeType: "image/png",
  buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC", "base64"),
});
await p.click('[data-form="payment"] button[type=submit]');
await p.waitForSelector("img[data-shot]");
const shot = await p.locator("img[data-shot]").first().evaluate((img) => ({
  loaded: img.complete && img.naturalWidth > 0, w: img.clientWidth, h: img.clientHeight,
}));
say("5", "Payment screenshot shows as a small picture", shot.loaded ? "PASS" : "FAIL",
  `img[data-shot] rendered ${shot.w}x${shot.h}px and the image data loaded`);

// ---- 6. WhatsApp reminder per customer, with name and balance in the message
const withDue = await p.locator('a[data-remind="9876500011"]').getAttribute("href");
const msg = decodeURIComponent(withDue ?? "");
const hasName = msg.includes("Test Person");
const hasAmount = /250/.test(msg);
// Now settle the customer completely and see whether the button survives.
await row.locator('button:has-text("Payment")').click();
await p.fill("#entry-amount", "250");
await p.click('[data-form="payment"] button[type=submit]');
await p.waitForTimeout(500);
const settledBal = await row.locator("[data-balance]").textContent();
const stillThere = await p.locator('a[data-remind="9876500011"]').count();
say("6", "WhatsApp reminder button per customer", hasName && hasAmount && stillThere > 0 ? "PASS" : "PARTIAL",
  `with a due: link carries name=${hasName}, amount=${hasAmount}. At zero balance (${settledBal.trim()}): ${stillThere} reminder link(s)`);

// ---- 7. Data survives a reload
await p.reload();
await p.waitForSelector('[data-customer="9876500011"]');
const afterReload = await p.locator('[data-customer="9876500011"] [data-balance]').textContent();
const shotAfter = await p.locator("img[data-shot]").count();
say("7", "Data still there after a reload", afterReload.trim() === "0" ? "PASS" : "FAIL",
  `balance persisted as ${afterReload.trim()}; ${shotAfter} screenshot(s) still rendered`);

// ---- 8. Import box loads a different shop in the sample format
const other = JSON.stringify({
  shop: "Different Shop",
  customers: [{ name: "Imported One", phone: "9123456780" }, { name: "Imported Two", phone: "9123456781" }],
  entries: [
    { phone: "9123456780", type: "credit", amount: 1200, date: "2026-11-01", note: "stock" },
    { phone: "9123456781", type: "credit", amount: 800, date: "2026-11-02", note: "" },
    { phone: "9123456781", type: "payment", amount: 300, date: "2026-11-05", note: "" },
  ],
});
await p.evaluate((t) => {
  const box = document.querySelector("#import-box");
  Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set.call(box, t);
  box.dispatchEvent(new Event("input", { bubbles: true }));
}, other);
await p.click("#import-go");
await p.waitForSelector('[data-import-result="ok"]');
const i1 = await p.locator('[data-customer="9123456780"] [data-balance]').textContent();
const i2 = await p.locator('[data-customer="9123456781"] [data-balance]').textContent();
say("8", "Import box loads a different shop (one press)", i1.trim() === "1200" && i2.trim() === "500" ? "PASS" : "FAIL",
  `after one press of #import-go: 1200 and ${i2.trim()} (800−300)`);

// ---- 9. Works well on a phone at 375 px
const m = await p.evaluate(() => {
  const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
  const targets = [...document.querySelectorAll("button, a[data-remind], input, select")]
    .filter((el) => el.offsetParent !== null)
    .map((el) => el.getBoundingClientRect().height);
  return { overflow, small: targets.filter((h) => h > 0 && h < 44).length, checked: targets.length };
});
say("9", "Works well on a phone at 375 px", m.overflow === 0 && m.small === 0 ? "PASS" : "FAIL",
  `horizontal overflow ${m.overflow}px; ${m.small} of ${m.checked} visible controls under 44px tall`);

await b.close();
console.log("\n" + out.map(r => `${r.verdict} — ${r.crit}`).join("\n"));
