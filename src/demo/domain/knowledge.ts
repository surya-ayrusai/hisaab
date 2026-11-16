/** Staff-editable clinic information used by the assistant demo. */

import type { Lang } from "./language";

export const KNOWLEDGE_KEYS = ["timings", "address", "phone", "fees", "doctors", "services"] as const;
export type KnowledgeKey = (typeof KNOWLEDGE_KEYS)[number];

export type KnowledgeText = Record<Lang, string>;
export type KnowledgeMap = Record<KnowledgeKey, KnowledgeText>;

export const KNOWLEDGE_LABELS: Record<KnowledgeKey, string> = {
  timings: "Clinic timings",
  address: "Address",
  phone: "Phone number",
  fees: "Consultation fees",
  doctors: "Doctors",
  services: "Services",
};

export const CLINIC_NAME = "Sunrise Clinic";

export const DEFAULT_KNOWLEDGE: KnowledgeMap = {
  timings: {
    en: "Monday to Saturday, 9:00 am to 1:00 pm and 5:00 pm to 8:00 pm. Closed on Sunday.",
    hi: "सोमवार से शनिवार, सुबह 9:00 से दोपहर 1:00 और शाम 5:00 से रात 8:00 तक। रविवार को बंद।",
    te: "సోమవారం నుండి శనివారం వరకు, ఉదయం 9:00 నుండి మధ్యాహ్నం 1:00 వరకు మరియు సాయంత్రం 5:00 నుండి రాత్రి 8:00 వరకు. ఆదివారం సెలవు.",
  },
  address: {
    en: "Plot 12, Road No. 4, Banjara Hills, Hyderabad 500034.",
    hi: "प्लॉट 12, रोड नंबर 4, बंजारा हिल्स, हैदराबाद 500034।",
    te: "ప్లాట్ 12, రోడ్ నంబర్ 4, బంజారా హిల్స్, హైదరాబాద్ 500034.",
  },
  phone: {
    en: "040 2345 6789",
    hi: "040 2345 6789",
    te: "040 2345 6789",
  },
  fees: {
    en: "New patient consultation Rs 500. Follow-up within 15 days Rs 300.",
    hi: "नए मरीज़ का परामर्श 500 रुपये। 15 दिन के भीतर दोबारा दिखाने पर 300 रुपये।",
    te: "కొత్త రోగి సంప్రదింపు రూ. 500. 15 రోజులలోపు మళ్లీ చూపించుకుంటే రూ. 300.",
  },
  doctors: {
    en: "Dr. A. Rao (General Medicine) and Dr. S. Iyer (Paediatrics).",
    hi: "डॉ. ए. राव (जनरल मेडिसिन) और डॉ. एस. अय्यर (बाल रोग)।",
    te: "డా. ఎ. రావు (జనరల్ మెడిసిన్) మరియు డా. ఎస్. అయ్యర్ (పిల్లల వైద్యం).",
  },
  services: {
    en: "General consultation, child health check-up, blood tests and vaccination.",
    hi: "सामान्य परामर्श, बच्चों की जाँच, रक्त जाँच और टीकाकरण।",
    te: "సాధారణ సంప్రదింపు, పిల్లల ఆరోగ్య పరీక్ష, రక్త పరీక్షలు మరియు టీకాలు.",
  },
};

export interface QuickReplySeed {
  label: string;
  question: string;
}

export const DEFAULT_QUICK_REPLIES: QuickReplySeed[] = [
  { label: "Clinic timings", question: "What are your clinic timings?" },
  { label: "Address", question: "Where is the clinic located?" },
  { label: "Fees", question: "How much is the consultation fee?" },
  { label: "Book appointment", question: "I want an appointment tomorrow at 5 pm" },
];
