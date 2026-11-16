/**
 * The assistant's answering engine. It is deterministic and local: no AI
 * provider, no network call, no key. The same question always gives the same
 * answer, so the with-key and without-key runs behave identically.
 */

import { daysBetween, isValidIsoDate } from "@/platform/dates";
import { detectLanguage, type Lang } from "./language";
import { CLINIC_NAME, type KnowledgeKey, type KnowledgeMap } from "./knowledge";

export type Intent = KnowledgeKey | "booking" | "emergency" | "greeting" | "human" | "unknown";

/** Exactly the four values the acceptance contract allows. */
export type TicketStatus = "answered" | "needs human" | "urgent" | "closed";
export type TicketPriority = "urgent" | "high" | "normal";

const KEYWORDS: Record<Exclude<Intent, "unknown">, readonly string[]> = {
  emergency: [
    "emergency", "urgent", "serious", "accident", "bleeding", "chest pain", "not breathing",
    "unconscious", "severe",
    "इमरजेंसी", "आपातकाल", "गंभीर", "खून", "सांस नहीं", "बेहोश",
    "అత్యవసరం", "ఎమర్జెన్సీ", "తీవ్ర", "రక్తం", "ఊపిరి ఆడటం లేదు", "స్పృహ",
  ],
  booking: [
    "appointment", "book", "booking", "slot", "schedule", "reserve", "want to see the doctor",
    "अपॉइंटमेंट", "अपाइंटमेंट", "बुक", "मिलना है", "दिखाना है", "समय लेना",
    "అపాయింట్", "బుక్", "కలవాలి", "చూపించాలి",
    "appointment chahiye", "kalavali", "chupinchali",
  ],
  timings: [
    "timing", "timings", "open", "opens", "close", "closes", "closed", "hours", "what time",
    "working hours", "are you available", "when are you available",
    "समय", "कब खुल", "कब बंद", "खुलता", "बंद होता",
    "సమయం", "ఎప్పుడు తెరుస్తారు", "ఎప్పుడు మూసి",
    "kab khulta", "kab band", "samay", "samayam", "eppudu",
  ],
  address: [
    "address", "where is", "where are you", "location", "located", "how to reach", "directions",
    "पता", "कहाँ", "कहां", "जगह",
    "చిరునామా", "ఎక్కడ", "ప్రదేశం",
    "kahan", "kahaan", "ekkada",
  ],
  phone: [
    "phone", "mobile number", "contact number", "contact you", "call you", "telephone",
    "फोन", "नंबर", "संपर्क",
    "ఫోన్", "నంబర్", "సంప్రదించ",
  ],
  fees: [
    "fee", "fees", "cost", "costs", "charge", "charges", "price", "how much", "consultation fee",
    "फीस", "शुल्क", "कितना", "कितने पैसे", "खर्च",
    "ఫీజు", "ఎంత", "ఖర్చు", "రుసుము",
    "fees kitni", "kitna lagta", "enta",
  ],
  doctors: [
    "doctor", "doctors", "specialist", "physician", "paediatric", "pediatric", "who sees",
    "डॉक्टर", "डाक्टर", "वैद्य",
    "డాక్టర్", "వైద్యుడు",
  ],
  services: [
    "service", "services", "test", "tests", "blood test", "vaccination", "vaccine", "check-up",
    "checkup", "treatment", "facility", "facilities",
    "सेवा", "जाँच", "जांच", "टीका", "इलाज",
    "సేవలు", "పరీక్ష", "టీకా", "చికిత్స",
  ],
  greeting: [
    "hello", "hi ", "hey", "good morning", "good evening", "good afternoon",
    "नमस्ते", "नमस्कार", "हैलो",
    "నమస్కారం", "హలో",
  ],
  human: [
    "staff", "human", "real person", "talk to someone", "speak to someone", "call me back",
    "स्टाफ", "किसी व्यक्ति", "बात करनी",
    "సిబ్బంది", "మనిషి", "మాట్లాడ",
  ],
};

/** Emergency and booking are checked first: they change what happens, not just the wording. */
const INTENT_ORDER: Exclude<Intent, "unknown">[] = [
  "emergency", "booking", "timings", "fees", "address", "phone", "doctors", "services", "human", "greeting",
];

export function detectIntent(question: string): Intent {
  const text = ` ${question.toLowerCase().trim()} `;
  for (const intent of INTENT_ORDER) {
    if (KEYWORDS[intent].some((word) => text.includes(word))) return intent;
  }
  return "unknown";
}

export interface RequestedWhen {
  date?: string;
  time?: string;
}

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/**
 * Word boundaries only work for Latin letters in JavaScript regular
 * expressions, so Devanagari and Telugu words are matched as plain substrings.
 */
