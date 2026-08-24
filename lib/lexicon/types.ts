import { isLanguageCode, type LanguageCode } from "@/lib/languages";
import type { VocabularyCategory, VocabularyItem } from "@/lib/types/app";

/* =========================================================
   One answer shape, whatever the question looked like

   Typing a word, speaking one, and photographing one are three ways of
   asking the same thing, and they used to produce three differently-shaped
   answers — which is why saving from a photo, from the deck and from the
   lookup sheet were three pieces of code that each decided, separately,
   what language the word was in.

   Everything now ends here. A LexiconResult is what the app knows about a
   piece of text: what language it is in, whether the reader already has it,
   and what the dictionary says. The two shells render it differently and
   agree about all of it.
   ========================================================= */

/**
 * How much text was asked about.
 *
 * Not a formatting detail — it changes what a useful answer is. A word gets
 * a headword and a gloss; a sentence gets a translation and, if there is one
 * worth keeping, a span singled out of it. Saving a whole sentence as
 * vocabulary is how a review deck fills with things nobody can review.
 */
export type LexiconQueryKind = "word" | "phrase" | "sentence";

/**
 * The span of a sentence worth keeping, singled out by the model.
 *
 * Offered, never taken: the reader chooses between saving this and saving
 * nothing. A phrase saved on the app's initiative is a card the reader did
 * not ask for and will meet again in review without recognising it.
 */
export type LexiconHighlight = {
  term: string;
  translation: string;
  partOfSpeech: string;
};

/**
 * What the dictionary — the model, the offline index, or the shared cache —
 * says about a query.
 *
 * The fields were called englishName / chineseName until the app learned
 * five languages, at which point they named the two languages the app no
 * longer necessarily worked in. `term` is the headword in whatever language
 * it turned out to be; `translation` is its gloss in the reader's support
 * language. Nothing in the name says which those are, which is the point —
 * `termLanguage` and `translationLanguage` say it instead.
 */
export type LexiconEntry = {
  term: string;
  translation: string;
  partOfSpeech: string;
  termExample: string;
  translationExample: string;
  confidence: "high" | "medium" | "low";
  category: VocabularyCategory;

  /**
   * Which language each side is in, as resolved for this answer.
   *
   * Optional only because rows written before the schema carried them still
   * exist in the shared cache. Everything produced today sets both, and a
   * saved word takes its permanent language from here.
   */
  termLanguage?: LanguageCode;
  translationLanguage?: LanguageCode;

  /**
   * The language the reader's own text was in.
   *
   * Not always `termLanguage`: a French learner who types 爸爸 is answered
   * with *papa*, so the headword is French and this is Chinese. Absent on
   * entries written before the field existed.
   */
  queryLanguage?: LanguageCode;

  /** Word, phrase, or sentence — see LexiconQueryKind. */
  kind?: LexiconQueryKind;

  /** Present only for sentences, and only when one span stands out. */
  highlight?: LexiconHighlight | null;

  /**
   * The lookup reached the offline dictionary and the word was not in it, so
   * there is no translation to show — `translation` is empty, as is the
   * example that would have quoted it.
   *
   * This exists because the alternative was worse: the offline path used to
   * fill that gap with the literal string "待確認" and build a sentence around
   * it, which read as an answer. It was spoken by the audio button, given
   * pinyin and zhuyin of its own, and saved into the learner's vocabulary as
   * the word's meaning. A flag lets every surface say "not yet" instead of
   * quietly inventing one.
   */
  translationUnavailable?: boolean;
};

/**
 * What the offline dictionary can answer on its own, with no model call.
 * Example sentences are absent by design: the offline index fabricates them,
 * so the UI shows a skeleton there until the real lookup lands.
 */
export type LexiconPreview = {
  term: string;
  translation: string;
  partOfSpeech: string;
  category: VocabularyCategory;
  /** Same meaning as on the full entry. */
  translationUnavailable?: boolean;
};

/** Where a query came from. Recorded so a save can say how the word arrived. */
export type LexiconInputMode = "type" | "voice" | "camera" | "image";

