import type { LanguageCode } from "@/lib/languages";

const CLUES: Record<Exclude<LanguageCode, "en" | "zh-TW">, readonly string[]> = {
  es: ["el", "la", "los", "las", "de", "que", "para", "con", "una", "por", "como", "pero", "porque", "gracias", "hola"],
  fr: ["le", "la", "les", "des", "une", "avec", "pour", "que", "est", "mais", "bonjour", "merci", "dans", "pas"],
  it: ["il", "lo", "la", "gli", "una", "che", "con", "per", "come", "ma", "grazie", "ciao", "non", "nel"],
};

const ACCENT_CLUES: Array<[RegExp, Exclude<LanguageCode, "en" | "zh-TW">]> = [
  [/[ñ¿¡]/iu, "es"],
  [/[œçàâêëîïôûùüÿ]/iu, "fr"],
  [/[ìò]/iu, "it"],
];

/** A fast deterministic suggestion; the composer always allows an override. */
export function detectNoteLanguage(text: string): LanguageCode {
  const value = text.trim();
  if (!value) return "en";
  if (/\p{Script=Han}/u.test(value)) return "zh-TW";

  for (const [pattern, language] of ACCENT_CLUES) {
    if (pattern.test(value)) return language;
  }

  const words = value
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z\s']/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  const scores = Object.entries(CLUES).map(([language, clues]) => ({
    language: language as Exclude<LanguageCode, "en" | "zh-TW">,
    score: words.reduce((total, word) => total + (clues.includes(word) ? 1 : 0), 0),
  }));
  scores.sort((a, b) => b.score - a.score);

  return scores[0]?.score >= 2 ? scores[0].language : "en";
}
