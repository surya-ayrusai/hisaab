/**
 * Language detection for the assistant demo.
 *
 * The HISAAB ledger interface is English only. The assistant is the one place
 * that answers in the language the visitor writes in, because the supplied
 * acceptance contract requires English, Hindi and Telugu replies.
 */

export type Lang = "en" | "hi" | "te";

const DEVANAGARI = /[ऀ-ॿ]/;
const TELUGU_SCRIPT = /[ఀ-౿]/;

/** Romanised words that are common in typed Hindi. */
const ROMAN_HI = [
  "kab", "kitna", "kitni", "kitne", "kaise", "kahan", "kahaan", "samay", "khulta", "khula", "band",
  "chahiye", "batao", "bataiye", "milna", "dikhana", "aaj", "kal", "subah", "shaam", "namaste",
  "namaskar", "kripya", "paisa", "fees kitni", "doctor hai", "ilaj", "bukhar", "dard", "hai kya",
];

/** Romanised words that are common in typed Telugu. */
const ROMAN_TE = [
  "ekkada", "enta", "eppudu", "ela", "samayam", "teruchu", "musivestaru", "kavali", "cheppandi",
  "vastanu", "repu", "ivala", "udayam", "sayantram", "namaskaram", "dayachesi", "unnara", "unnaru",
  "emiti", "kalavali", "chupinchali", "doctor unnara",
];

function countHits(text: string, words: readonly string[]): number {
  let hits = 0;
  for (const word of words) if (text.includes(word)) hits += 1;
  return hits;
}

/** Script wins when present; otherwise romanised words decide; English is the fallback. */
export function detectLanguage(input: string): Lang {
  if (TELUGU_SCRIPT.test(input)) return "te";
  if (DEVANAGARI.test(input)) return "hi";
  const text = ` ${input.toLowerCase()} `;
  const hi = countHits(text, ROMAN_HI);
  const te = countHits(text, ROMAN_TE);
  if (te > hi && te > 0) return "te";
  if (hi > 0) return "hi";
  return "en";
}