export type LexiconStatus =
  /** Nothing asked yet. */
  | "idle"
  /** Typed something, personal matches may already be showing. */
  | "typing"
  /** The dictionary is being consulted. */
  | "searching"
  /** An answer, personal or dictionary or both. */
  | "ready"
  /** Nothing could be reached and nothing local matched. */
  | "error";

/**
 * The language question, and how settled it is.
 *
 * Split out of the result because the UI acts on it directly: a settled
 * language is a flag beside the headword, an unsettled one is a row of
 * choices. See lib/lexicon/languageRouting.ts for how it is decided.
 */
export type LexiconLanguages = {
  /**
   * The language of the headword — the language a word saved from this
   * result will carry forever.
   *
   * Usually the language the reader typed in, but not always: a French
   * learner who looks up "mow" is shown, and keeps, *tondre*. See
   * lib/lexicon/orientation.ts.
   */
  sourceLanguage: LanguageCode;

  /**
   * The language the reader's own text was in.
   *
   * Equal to `sourceLanguage` except where the result was turned to put the
   * language being studied first. It exists because "change language" is a
   * correction about the text they typed, not about the headword they were
   * shown — pinning the headword's language would answer a question nobody
   * asked.
   */
  queryLanguage: LanguageCode;
  /** The language it is glossed in. Never equal to sourceLanguage. */
  glossLanguage: LanguageCode;
  /** 0–1. 1 when the reader chose it outright. */
  confidence: number;
  /** True when the app should offer the choice rather than decide. */
  ambiguous: boolean;
  /** Languages worth offering, best first. */
  candidates: readonly LanguageCode[];
  /** True when the reader picked the language by hand for this query. */
  chosen: boolean;
};

/**
 * Everything the app knows about one query, in one object.
 *
 * `saved` is layer one — words already in the reader's own library, which is
 * a different and better answer than a dictionary entry, and the reason the
 * two are never merged into a single list.
 */
export type LexiconResult = {
  /** The query as typed, trimmed and space-collapsed but not case-folded. */
  query: string;
  kind: LexiconQueryKind;
  languages: LexiconLanguages;

  /** Layer 1 — the reader's own words. Empty is a normal answer. */
  saved: readonly VocabularyItem[];

  /** Layer 2 — the dictionary. Null while it is still being consulted. */
  entry: LexiconEntry | null;

  /**
   * Example sentences are the offline index's canned templates, or this is a
   * word the reader already had rather than a fresh lookup. Either way the
   * screen says so instead of passing it off as a normal answer.
   */
  degraded: boolean;

  /** No network was reachable; only the device could answer. */
  offline: boolean;
};

const CONFIDENCES = ["high", "medium", "low"];
const CATEGORIES = ["people", "objects", "actions", "other"];
const KINDS: readonly string[] = ["word", "phrase", "sentence"];

function isOptionalLanguage(value: unknown): boolean {
  return value === undefined || value === null || isLanguageCode(value);
}

/**
 * Shared by the model response parser and the shared lookup cache. Rows read
 * back from the cache are re-validated with this rather than trusted, so a
 * row written by an older result shape is discarded instead of served.
 */
export function isLexiconEntry(value: unknown): value is LexiconEntry {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Record<string, unknown>;
  const stringFields = [
    "term",
    "translation",
    "partOfSpeech",
    "termExample",
    "translationExample",
  ];

  return (
    stringFields.every(
      (field) =>
        typeof candidate[field] === "string" &&
        (candidate[field] as string).trim().length > 0,
    ) &&
    CONFIDENCES.includes(String(candidate.confidence)) &&
    CATEGORIES.includes(String(candidate.category)) &&
    (candidate.kind === undefined || KINDS.includes(String(candidate.kind))) &&
    /*
     * Optional, so absent passes — but present-and-wrong does not. A cached
     * row carrying "French" or "fr-FR" where a language code belongs would
     * otherwise be filed under a language that does not exist.
     */
    isOptionalLanguage(candidate.termLanguage) &&
    isOptionalLanguage(candidate.translationLanguage)
  );
}
