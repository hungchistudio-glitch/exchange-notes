import { readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";

import type { VocabularyLookupResult } from "@/lib/types/vocabularyLookup";

const HAN_PATTERN = /\p{Script=Han}/u;
const INDEX_PATH = join(
  process.cwd(),
  "data",
  "cc-cedict-vocabulary-index.json.gz",
);

type OfflineTuple = [
  englishName: string,
  chineseName: string,
  partOfSpeech: string,
  category: VocabularyLookupResult["category"],
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

function createExamples(englishName: string, chineseName: string) {
  return {
    englishExample: `Today I learned the word “${englishName}”.`,
    chineseExample: `我今天學會了「${chineseName}」這個詞。`,
  };
}

function resultFromTuple(tuple: OfflineTuple): VocabularyLookupResult {
  const [englishName, chineseName, partOfSpeech, category] = tuple;
  const resolvedPartOfSpeech =
    partOfSpeech === "phrase" && !/\s/.test(englishName)
      ? "noun"
      : partOfSpeech;

  return {
    englishName,
    chineseName,
    partOfSpeech: resolvedPartOfSpeech,
    ...createExamples(englishName, chineseName),
    confidence: "medium",
    category,
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

async function lookupEnglish(
  query: string,
  tuple: OfflineTuple | undefined,
): Promise<VocabularyLookupResult | null> {
  const dictionaryEntry = await fetchEnglishDictionary(query);

  if (!dictionaryEntry && !tuple) return null;

  // No tuple means the offline index has no Chinese for this word. The
  // dictionary API can still supply the part of speech and a real example, so
  // that half is kept — but the translation stays empty rather than invented.
  const base = tuple ? resultFromTuple(tuple) : createUnresolvedResult(query);

  const englishName = (dictionaryEntry?.word || base.englishName).slice(0, 80);

  return {
    ...base,
    englishName,
    partOfSpeech:
      normalizePartOfSpeech(dictionaryEntry?.partOfSpeech) ||
      base.partOfSpeech,
    englishExample:
      dictionaryEntry?.example?.slice(0, 200) ||
      (base.translationUnavailable
        ? // Nothing to quote a translation against, and a generic English
          // sentence next to a blank meaning reads as a half-loaded answer.
          ""
        : createExamples(englishName, base.chineseName).englishExample),
  };
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
function createUnresolvedResult(query: string): VocabularyLookupResult {
  const isChinese = HAN_PATTERN.test(query);
  const term = query.slice(0, 80);

  return {
    englishName: isChinese ? "" : term,
    chineseName: isChinese ? term : "",
    partOfSpeech: "other",
    englishExample: "",
    chineseExample: "",
    confidence: "low",
    category: "other",
    translationUnavailable: true,
  };
}

export async function lookupOffline(query: string): Promise<VocabularyLookupResult> {
  const index = getOfflineIndex();

  if (HAN_PATTERN.test(query)) {
    const tuple = index.chinese[query];
    return tuple ? resultFromTuple(tuple) : createUnresolvedResult(query);
  }

  const tuple = index.english[normalizeLookupText(query)];
  return (await lookupEnglish(query, tuple)) ?? createUnresolvedResult(query);
}