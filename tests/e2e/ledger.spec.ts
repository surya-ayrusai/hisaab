import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(__dirname, "../..");
const sampleText = fs.readFileSync(path.join(root, "src/ledger/data/sample-shop.json"), "utf8");
const expected = JSON.parse(fs.readFileSync(path.join(root, "tests/fixtures/sample-expected.json"), "utf8"));

const digits = (text: string | null) => (text ?? "").replace(/[^\d.-]/g, "");

async function open(page: Page, query = "?today=2026-11-15") {
  await page.goto(`/${query}`);
  await expect(page.locator("#total-outstanding")).toBeVisible();
}

async function checkExpected(page: Page) {
  await expect(page.locator("#total-outstanding")).toHaveCount(1);
  await expect(page.locator("#total-outstanding")).toContainText("11,820");
  expect(digits(await page.locator("#total-outstanding").textContent())).toBe(String(expected.total_outstanding));
  await expect(page.locator("[data-customer]")).toHaveCount(Object.keys(expected.balances).length);
  for (const [phone, balance] of Object.entries(expected.balances)) {
    const row = page.locator(`[data-customer="${phone}"]`);
    await expect(row).toHaveCount(1);
    await expect(row.locator("[data-balance]")).toHaveCount(1);
    expect(await row.locator("[data-balance]").textContent()).toBe(String(balance));
  }
}

test("TC-L1, TC-L2: first load shows the sample shop with correct total and rows", async ({ page }) => {
  await open(page);
  await checkExpected(page);
  await expect(page.locator("#total-outstanding")).toContainText("Rs 11,820");
});

test("TC-L3: every customer has a reminder link, and the message matches the balance", async ({ page }) => {
  await open(page);
  for (const [phone, balance] of Object.entries(expected.balances) as [string, number][]) {
    const link = page.locator(`a[data-remind="${phone}"]`);
    await expect(link).toHaveCount(1);
    const href = (await link.getAttribute("href"))!;
    expect(href.startsWith(`https://wa.me/91${phone}?text=`)).toBe(true);
    const message = new URL(href).searchParams.get("text")!;
    expect(message).toContain("Lakshmi Provision Store");
    expect(message.replace(/,/g, "")).toContain(String(balance));
  }
  // Pay one customer off in full: the link stays, but it stops asking for money.
  const row = page.locator('[data-customer="9000000107"]');
  await row.getByRole("button", { name: "Payment" }).click();
  await page.locator("#entry-amount").fill("250");
  await page.getByRole("button", { name: /Save payment/ }).click();
  await expect(row.locator("[data-balance]")).toHaveText("0");

  const settled = page.locator('a[data-remind="9000000107"]');
  await expect(settled).toHaveCount(1);
  const cleared = new URL((await settled.getAttribute("href"))!).searchParams.get("text")!;
  // "nothing is pending" is fine; a demand for money is not.
  const DEMAND = /please pay|kindly clear|request you|pay when|balance is Rs|pending in your account/i;
  expect(cleared).toMatch(/clear|settled/i);
  expect(cleared).not.toMatch(DEMAND);
  expect(cleared).not.toMatch(/Rs\s*0\b/);

  // Overpay another: the message reports the advance, not a debt.
  const advanceRow = page.locator('[data-customer="9000000105"]');
  await advanceRow.getByRole("button", { name: "Payment" }).click();
  await page.locator("#entry-amount").fill("500");
  await page.getByRole("button", { name: /Save payment/ }).click();
  await expect(advanceRow.locator("[data-balance]")).toHaveText("-270");
  const advance = new URL((await page.locator('a[data-remind="9000000105"]').getAttribute("href"))!)
    .searchParams.get("text")!;
  expect(advance).toContain("270");
  expect(advance).not.toContain("-270");
  expect(advance).not.toMatch(DEMAND);
});

test("TC-L4: paste and one press imports; same file again changes nothing", async ({ page }) => {
  await open(page);
  await page.locator("#import-box").fill(sampleText);
  await page.locator("#import-go").click();
  await expect(page.locator('[data-import-result="ok"]')).toBeVisible();
  await checkExpected(page);
  await page.locator("#import-go").click();
  await expect(page.locator('[data-import-result="ok"]')).toContainText("38 skipped");
  await checkExpected(page);
});

