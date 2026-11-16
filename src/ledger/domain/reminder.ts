/**
 * WhatsApp click-to-chat reminders. The link only opens WhatsApp with a
 * prefilled message; the shopkeeper decides whether to send it.
 */

import { formatIndianRupees } from "./money";
import { isValidPhone } from "./phone";

export type ReminderLanguage = "en" | "hi" | "te";
export type ReminderTone = "friendly" | "polite" | "formal";

const TEMPLATES: Record<ReminderLanguage, Record<ReminderTone, string>> = {
  en: {
    friendly:
      "Hi {name}, {shop} here. Just a reminder that Rs {amount} is pending in your khata. Please pay when you can. Thanks!",
    polite:
      "Namaste {name}, this is a gentle reminder from {shop}. Your pending balance is Rs {amount}. Please pay when convenient. Thank you.",
    formal:
      "Dear {name}, as per our records at {shop}, an amount of Rs {amount} is outstanding. We request you to kindly clear it at the earliest. Thank you.",
  },
  hi: {
    friendly:
      "नमस्ते {name} जी, {shop} से याद दिला रहे हैं। आपके खाते में Rs {amount} बाकी हैं। जब हो सके भुगतान कर दीजिए। धन्यवाद!",
    polite:
      "नमस्ते {name} जी, {shop} की ओर से विनम्र निवेदन है। आपके खाते में Rs {amount} बाकी हैं। कृपया सुविधा अनुसार भुगतान करें। धन्यवाद।",
    formal:
      "आदरणीय {name} जी, {shop} के रिकॉर्ड के अनुसार आपके खाते में Rs {amount} बकाया है। कृपया शीघ्र भुगतान करने की कृपा करें। धन्यवाद।",
  },
  te: {
    friendly:
      "నమస్తే {name} గారు, {shop} నుండి గుర్తు చేస్తున్నాం. మీ ఖాతాలో Rs {amount} బాకీ ఉంది. వీలున్నప్పుడు చెల్లించండి. ధన్యవాదాలు!",
    polite:
      "నమస్తే {name} గారు, {shop} నుండి చిన్న గుర్తు. మీ ఖాతాలో Rs {amount} బాకీ ఉంది. దయచేసి వీలైనప్పుడు చెల్లించండి. ధన్యవాదాలు.",
    formal:
      "గౌరవనీయులైన {name} గారు, {shop} రికార్డుల ప్రకారం మీ ఖాతాలో Rs {amount} బకాయి ఉంది. దయచేసి త్వరగా చెల్లించవలసిందిగా కోరుతున్నాము. ధన్యవాదాలు.",
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
