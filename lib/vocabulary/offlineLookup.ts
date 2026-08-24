import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";

import { detectLanguage } from "@/lib/languageDetection";
import {
  resolveCardLanguages,
  type LanguageRoles,
} from "@/lib/lexicon/languageRouting";
import type { LexiconEntry } from "@/lib/lexicon/types";
import type { LanguageCode } from "@/lib/languages";
import type { VocabularyCategory } from "@/lib/types/app";

/* =========================================================
   The dictionary that is already on the disk

   CC-CEDICT, bundled, and it maps English to Chinese and back. That is all
   it does — it has never held a word of Spanish, French or Italian and it
   is not going to.

   Which is the whole reason this file now asks which languages it is being
   asked about. Before the app taught five languages, "the offline
   dictionary" and "the pair" were the same two languages and the question
   could not come up. Now a reader studying French can reach this path with
   the model unreachable, and the honest answer is "not this one" — stated,
   with the word echoed back, and with `translationUnavailable` set so every
   surface says so rather than filling the gap with something invented.
   ========================================================= */

const HAN_PATTERN = /\p{Script=Han}/u;
const INDEX_PATH = join(
  process.cwd(),
  "data",
  "cc-cedict-vocabulary-index.json.gz",
);

type OfflineTuple = [
  englishText: string,
  chineseText: string,
  partOfSpeech: string,
  category: VocabularyCategory,
];

type OfflineIndex = {
  version: number;
  chinese: Record<string, OfflineTuple>;
  english: Record<string, OfflineTuple>;
};

type DictionaryApiDefinition = {
  example?: string;
};

type DictionaryApiMeaning = {
  partOfSpeech?: string;
  definitions?: DictionaryApiDefinition[];
};

type DictionaryApiEntry = {
  word?: string;
  meanings?: DictionaryApiMeaning[];
};

/** What the caller already knows about which languages are in play. */
export type OfflineLookupContext = {
  /** The query's language, when something has decided it. */
  source?: LanguageCode | null;
  /** What the reader studies, reads, and grew up with. */
  roles: LanguageRoles;
};

let offlineIndex: OfflineIndex | null = null;

function normalizeLookupText(value: string) {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en-US");
}

function getOfflineIndex() {
  if (offlineIndex) return offlineIndex;

  const compressed = readFileSync(INDEX_PATH);
  const parsed = JSON.parse(gunzipSync(compressed).toString("utf8")) as OfflineIndex;

  if (
    parsed.version !== 1 ||
    typeof parsed.chinese !== "object" ||
    typeof parsed.english !== "object"
  ) {
    throw new Error("The offline vocabulary index has an unsupported format.");
  }

  offlineIndex = parsed;
  return parsed;
}

function normalizePartOfSpeech(value?: string) {
  const normalized = value?.trim().toLocaleLowerCase("en-US") ?? "";

  if (normalized.includes("verb")) return "verb";
  if (normalized.includes("adjective")) return "adjective";
  if (normalized.includes("noun")) return "noun";
  if (normalized.includes("phrase")) return "phrase";
  return "";
}

/**
 * Canned sentences, in the only two languages this file can write.
 *
 * They are templates and the response says so — `degraded` on the route,
 * which every surface turns into a visible note plus a retry. They exist
 * because a word with no sentence at all reads as a broken card, not because
 * anyone thinks they teach usage.
 */
function createExamples(englishText: string, chineseText: string) {
  return {
    termExample: `Today I learned the word “${englishText}”.`,
    translationExample: `我今天學會了「${chineseText}」這個詞。`,
  };
}

/** The two sides of an index row, put in the order the caller asked for. */
function entryFromTuple(
  tuple: OfflineTuple,
  source: LanguageCode,
  gloss: LanguageCode,
): LexiconEntry {
  const [englishText, chineseText, partOfSpeech, category] = tuple;

  const resolvedPartOfSpeech =
    partOfSpeech === "phrase" && !/\s/.test(englishText) ? "noun" : partOfSpeech;

  const chineseIsSource = source === "zh-TW";
  const examples = createExamples(englishText, chineseText);

  return {
    term: chineseIsSource ? chineseText : englishText,
    translation: chineseIsSource ? englishText : chineseText,
    partOfSpeech: resolvedPartOfSpeech,
    termExample: chineseIsSource
      ? examples.translationExample
      : examples.termExample,
    translationExample: chineseIsSource
      ? examples.termExample
      : examples.translationExample,
    confidence: "medium",
    category,
    termLanguage: source,
    translationLanguage: gloss,
    kind: "word",
    highlight: null,
  };
}

