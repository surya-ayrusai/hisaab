import { expect, test, type Page } from "@playwright/test";

const ALLOWED_STATUSES = ["answered", "needs human", "urgent", "closed"];
const DEVANAGARI = /[ऀ-ॿ]/;
const TELUGU = /[ఀ-౿]/;

async function openAssistant(page: Page, query = "?today=2026-11-15") {
  await page.goto(`/${query}`);
  await expect(page.locator("#chat-input")).toBeVisible();
  await expect(page.locator("#ticket-queue")).toBeVisible();
}

async function ask(page: Page, question: string) {
  const before = await page.locator(".bot-msg").count();
  await page.locator("#chat-input").fill(question);
  await page.locator("#chat-send").click();
  await expect(page.locator(".bot-msg")).toHaveCount(before + 1);
}

test("TC-A1: the chat input and send button exist and both ways of sending work", async ({ page }) => {
  await openAssistant(page);
  await expect(page.locator("#chat-input")).toHaveCount(1);
  await expect(page.locator("#chat-send")).toHaveCount(1);
  await ask(page, "What are your clinic timings?");
  await page.locator("#chat-input").fill("Where is the clinic?");
  await page.locator("#chat-input").press("Enter");
  await expect(page.locator(".bot-msg")).toHaveCount(2);
  // An empty question is ignored rather than creating a blank reply.
  await page.locator("#chat-send").click();
  await expect(page.locator(".bot-msg")).toHaveCount(2);
});

test("TC-A2: the last .bot-msg in the page is the latest answer", async ({ page }) => {
  await openAssistant(page);
  await expect(page.locator(".bot-msg")).toHaveCount(0);
  await ask(page, "What are your clinic timings?");
  await expect(page.locator(".bot-msg").last()).toContainText("Monday to Saturday");
  await ask(page, "How much is the consultation fee?");
  await expect(page.locator(".bot-msg").last()).toContainText("Rs 500");
  // Ticket cards repeat the reply text, but must not carry the bot-msg class.
  await expect(page.locator(".bot-msg")).toHaveCount(2);
});

test("TC-A3: ?q= asks once on load and opens one ticket", async ({ page }) => {
  await openAssistant(page, "?today=2026-11-15&q=What%20are%20your%20clinic%20timings%3F");
  await expect(page.locator(".bot-msg")).toHaveCount(1);
  await expect(page.locator(".bot-msg").last()).toContainText("Monday to Saturday");
  await expect(page.locator("[data-ticket]")).toHaveCount(4);
  // The three seeded sample tickets are closed, needs human and urgent, so this is the only answered one.
  await expect(page.locator('[data-ticket][data-status="answered"]')).toHaveCount(1);
});

test("TC-A4: every ticket carries one of the four exact status values", async ({ page }) => {
  await openAssistant(page);
  const tickets = page.locator("#ticket-queue [data-ticket]");
  await expect(tickets).toHaveCount(3);
  for (const status of await tickets.evaluateAll((nodes) => nodes.map((n) => n.getAttribute("data-status")))) {
    expect(ALLOWED_STATUSES).toContain(status);
  }
  await ask(page, "Do you have parking for a lorry?");
  await expect(page.locator('[data-ticket][data-status="needs human"]')).toHaveCount(2);
  await ask(page, "chest pain, this is an emergency");
  await expect(page.locator('[data-ticket][data-status="urgent"]')).toHaveCount(2);
  const ids = await page.locator("[data-ticket]").evaluateAll((nodes) => nodes.map((n) => n.getAttribute("data-ticket")));
  expect(new Set(ids).size).toBe(ids.length);
});

test("TC-A5: each ticket's reply controls act on that ticket only", async ({ page }) => {
  await openAssistant(page);
  await ask(page, "I want an appointment tomorrow at 5 pm");
  await ask(page, "Do you have parking for a lorry?");
  const parking = page.locator("[data-ticket]").filter({ hasText: "parking for a lorry" });
  const booking = page.locator("[data-ticket]").filter({ hasText: "appointment tomorrow" });
  await expect(parking).toHaveAttribute("data-status", "needs human");
  await expect(booking).toHaveAttribute("data-status", "needs human");

  await expect(parking.locator("#staff-reply")).toHaveCount(1);
  await expect(parking.locator("#staff-send")).toHaveCount(1);
  await parking.locator("#staff-reply").fill("Yes, there is parking behind the building.");
  await parking.locator("#staff-send").click();

  await expect(parking).toHaveAttribute("data-status", "answered");
  await expect(parking).toContainText("Staff: Yes, there is parking behind the building.");
  await expect(booking).toHaveAttribute("data-status", "needs human");
  await expect(booking).not.toContainText("parking behind the building");

  await page.reload();
  await expect(page.locator("[data-ticket]").filter({ hasText: "parking for a lorry" })).toContainText(
    "Staff: Yes, there is parking behind the building.",
  );
});

