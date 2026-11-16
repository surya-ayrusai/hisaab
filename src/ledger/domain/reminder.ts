/**
 * WhatsApp click-to-chat reminders. The link only opens WhatsApp with a
 * prefilled message; the shopkeeper decides whether to send it.
 */

import { formatIndianRupees } from "./money";
import { isValidPhone } from "./phone";

/** The app is English-only by owner decision (16 Nov 2026). */
export type ReminderLanguage = "en";
export type ReminderTone = "friendly" | "polite" | "formal";

const TEMPLATES: Record<ReminderLanguage, Record<ReminderTone, string>> = {
  en: {
    friendly:
      "Hi {name}, {shop} here. Just a reminder that Rs {amount} is pending in your account. Please pay when you can. Thanks!",
    polite:
      "Hello {name}, this is a gentle reminder from {shop}. Your pending balance is Rs {amount}. Please pay when convenient. Thank you.",
    formal:
      "Dear {name}, as per our records at {shop}, an amount of Rs {amount} is outstanding. We request you to kindly clear it at the earliest. Thank you.",
  },
};

export interface ReminderInput {
  customerName: string;
  shopName: string;
  balancePaise: number;
  language?: ReminderLanguage;
  tone?: ReminderTone;
}

export function buildReminderMessage(input: ReminderInput): string {
  const template = TEMPLATES[input.language ?? "en"][input.tone ?? "polite"];
  return template
    .replaceAll("{name}", input.customerName.trim())
    .replaceAll("{shop}", input.shopName.trim())
    .replaceAll("{amount}", formatIndianRupees(input.balancePaise));
}

/** A reminder is offered only when the customer has a due. */
export function isReminderEligible(phone: string, balancePaise: number): boolean {
  return isValidPhone(phone) && balancePaise > 0;
}

/** https://wa.me/91<phone>?text=<encoded message>. Returns null when no reminder should be offered. */
export function buildWhatsAppUrl(phone: string, input: ReminderInput): string | null {
  if (!isReminderEligible(phone, input.balancePaise)) return null;
  return `https://wa.me/91${phone}?text=${encodeURIComponent(buildReminderMessage(input))}`;
}
