/**
 * WhatsApp click-to-chat reminders. The link only opens WhatsApp with a
 * prefilled message; the shopkeeper decides whether to send it.
 */

import { formatIndianRupees } from "./money";
import { isValidPhone } from "./phone";

/** The app is English-only by owner decision (16 Nov 2026). */
export type ReminderLanguage = "en";
export type ReminderTone = "friendly" | "polite" | "formal";

/**
 * Three messages per tone, because a message is only honest if it matches what
 * the customer actually owes. Asking someone to clear Rs 0 reads as a mistake
 * and costs the shop trust, so a settled customer gets a thank-you and a
 * customer in credit is told what they have standing.
 */
type BalanceState = "due" | "clear" | "advance";

const TEMPLATES: Record<ReminderLanguage, Record<ReminderTone, Record<BalanceState, string>>> = {
  en: {
    friendly: {
      due: "Hi {name}, {shop} here. Just a reminder that Rs {amount} is pending in your account. Please pay when you can. Thanks!",
      clear: "Hi {name}, {shop} here. Your account is fully clear, nothing is pending. Thanks for paying on time!",
      advance: "Hi {name}, {shop} here. Your account is clear, and Rs {amount} is standing in your favour. Thanks!",
    },
    polite: {
      due: "Hello {name}, this is a gentle reminder from {shop}. Your pending balance is Rs {amount}. Please pay when convenient. Thank you.",
      clear: "Hello {name}, this is {shop}. Your account is clear and nothing is pending. Thank you.",
      advance:
        "Hello {name}, this is {shop}. Nothing is pending, and an advance of Rs {amount} is standing in your favour. Thank you.",
    },
    formal: {
      due: "Dear {name}, as per our records at {shop}, an amount of Rs {amount} is outstanding. We request you to kindly clear it at the earliest. Thank you.",
      clear: "Dear {name}, as per our records at {shop}, your account is fully settled and no dues remain. Thank you.",
      advance:
        "Dear {name}, as per our records at {shop}, your account is fully settled and a credit of Rs {amount} stands in your favour. Thank you.",
    },
  },
};

function stateFor(balancePaise: number): BalanceState {
  if (balancePaise > 0) return "due";
  return balancePaise < 0 ? "advance" : "clear";
}

export interface ReminderInput {
  customerName: string;
  shopName: string;
  balancePaise: number;
  language?: ReminderLanguage;
  tone?: ReminderTone;
}

export function buildReminderMessage(input: ReminderInput): string {
  const template = TEMPLATES[input.language ?? "en"][input.tone ?? "polite"][stateFor(input.balancePaise)];
  return template
    .replaceAll("{name}", input.customerName.trim())
    .replaceAll("{shop}", input.shopName.trim())
    .replaceAll("{amount}", formatIndianRupees(Math.abs(input.balancePaise)));
}

/** True when the message will actually ask for money. */
export function isReminderEligible(phone: string, balancePaise: number): boolean {
  return isValidPhone(phone) && balancePaise > 0;
}

/**
 * https://wa.me/91<phone>?text=<encoded message>
 *
 * Every customer with a usable mobile number gets a link, so the shopkeeper can
 * always reach them; what changes with the balance is what the message says.
 * Returns null only when the number cannot receive WhatsApp at all.
 */
export function buildWhatsAppUrl(phone: string, input: ReminderInput): string | null {
  if (!isValidPhone(phone)) return null;
  return `https://wa.me/91${phone}?text=${encodeURIComponent(buildReminderMessage(input))}`;
}