test("TC-A6: the assistant makes no request to any other host, so it needs no key", async ({ page }) => {
  const foreign: string[] = [];
  page.on("request", (request) => {
    const host = new URL(request.url()).host;
    if (host !== "localhost:3100" && !host.startsWith("127.0.0.1")) foreign.push(request.url());
  });
  await openAssistant(page, "?today=2026-11-15&q=What%20are%20your%20fees%3F");
  await expect(page.locator(".bot-msg")).toHaveCount(1);
  await ask(page, "क्लिनिक का समय क्या है?");
  await ask(page, "I want an appointment tomorrow at 5 pm");
  await expect(page.locator(".bot-msg")).toHaveCount(3);
  expect(foreign).toEqual([]);
});

test("the assistant replies in Hindi and Telugu when asked in them", async ({ page }) => {
  await openAssistant(page);
  await ask(page, "क्लिनिक का समय क्या है?");
  const hindi = await page.locator(".bot-msg").last().innerText();
  expect(DEVANAGARI.test(hindi)).toBe(true);
  await ask(page, "క్లినిక్ సమయం ఏమిటి?");
  const telugu = await page.locator(".bot-msg").last().innerText();
  expect(TELUGU.test(telugu)).toBe(true);
  await ask(page, "What are your clinic timings?");
  const english = await page.locator(".bot-msg").last().innerText();
  expect(DEVANAGARI.test(english) || TELUGU.test(english)).toBe(false);
});

test("a booking becomes a ticket with the requested date and time", async ({ page }) => {
  await openAssistant(page);
  await ask(page, "I want an appointment tomorrow at 5 pm");
  const ticket = page.locator("[data-ticket]").filter({ hasText: "appointment tomorrow" });
  await expect(ticket).toHaveAttribute("data-status", "needs human");
  await expect(ticket).toContainText("Requested: 2026-11-16 17:00");
  await expect(ticket).toContainText("normal priority");
  await expect(ticket).toContainText("just now");
  // A ticket that has been waiting shows its age instead.
  await expect(page.locator("[data-ticket]").filter({ hasText: "blood tests on Saturday" })).toContainText("2 days old");
});

test("a staff edit to the clinic information changes the next answer", async ({ page }) => {
  await openAssistant(page);
  await ask(page, "How much is the consultation fee?");
  await expect(page.locator(".bot-msg").last()).toContainText("Rs 500");
  await page.getByRole("button", { name: /Clinic information/ }).click();
  const field = page.locator('[data-knowledge-input="fees-en"]');
  await field.fill("New patient consultation Rs 750 from December.");
  await field.blur();
  await expect(page.locator("[data-knowledge-note]")).toContainText("version 2");
  await ask(page, "How much is the consultation fee?");
  await expect(page.locator(".bot-msg").last()).toContainText("Rs 750");
  await page.reload();
  await page.getByRole("button", { name: /Clinic information/ }).click();
  await expect(page.locator('[data-knowledge-input="fees-en"]')).toHaveValue(/Rs 750/);
});

test("a quick reply sends its question", async ({ page }) => {
  await openAssistant(page);
  await page.getByRole("button", { name: "Address" }).click();
  await expect(page.locator(".bot-msg")).toHaveCount(1);
  await expect(page.locator(".bot-msg").last()).toContainText("Banjara Hills");
});

test("closing a ticket sets the closed status and it survives a reload", async ({ page }) => {
  await openAssistant(page);
  await ask(page, "Do you have parking for a lorry?");
  const ticket = page.locator("[data-ticket]").filter({ hasText: "parking for a lorry" });
  await ticket.getByRole("button", { name: "Close" }).click();
  await expect(ticket).toHaveAttribute("data-status", "closed");
  await page.reload();
  await expect(page.locator("[data-ticket]").filter({ hasText: "parking for a lorry" })).toHaveAttribute(
    "data-status",
    "closed",
  );
});

test("the ledger and the assistant keep their data apart", async ({ page }) => {
  await openAssistant(page);
  await ask(page, "Do you have parking for a lorry?");
  await page.locator("#import-box").fill(
    JSON.stringify({
      shop: "Another Shop",
      customers: [{ name: "New Person", phone: "9822222222" }],
      entries: [{ phone: "9822222222", type: "credit", amount: 700, date: "2026-11-10", note: "rice" }],
    }),
  );
  await page.locator("#import-go").click();
  await expect(page.locator('[data-import-result="ok"]')).toBeVisible();
  await expect(page.locator("[data-customer]")).toHaveCount(1);
  // Replacing the ledger's sample data left the assistant's tickets untouched.
  await expect(page.locator("[data-ticket]")).toHaveCount(4);
  await expect(page.locator("[data-ticket]").filter({ hasText: "parking for a lorry" })).toHaveCount(1);
});
