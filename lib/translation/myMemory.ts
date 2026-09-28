import type { LanguageCode } from "@/lib/languages";

/* =========================================================
   A translation that does not come from Gemini

   2026-09-28, from about 14:00 UTC: gemini-3.6-flash spent for the day, and
   every other Gemini and Gemma model this key can reach answering 503 "high
   demand" — the reserve added that afternoon included. Every word lookup
   fell back to the offline dictionary, which speaks English and Chinese
   only, so for a reader learning French, Spanish or Italian the app had no
   translations at all. Chi: "翻譯完全無法使用".

   MyMemory (Translated's public API) is a different company's service, so a
   Gemini peak is not its peak. It needs no account and no key. It gives a
   translation and nothing else — no example sentences, no IPA — so the card
   says it is a basic translation (Chi's choice) and the model's full answer
   replaces it on the next lookup once Gemini is back.

   Limits: about 5,000 characters a day anonymously, 50,000 with a contact
   email (MYMEMORY_EMAIL, optional — not set by default, since it sends that
   address to a third party). A word lookup is a few characters, so even the
   anonymous allowance is hundreds of lookups.
   ========================================================= */

const ENDPOINT = "https://api.mymemory.translated.net/get";
const TIMEOUT_MS = 4_000;

/** MyMemory's codes for the five languages the app teaches. */
const CODES: Record<LanguageCode, string> = {
  en: "en-GB",
  "zh-TW": "zh-TW",
  es: "es-ES",
  fr: "fr-FR",
  it: "it-IT",
};

const HAN = /\p{Script=Han}/u;

type MyMemoryResponse = {
  responseStatus?: number | string;
  quotaFinished?: boolean;
  responseData?: { translatedText?: string; match?: number };
  matches?: Array<{ translation?: string; match?: number | string; quality?: number | string }>;
};

function plausible(text: string, query: string, target: LanguageCode) {
  const trimmed = text.trim();
  if (!trimmed) return false;
  // The service writes its warnings where the translation would be.
  if (/MYMEMORY WARNING|INVALID LANGUAGE PAIR|QUERY LENGTH LIMIT/i.test(trimmed)) return false;
  // Chinese asked for and none given, or Chinese given for another language.
  if (target === "zh-TW" ? !HAN.test(trimmed) : HAN.test(trimmed)) return false;
  // The word handed back unchanged: "chaise" → "chaise" is not a translation.
  if (trimmed.toLocaleLowerCase() === query.trim().toLocaleLowerCase()) return false;
  return trimmed.length <= 240;
}

/** Keep the reader's own casing: "déjeuner", not "Dejeuner", for "早餐". */
function matchCase(text: string, query: string) {
  const first = query.trim().charAt(0);
  // A capitalised query is a name or a sentence; its answer keeps its case.
  if (first && first !== first.toLocaleLowerCase()) return text;
  return text.charAt(0).toLocaleLowerCase() + text.slice(1);
}

/**
 * `query` from one language into another, or null — for any reason: the
 * service unreachable, out of its daily allowance, or answering with
 * something that is not a translation. Never throws.
 */
export async function translateWithMyMemory(
  query: string,
  from: LanguageCode,
  to: LanguageCode,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  if (from === to || !query.trim() || query.length > 200) return null;

  const url = new URL(ENDPOINT);
  url.searchParams.set("q", query.trim());
  url.searchParams.set("langpair", `${CODES[from]}|${CODES[to]}`);
  const email = process.env.MYMEMORY_EMAIL?.trim();
  if (email) url.searchParams.set("de", email);

  try {
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) return null;

    const data = (await response.json()) as MyMemoryResponse;
    if (data.quotaFinished || Number(data.responseStatus) !== 200) return null;

    const candidates = [
      data.responseData?.translatedText ?? "",
      ...[...(data.matches ?? [])]
        .sort((a, b) => Number(b.match ?? 0) - Number(a.match ?? 0))
        .map((match) => match.translation ?? ""),
    ];

    const best = candidates.find((text) => plausible(text, query, to));
    return best ? matchCase(best.trim(), query) : null;
  } catch {
    return null;
  }
}

/**
 * The same, from the reader's browser rather than the server.
 *
 * Measured on production 2026-09-28 17:1x UTC: the server's requests came
 * back with nothing for four of five words that the same service answered
 * from a browser a minute earlier. The anonymous allowance is counted per
 * IP address, and a server shares its address with everything else on the
 * platform; a reader's phone has one of its own. So when the server's
 * answer still has no translation, the page asks directly.
 *
 * Tries the language the entry says the word is in, then the language
 * being studied — a short word like "ventana" is easily mistaken for
 * English — and keeps the first plausible answer.
 */
export async function basicTranslationInBrowser(
  entry: {
    term: string;
    termLanguage?: LanguageCode;
    queryLanguage?: LanguageCode;
    translationLanguage?: LanguageCode;
  },
  learning: LanguageCode,
  fetchImpl: typeof fetch = fetch,
): Promise<{ translation: string; termLanguage: LanguageCode } | null> {
  const target = entry.translationLanguage;
  if (!target || !entry.term.trim()) return null;

  const sources = [
    ...new Set(
      [entry.termLanguage ?? entry.queryLanguage, learning].filter(
        (language): language is LanguageCode => Boolean(language) && language !== target,
      ),
    ),
  ];

  for (const source of sources) {
    const translation = await translateWithMyMemory(entry.term, source, target, fetchImpl);
    if (translation) return { translation, termLanguage: source };
  }

  return null;
}