const TOMORROW = { latin: /\b(tomorrow|kal|repu)\b/, script: ["\u0915\u0932", "\u0930\u0947\u092a\u0941"] };
const TODAY_WORDS = { latin: /\b(today|aaj|ivala)\b/, script: ["\u0906\u091c", "\u0908\u0930\u094b\u091c", "\u0c07\u0c35\u0c3e\u0c33"] };
const EVENING = { latin: /\b(evening|shaam|sayantram)\b/, script: ["\u0936\u093e\u092e", "\u0938\u093e\u092f\u0902", "\u0c38\u0c3e\u0c2f\u0c02\u0c24\u0c4d\u0c30"] };

function says(text: string, words: { latin: RegExp; script: readonly string[] }): boolean {
  return words.latin.test(text) || words.script.some((word) => text.includes(word));
}

function addDays(iso: string, days: number): string {
  const base = Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
  return new Date(base + days * 86_400_000).toISOString().slice(0, 10);
}

/** Pulls a date and a time out of a booking request, relative to the effective today. */
export function parseRequestedWhen(question: string, today: string): RequestedWhen {
  const text = question.toLowerCase();
  const out: RequestedWhen = {};

  const explicit = /(\d{4}-\d{2}-\d{2})/.exec(text);
  if (explicit && isValidIsoDate(explicit[1])) {
    out.date = explicit[1];
  } else if (says(text, TOMORROW)) {
    out.date = addDays(today, 1);
  } else if (says(text, TODAY_WORDS)) {
    out.date = today;
  } else {
    const weekday = WEEKDAYS.findIndex((day) => new RegExp(`\\b${day}\\b`).test(text));
    if (weekday >= 0) {
      const todayIndex = new Date(`${today}T00:00:00Z`).getUTCDay();
      const ahead = (weekday - todayIndex + 7) % 7 || 7;
      out.date = addDays(today, ahead);
    }
  }

  const clock = /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?/.exec(text);
  if (clock) {
    let hour = Number(clock[1]);
    const minute = clock[2] ?? "00";
    const marker = (clock[3] ?? "").replace(/\./g, "");
    const evening = says(text, EVENING);
    if (marker.startsWith("p") && hour < 12) hour += 12;
    else if (marker.startsWith("a") && hour === 12) hour = 0;
    else if (!marker && evening && hour < 12) hour += 12;
    if (hour <= 23 && Number(minute) <= 59 && /\b\d{1,2}\s*(:\d{2}|am|pm|a\.m\.|p\.m\.|o'clock|baje|बजे|గంటలకు)/.test(text)) {
      out.time = `${String(hour).padStart(2, "0")}:${minute}`;
    }
  }
  return out;
}

export interface Answer {
  intent: Intent;
  lang: Lang;
  text: string;
  status: Exclude<TicketStatus, "closed">;
  requested: RequestedWhen;
}

function describeWhen(when: RequestedWhen, lang: Lang): string {
  if (!when.date && !when.time) {
    return { en: " (no date or time given)", hi: " (तारीख़ या समय नहीं बताया गया)", te: " (తేదీ లేదా సమయం ఇవ్వలేదు)" }[lang];
  }
  const parts = [when.date, when.time].filter(Boolean).join(" ");
  return { en: ` for ${parts}`, hi: ` ${parts} के लिए`, te: ` ${parts} కోసం` }[lang];
}

const LEAD: Record<KnowledgeKey, Record<Lang, string>> = {
  timings: { en: "Our timings are:", hi: "हमारा समय है:", te: "మా సమయాలు:" },
  address: { en: "We are at:", hi: "हम यहाँ हैं:", te: "మేము ఇక్కడ ఉన్నాము:" },
  phone: { en: "You can call us on:", hi: "आप हमें यहाँ कॉल कर सकते हैं:", te: "మీరు మాకు ఇక్కడ కాల్ చేయవచ్చు:" },
  fees: { en: "Our consultation fees are:", hi: "हमारी परामर्श फीस है:", te: "మా సంప్రదింపు ఫీజు:" },
  doctors: { en: "Our doctors are:", hi: "हमारे डॉक्टर हैं:", te: "మా డాక్టర్లు:" },
  services: { en: "We offer:", hi: "हम ये सेवाएँ देते हैं:", te: "మేము అందించే సేవలు:" },
};

const TEMPLATES = {
  greeting: {
    en: `Hello, this is ${CLINIC_NAME}. You can ask about our timings, address, phone number, fees, doctors or services, or ask for an appointment.`,
    hi: `नमस्ते, यह ${CLINIC_NAME} है। आप हमारा समय, पता, फ़ोन नंबर, फीस, डॉक्टर या सेवाओं के बारे में पूछ सकते हैं, या अपॉइंटमेंट माँग सकते हैं।`,
    te: `నమస్కారం, ఇది ${CLINIC_NAME}. మీరు మా సమయాలు, చిరునామా, ఫోన్ నంబర్, ఫీజు, డాక్టర్లు లేదా సేవల గురించి అడగవచ్చు, లేదా అపాయింట్‌మెంట్ కోరవచ్చు.`,
  },
  booking: {
    en: "I have noted your appointment request{when}. Our staff will confirm it shortly. Your ticket number is {ticket}.",
    hi: "मैंने आपका अपॉइंटमेंट अनुरोध{when} दर्ज कर लिया है। हमारा स्टाफ जल्द ही इसकी पुष्टि करेगा। आपका टिकट नंबर {ticket} है।",
    te: "మీ అపాయింట్‌మెంట్ అభ్యర్థనను{when} నమోదు చేశాను. మా సిబ్బంది త్వరలో ధృవీకరిస్తారు. మీ టికెట్ నంబర్ {ticket}.",
  },
  emergency: {
    en: "If this is an emergency, please call us now on {phone} or go to the nearest hospital. I have marked your message as urgent for our staff. Your ticket number is {ticket}.",
    hi: "यदि यह आपात स्थिति है, तो कृपया अभी {phone} पर कॉल करें या नज़दीकी अस्पताल जाएँ। मैंने आपका संदेश स्टाफ के लिए अत्यावश्यक चिह्नित कर दिया है। आपका टिकट नंबर {ticket} है।",
    te: "ఇది అత్యవసరం అయితే, దయచేసి వెంటనే {phone} కు కాల్ చేయండి లేదా సమీప ఆసుపత్రికి వెళ్లండి. మీ సందేశాన్ని సిబ్బంది కోసం అత్యవసరంగా గుర్తించాను. మీ టికెట్ నంబర్ {ticket}.",
  },
  human: {
    en: "I have passed your message to our staff, who will reply here. Your ticket number is {ticket}. You can also call us on {phone}.",
    hi: "मैंने आपका संदेश हमारे स्टाफ को भेज दिया है, वे यहीं उत्तर देंगे। आपका टिकट नंबर {ticket} है। आप {phone} पर भी कॉल कर सकते हैं।",
    te: "మీ సందేశాన్ని మా సిబ్బందికి పంపాను, వారు ఇక్కడే సమాధానం ఇస్తారు. మీ టికెట్ నంబర్ {ticket}. మీరు {phone} కు కూడా కాల్ చేయవచ్చు.",
  },
  unknown: {
    en: "I am not sure about that one. I have passed your question to our staff, who will reply here. Your ticket number is {ticket}.",
    hi: "मुझे इसका ठीक उत्तर नहीं पता। मैंने आपका प्रश्न हमारे स्टाफ को भेज दिया है, वे यहीं उत्तर देंगे। आपका टिकट नंबर {ticket} है।",
    te: "దాని గురించి నాకు ఖచ్చితంగా తెలియదు. మీ ప్రశ్నను మా సిబ్బందికి పంపాను, వారు ఇక్కడే సమాధానం ఇస్తారు. మీ టికెట్ నంబర్ {ticket}.",
  },
} as const;

/**
 * Answers one question from the saved knowledge. The knowledge is passed in on
 * every call, so an answer always reflects the latest staff edit.
 */
export function answerQuestion(
  question: string,
  knowledge: KnowledgeMap,
  ticketNumber: number,
  today: string,
): Answer {
  const lang = detectLanguage(question);
  const intent = detectIntent(question);
  const requested = intent === "booking" ? parseRequestedWhen(question, today) : {};
  const fill = (template: string) =>
    template
      .replace("{ticket}", String(ticketNumber))
      .replace("{phone}", knowledge.phone[lang] || knowledge.phone.en)
      .replace("{when}", describeWhen(requested, lang));

  if (intent === "emergency") {
    return { intent, lang, text: fill(TEMPLATES.emergency[lang]), status: "urgent", requested };
  }
  if (intent === "booking") {
    return { intent, lang, text: fill(TEMPLATES.booking[lang]), status: "needs human", requested };
  }
  if (intent === "human") {
    return { intent, lang, text: fill(TEMPLATES.human[lang]), status: "needs human", requested };
  }
  if (intent === "greeting") {
    return { intent, lang, text: TEMPLATES.greeting[lang], status: "answered", requested };
  }
  if (intent === "unknown") {
    return { intent, lang, text: fill(TEMPLATES.unknown[lang]), status: "needs human", requested };
  }
  const value = knowledge[intent][lang]?.trim() || knowledge[intent].en;
  return { intent, lang, text: `${LEAD[intent][lang]} ${value}`, status: "answered", requested };
}

/** Priority follows the status, and a request waiting for a person rises with age. */
export function ticketPriority(status: TicketStatus, ageMinutes: number): TicketPriority {
  if (status === "urgent") return "urgent";
  if (status === "needs human") return ageMinutes >= 60 ? "high" : "normal";
  return "normal";
}

export function ticketAgeMinutes(createdAt: string, now: number): number {
  return Math.max(0, Math.floor((now - Date.parse(createdAt)) / 60_000));
}

export function formatAge(minutes: number): string {
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min old`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} old`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} old`;
}

/** Used by the queue summary so the staff see how long the oldest open request has waited. */
export function daysSince(dateIso: string, today: string): number {
  return daysBetween(dateIso, today);
}