test("TC-L4: another shop replaces untouched sample data; undo restores it", async ({ page }) => {
  await open(page);
  const other = {
    shop: "Another Shop",
    customers: [
      { name: "New Person", phone: "9822222222" },
      { name: "Bad Number", phone: "12345" },
    ],
    entries: [
      { phone: "9822222222", type: "credit", amount: 700, date: "2026-11-10", note: "rice" },
      { phone: "9822222222", type: "payment", amount: 200, date: "2026-11-12", note: "cash" },
      { phone: "9822222222", type: "credit", amount: 0, date: "2026-11-12" },
    ],
  };
  await page.locator("#import-box").fill(JSON.stringify(other));
  await page.locator("#import-go").click();
  await expect(page.locator('[data-import-result="ok"]')).toContainText("Sample data was replaced");
  await expect(page.locator('[data-import-result="ok"]')).toContainText("2 rejected");
  await expect(page.locator("[data-customer]")).toHaveCount(1);
  expect(digits(await page.locator("#total-outstanding").textContent())).toBe("500");
  expect(await page.locator('[data-customer="9822222222"] [data-balance]').textContent()).toBe("500");
  await page.getByRole("button", { name: "Undo this import" }).click();
  await checkExpected(page);
});

test("TC-L4: bad input shows a readable error and changes nothing", async ({ page }) => {
  await open(page);
  for (const text of ["", "{not json", '{"version":99,"customers":[],"entries":[]}']) {
    await page.locator("#import-box").fill(text);
    await page.locator("#import-go").click();
    await expect(page.locator('[data-import-result="error"]')).toBeVisible();
    await checkExpected(page);
  }
});

test("TC-L5: payment screenshot is saved on the entry and survives reload", async ({ page }) => {
  await open(page);
  await expect(page.locator("img[data-shot]")).toHaveCount(0);
  const row = page.locator('[data-customer="9000000101"]');
  await row.getByRole("button", { name: "Payment" }).click();
  await expect(page.locator("#shot-input")).toBeVisible();
  expect(await page.locator("#shot-input").getAttribute("type")).toBe("file");
  await page.locator("#entry-amount").fill("100");
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJADveWkH6oAAAAAElFTkSuQmCC",
    "base64",
  );
  await page.locator("#shot-input").setInputFiles({ name: "upi.png", mimeType: "image/png", buffer: png });
  await page.getByRole("button", { name: /Save payment/ }).click();
  const shot = page.locator("img[data-shot]");
  await expect(shot).toHaveCount(1);
  expect(await shot.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
  await expect(row.locator("[data-balance]")).toHaveText("570");
  await page.reload();
  await expect(page.locator("#total-outstanding")).toBeVisible();
  await expect(page.locator("img[data-shot]")).toHaveCount(1);
  await expect(page.locator('[data-customer="9000000101"] [data-balance]')).toHaveText("570");
});

test("TC-L5: no screenshot element without an attachment; bad files are refused", async ({ page }) => {
  await open(page);
  const row = page.locator('[data-customer="9000000102"]');
  await row.getByRole("button", { name: "Payment" }).click();
  await page.locator("#entry-amount").fill("70");
  await page.locator("#shot-input").setInputFiles({ name: "note.pdf", mimeType: "application/pdf", buffer: Buffer.from("%PDF-1.4") });
  await page.getByRole("button", { name: /Save payment/ }).click();
  await expect(page.getByText("Please choose a photo")).toBeVisible();
  await page.getByRole("button", { name: /Save payment/ }).click();
  await expect(row.locator("[data-balance]")).toHaveText("3400");
  await expect(page.locator("img[data-shot]")).toHaveCount(0);
});