async function fetchEnglishDictionary(query: string) {
  try {
    const response = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(query)}`,
      { signal: AbortSignal.timeout(3500) },
    );

    if (!response.ok) return null;

    const entries = (await response.json()) as DictionaryApiEntry[];
    const entry = entries[0];
    const meaning = entry?.meanings?.find((candidate) => candidate.partOfSpeech);
    const example = meaning?.definitions?.find(
      (definition) => definition.example,
    )?.example;

    return {
      word: entry?.word?.trim() || query,
      partOfSpeech: meaning?.partOfSpeech,
      example: example?.trim(),
    };
  } catch {
    return null;
  }
}

/**
 * The word is not in the offline index and the model never answered, so the
 * only thing known is what the learner typed. That side is echoed back and the
 * other side is left empty for the UI to explain.
 *
 * This used to return "待確認" (or "Meaning to confirm" going the other way)
 * in the empty slot and wrap a sentence around it. Nothing downstream could
 * tell that apart from a real translation: it was read aloud, given its own
 * pinyin and zhuyin, and written into the learner's vocabulary as the meaning
 * of the word they had just looked up.
 */
function unresolvedEntry(
  query: string,
  source: LanguageCode,
  gloss: LanguageCode,
): LexiconEntry {
  return {
    term: query.slice(0, 240),
    translation: "",
    partOfSpeech: "other",
    termExample: "",
    translationExample: "",
    confidence: "low",
    category: "other",
    termLanguage: source,
    translationLanguage: gloss,
    kind: "word",
    highlight: null,
    translationUnavailable: true,
  };
}

/**
 * An English headword enriched from the free dictionary API.
 *
 * Runs whatever the gloss language is, because the part of speech and the
 * example sentence are facts about the English word rather than about the
 * pairing. Only the translation half depends on the index having Chinese for
 * it, and when it does not, that half stays empty rather than invented.
 */
async function lookupEnglish(
  query: string,
  tuple: OfflineTuple | undefined,
  gloss: LanguageCode,
): Promise<LexiconEntry | null> {
  const dictionaryEntry = await fetchEnglishDictionary(query);

  if (!dictionaryEntry && !tuple) return null;

  const chineseIsUsable = gloss === "zh-TW" && Boolean(tuple);

  const base = chineseIsUsable
    ? entryFromTuple(tuple as OfflineTuple, "en", gloss)
    : unresolvedEntry(query, "en", gloss);

  const term = (dictionaryEntry?.word || base.term).slice(0, 240);

  return {
    ...base,
    term,
    partOfSpeech:
      normalizePartOfSpeech(dictionaryEntry?.partOfSpeech) || base.partOfSpeech,
    termExample:
      dictionaryEntry?.example?.slice(0, 240) ||
      (base.translationUnavailable
        ? // Nothing to quote a translation against, and a generic English
          // sentence next to a blank meaning reads as a half-loaded answer.
          ""
        : createExamples(term, base.translation).termExample),
  };
}

/**
 * The best this device can do with no model.
 *
 * Always returns something — an entry that admits it has no translation is
 * still a usable answer, and the route needs a value to hand back.
 */
export async function lookupOffline(
  query: string,
  context: OfflineLookupContext,
): Promise<LexiconEntry> {
  const isChinese = HAN_PATTERN.test(query);

  const queryLanguage =
    context.source ??
    (isChinese
      ? "zh-TW"
      : (detectLanguage(query).language ?? context.roles.learning));

  /*
   * The same rule the model is given, applied where there is no model. It
   * decides which two languages the card holds — which for a reader looking
   * up a word in a language they already read is the language they study,
   * not the language they typed.
   */
  const { headLanguage: source, glossLanguage: gloss } = resolveCardLanguages(
    queryLanguage,
    context.roles,
  );

  /*
   * With no model, the only text on hand is what the reader typed. When the
   * rule asks for a headword in a language this index cannot produce, saying
   * so is the answer — inventing one is what the whole translationUnavailable
   * flag exists to prevent.
   */
  if (source !== queryLanguage) {
    return unresolvedEntry(query, queryLanguage, gloss);
  }

  const index = getOfflineIndex();

  if (source === "zh-TW") {
    const tuple = index.chinese[query];

    // The index's other side is English and only English. Glossing Chinese
    // into Italian is not something it can do, and saying so is the answer.
    return tuple && gloss === "en"
      ? entryFromTuple(tuple, source, gloss)
      : unresolvedEntry(query, source, gloss);
  }

  if (source !== "en") {
    // Spanish, French, Italian: nothing on this disk knows them.
    return unresolvedEntry(query, source, gloss);
  }

  const tuple = index.english[normalizeLookupText(query)];

  return (
    (await lookupEnglish(query, tuple, gloss)) ??
    unresolvedEntry(query, source, gloss)
  );
}
