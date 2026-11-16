import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/** The sample shop, at a fixed date so the banner and ages never drift. */
async function open(page: Page) {
  await page.goto("/?today=2026-11-15");
  await page.waitForSelector("[data-customer]");
}

async function violations(page: Page) {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  return result.violations.map((v) => `[${v.impact}] ${v.id}: ${v.nodes[0]?.html.slice(0, 120)}`);
}

test("home page has no accessibility violations", async ({ page }) => {
  await open(page);
  expect(await violations(page)).toEqual([]);
});

test("every sheet has no accessibility violations", async ({ page }) => {
  await open(page);

  await page.click('button[aria-label="Settings and data"]');
  await page.waitForSelector("#shop-name");
  expect(await violations(page), "settings").toEqual([]);
  await page.click("[role=dialog] button[aria-label=Close]");

  await page.click("[data-open-ageing]");
  await page.waitForSelector("[data-ageing-total]");
  expect(await violations(page), "dues by age").toEqual([]);
  await page.click("[role=dialog] button[aria-label=Close]");

  await page.click("[data-customer] button");
  await page.waitForSelector("[role=dialog]");
  expect(await violations(page), "customer detail").toEqual([]);

  await page.click('[role=dialog] button:has-text("Payment")');
  await page.waitForSelector("#shot-input");
  expect(await violations(page), "payment form").toEqual([]);
});

test("a sheet can be opened, filled and closed from the keyboard alone", async ({ page }) => {
  await open(page);
  await page.locator('button[aria-label="Settings and data"]').focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#shop-name")).toBeVisible();

  // Focus moves into the sheet, and Tab stays inside it.
  expect(await page.evaluate(() => Boolean(document.activeElement?.closest("[role=dialog]")))).toBe(true);
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(() => Boolean(document.activeElement?.closest("[role=dialog]"))),
      `focus escaped the sheet after ${i + 1} tabs`,
    ).toBe(true);
  }

  await page.keyboard.press("Escape");
  await expect(page.locator("[role=dialog]")).toHaveCount(0);
  // The keyboard goes back to the button that opened it.
  expect(await page.evaluate(() => document.activeElement?.getAttribute("aria-label"))).toBe("Settings and data");
});

test("an amount can be recorded without touching the mouse", async ({ page }) => {
  await open(page);
  const row = page.locator('[data-customer="9000000101"]');
  await row.getByRole("button", { name: "Payment" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#entry-amount")).toBeFocused();
  await page.keyboard.type("70");
  await page.locator('[data-form="payment"] button[type=submit]').focus();
  await page.keyboard.press("Enter");
  await expect(row.locator("[data-balance]")).toHaveText("600");
});