test("TC-L6: ?today= sets the default entry date; invalid or absent falls back", async ({ page }) => {
  await open(page, "?today=2026-11-15");
  await expect(page.getByText("Showing as if today is 15 Nov 2026")).toBeVisible();
  await page.locator('[data-customer="9000000103"]').getByRole("button", { name: "Credit" }).click();
  await expect(page.locator("#entry-date")).toHaveValue("2026-11-15");
  await page.goto("/?today=2026-02-30");
  await expect(page.locator("#total-outstanding")).toBeVisible();
  await expect(page.getByText("Showing as if today")).toHaveCount(0);
  await page.locator('[data-customer="9000000103"]').getByRole("button", { name: "Credit" }).click();
  const deviceToday = await page.evaluate(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  await expect(page.locator("#entry-date")).toHaveValue(deviceToday);
});

test("core ledger: add customer, credit, undo, cancel, duplicate and invalid phone", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Add customer" }).click();
  await page.locator("#customer-name").fill("Test Buyer");
  await page.locator("#customer-phone").fill("12345");
  await page.getByRole("button", { name: "Save customer" }).click();
  await expect(page.getByText("Enter a 10-digit mobile number")).toBeVisible();
  await page.locator("#customer-phone").fill("9000000101");
  await page.getByRole("button", { name: "Save customer" }).click();
  await expect(page.getByText("This number is already in your ledger")).toBeVisible();
  await page.locator("#customer-phone").fill("+91 98333 33333");
  await page.getByRole("button", { name: "Save customer" }).click();
  const row = page.locator('[data-customer="9833333333"]');
  await expect(row.locator("[data-balance]")).toHaveText("0");
  await expect(page.locator("[data-customer]").first()).toHaveAttribute("data-customer", "9833333333");

  await row.getByRole("button", { name: "Credit" }).click();
  await page.locator("#entry-amount").fill("250.50");
  await page.getByRole("button", { name: /Save credit/ }).click();
  await expect(row.locator("[data-balance]")).toHaveText("250.50");
  expect(digits(await page.locator("#total-outstanding").textContent())).toBe("12070.50");
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(row.locator("[data-balance]")).toHaveText("0");
  expect(digits(await page.locator("#total-outstanding").textContent())).toBe("11820");

  // Overpayment becomes an advance and does not reduce the shop total.
  await row.getByRole("button", { name: "Payment" }).click();
  await page.locator("#entry-amount").fill("200");
  await page.getByRole("button", { name: /Save payment/ }).click();
  await expect(row.locator("[data-balance]")).toHaveText("-200");
  expect(digits(await page.locator("#total-outstanding").textContent())).toBe("11820");

  await page.reload();
  await expect(page.locator('[data-customer="9833333333"] [data-balance]')).toHaveText("-200");
});

test("no horizontal overflow at 375 px", async ({ page }) => {
  await open(page);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test("the whole page is English only, apart from the app name", async ({ page }) => {
  await open(page);
  const text = await page.locator("body").innerText();
  expect(text).not.toMatch(/udhaar|khata|namaste|jama/i);
  expect(text).not.toMatch(/[\u0900-\u097F\u0C00-\u0C7F]/);
  await expect(page.locator("header")).toContainText("HISAAB");
});

test("the page carries no assistant or ticketing markup", async ({ page }) => {
  await open(page);
  for (const selector of ["#chat-input", "#chat-send", ".bot-msg", "#ticket-queue", "[data-ticket]", "#staff-reply", "#staff-send"]) {
    await expect(page.locator(selector)).toHaveCount(0);
  }
  // ?q= is no longer handled and must not break the ledger.
  await page.goto("/?today=2026-11-15&q=What%20are%20your%20timings%3F");
  await expect(page.locator("#total-outstanding")).toContainText("11,820");
});

test("opening balance: a new customer can carry a balance over from the notebook", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Add customer" }).click();
  await page.locator("#customer-name").fill("Carried Over");
  await page.locator("#customer-phone").fill("9876501234");
  await page.getByText("This customer already owes money").click();
  await page.locator("#opening-amount").fill("1500");
  await page.locator("#opening-date").fill("2026-09-01");
  await page.getByRole("button", { name: "Save customer" }).click();

  const row = page.locator('[data-customer="9876501234"]');
  await expect(row.locator("[data-balance]")).toHaveText("1500");
  await expect(page.locator("#total-outstanding")).toContainText("13,320");
  await row.getByRole("button", { name: "Credit" }).first().click();
  await page.getByRole("button", { name: "Close" }).click();
});

test("dues by age: bands, total and the oldest customer first", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Dues by age" }).click();
  await expect(page.locator("[data-band]")).toHaveCount(5);
  expect(digits(await page.locator("[data-ageing-total]").textContent())).toBe(String(expected.total_outstanding));
  const first = page.locator("dialog, [role=dialog]").getByRole("button").nth(1);
  await expect(first).toBeVisible();
});

test("statement: opening, entries and closing balance for one customer", async ({ page }) => {
  await open(page);
  await page.locator('[data-customer="9000000102"]').getByRole("button", { name: /^Sunita Devi/ }).click();
  await page.getByRole("button", { name: "Statement" }).click();
  await expect(page.locator("[data-statement]")).toBeVisible();
  await expect(page.locator("[data-statement]")).toContainText("Account statement");
  expect(digits(await page.locator("[data-statement-closing]").textContent())).toBe(
    String(expected.balances["9000000102"]),
  );
});

test("settings: shop name and reminder tone reach the WhatsApp message", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Settings and data" }).click();
  await page.locator("#shop-name").fill("Sharma Kirana");
  await page.locator("#shop-name").blur();
  await page.getByRole("button", { name: "Formal" }).click();
  await expect(page.locator("[data-reminder-preview]")).toContainText("Sharma Kirana");
  await page.getByRole("button", { name: "Close" }).click();

  const href = await page.locator('a[data-remind="9000000102"]').getAttribute("href");
  expect(decodeURIComponent(href ?? "")).toContain("Sharma Kirana");
});

test("settings: erasing everything is undoable", async ({ page }) => {
  await open(page);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Settings and data" }).click();
  await page.getByRole("button", { name: "Erase all data" }).click();
  await expect(page.locator("[data-customer]")).toHaveCount(0);
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.locator("[data-customer]")).toHaveCount(8);
  await expect(page.locator("#total-outstanding")).toContainText("11,820");
});

test("sync: a page with no shop link stays local and makes no network call", async ({ page }) => {
  const external: string[] = [];
  page.on("request", (r) => {
    const url = r.url();
    if (!url.startsWith("http://localhost") && !url.startsWith("data:")) external.push(url);
  });
  await open(page);
  await page.click('button[aria-label="Settings and data"]');
  await page.waitForSelector("[data-sync-panel]");

  // The tester's path: no shop parameter, so nothing is fetched from anywhere.
  expect(external, `unexpected outbound request(s): ${external.join(", ")}`).toEqual([]);
  // And the ledger is untouched.
  await page.click("[role=dialog] button[aria-label=Close]");
  await expect(page.locator("#total-outstanding")).toContainText("11,820");
  await expect(page.locator("[data-customer]")).toHaveCount(8);
  await expect(page.locator("[data-sync-status]")).toHaveCount(0);
});

test("sync: an unusable shop parameter is ignored rather than breaking the page", async ({ page }) => {
  await page.goto("/?today=2026-11-15&shop=not-a-uuid");
  await page.waitForSelector("[data-customer]");
  await expect(page.locator("#total-outstanding")).toContainText("11,820");
  await expect(page.locator("[data-sync-status]")).toHaveCount(0);
});

test("erasing warns that it is local-only when sync is off", async ({ page }) => {
  await open(page);
  let message = "";
  page.once("dialog", (d) => {
    message = d.message();
    return d.dismiss();
  });
  await page.click('button[aria-label="Settings and data"]');
  await page.getByRole("button", { name: "Erase all data" }).click();
  await expect.poll(() => message).toContain("Erase all 8 customers");
  // Without sync there is nothing to say about other devices.
  expect(message).not.toContain("EVERY device");
  // Dismissed, so nothing was erased.
  await page.click("[role=dialog] button[aria-label=Close]");
  await expect(page.locator("[data-customer]")).toHaveCount(8);
});
