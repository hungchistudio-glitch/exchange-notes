import {
  DEFAULT_LEARNING_PAIR,
  LANGUAGE_CODES,
  isLanguageCode,
  type LanguageCode,
} from "@/lib/languages";
import {
  DETECTION_CONFIDENCE_FLOOR,
  detectLanguage,
} from "@/lib/languageDetection";

/* =========================================================
   A saved word remembers the language it was born in

   The rule this module exists to enforce: a vocabulary row carries its own
   languages, and nothing about the reader's current settings may change
   them afterwards. Settings say what the *next* word defaults to. They have
   no opinion about a word saved last March.

   Everything that creates a vocabulary row goes through
   resolveLanguageIdentity — see lib/vocabulary/createEntry.ts — so there is
   one ordering of the evidence rather than one per entry point.
   ========================================================= */

/**
 * How a row's languages were arrived at.
 *
 * Kept because the answer to "why is this word filed as Spanish" is worth
 * having a year later: a value the reader chose, a value a model produced,
 * and a value a detector guessed are three different degrees of trust, and
 * only one of them should ever be quietly overwritten.
 */
export type LanguageMetadataSource =
  /** The pair in the reader's profile at the moment of saving. */
  | "user-settings"
  /** Stated outright by the flow — a shared card that names its languages. */
  | "explicit-selection"
  /** Structured metadata from a model response. */
  | "ai"
  /** Guessed from the text itself, because nothing else knew. */
  | "auto-detected"
  /** Derived by migration from a row written before this existed. */
  | "legacy-inferred"
  /** The reader corrected it. Outranks everything, and is never overwritten. */
  | "user-corrected";

const SOURCES: readonly LanguageMetadataSource[] = [
  "user-settings",
  "explicit-selection",
  "ai",
  "auto-detected",
  "legacy-inferred",
  "user-corrected",
];

export function isLanguageMetadataSource(
  value: unknown,
): value is LanguageMetadataSource {
  return (
    typeof value === "string" &&
    (SOURCES as readonly string[]).includes(value)
  );
}

/**
 * The two languages the reader had set when this word was saved.
 *
 * Stored alongside the row's own two languages rather than instead of them,
 * because they answer different questions. `termLanguage` is what this word
 * *is*; the pair is the situation it was met in — a French word saved while
 * studying French reads differently a year later from a French word saved
 * off a friend's message while studying Italian.
 */
export type LanguagePairAtCreation = {
  primary: LanguageCode;
  secondary: LanguageCode;
};

export type VocabularyLanguageIdentity = {
  /**
   * The language of the headword. The source of truth for the card's badge,
   * its filter bucket, its pronunciation and its speech voice — never the
   * reader's current learning language.
   */
  termLanguage: LanguageCode;

  /** The language of the gloss saved beside it. Always different. */
  translationLanguage: LanguageCode;

  pairAtCreation: LanguagePairAtCreation;

  source: LanguageMetadataSource;

  /**
   * How sure the app was, 0–1.
   *
   * 1 only when something stated the language rather than inferring it. A
   * detector's guess carries the detector's own number, unrounded and
   * unflattered — a confident-looking wrong value is worse than an honest
   * uncertain one, because only the second one ever gets asked about.
   */
  confidence: number;

  /**
   * Whether the reader should be offered a correction.
   *
   * Set when the languages were guessed and the guess was not good enough to
   * act on silently. Nothing blocks on it; it is a flag on the row, and the
   * card's own "Change language" action is how it gets cleared.
   */
  needsReview: boolean;

  /**
   * Languages worth offering if the reader is asked. Empty when nothing was
   * guessed, because there is nothing to offer alternatives to.
   */
  candidates: readonly LanguageCode[];
};

/** What a caller knows about a word it is about to save. */
export type LanguageIdentityRequest = {
  term: string;
  translation: string;

  /**
   * The pair in effect at creation, learning language first.
   *
   * Required from every caller. It is recorded on the row whichever way the
   * languages themselves are decided, and it is the fallback when nothing
   * else can answer.
   */
  pair: readonly [LanguageCode, LanguageCode];

  /**
   * Priority 1 — the flow names both sides outright.
   *
   * This is the ordinary case and it should stay the ordinary case: a word
   * saved from a French vocabulary flow is French, and asking a detector
   * about it is throwing away a certainty in order to re-derive a guess.
   */
  stated?: {
    term: LanguageCode;
    translation: LanguageCode;
    /**
     * "user-settings" when the languages are the reader's own pair,
     * "explicit-selection" when something stated them — a shared word card,
     * a language the reader picked in a menu.
     */
    source?: Extract<
      LanguageMetadataSource,
      "user-settings" | "explicit-selection"
    >;
  } | null;

  /**
   * Priority 2 — structured language metadata from a model, unvalidated.
   *
   * Taken as unknown on purpose: this arrives over the wire from a model
   * that was asked nicely, and "fr " or "French" or null are all things that
   * come back. Anything that is not a language code is simply not evidence.
   */
  ai?: {
    termLanguage?: unknown;
    translationLanguage?: unknown;
    confidence?: unknown;
  } | null;
};

function readConfidence(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.min(1, Math.max(0, value));
}

/**
 * A different language from `language`, preferring the reader's own pair.
 *
 * The database refuses a row whose two sides are the same language, and it
 * is right to: a word and its translation in one language is not a pair, it
 * is the same text twice. Rather than fail the save, the gloss moves to
 * whichever language the reader actually reads.
 */
function otherLanguage(
  language: LanguageCode,
  pair: readonly [LanguageCode, LanguageCode],
): LanguageCode {
  return (
    pair.find((code) => code !== language) ??
    DEFAULT_LEARNING_PAIR.find((code) => code !== language) ??
    LANGUAGE_CODES.find((code) => code !== language) ??
    "en"
  );
}

function finish(
  termLanguage: LanguageCode,
  translationLanguage: LanguageCode,
  pair: readonly [LanguageCode, LanguageCode],
  source: LanguageMetadataSource,
  confidence: number,
  needsReview: boolean,
  candidates: readonly LanguageCode[] = [],
): VocabularyLanguageIdentity {
  const gloss =
    translationLanguage === termLanguage
      ? otherLanguage(termLanguage, pair)
      : translationLanguage;

  return {
    termLanguage,
    translationLanguage: gloss,
    pairAtCreation: { primary: pair[0], secondary: pair[1] },
    source,
    confidence,
    needsReview,
    candidates,
  };
}

/**
 * The languages a word about to be saved is in.
 *
 * Ordered so that certainty is never thrown away in favour of a guess:
 *
 *   1. what the flow states outright
 *   2. what the model reported, when it reported something usable
 *   3. what the text itself looks like
 *   4. the reader's pair, flagged for review
 *
 * Step 4 is not a guess dressed as an answer — it records that the row was
 * filed under the reader's pair without evidence, so the card can offer to
 * be corrected rather than pretending the question was settled.
 */
export function resolveLanguageIdentity(
  request: LanguageIdentityRequest,
): VocabularyLanguageIdentity {
  const { term, translation, pair, stated, ai } = request;

  /* ---------- 1. stated by the flow ---------- */

  if (stated && isLanguageCode(stated.term) && isLanguageCode(stated.translation)) {
    return finish(
      stated.term,
      stated.translation,
      pair,
      stated.source ?? "user-settings",
      1,
      false,
    );
  }

  /* ---------- 2. reported by a model ---------- */

  if (ai && isLanguageCode(ai.termLanguage)) {
    const reported = readConfidence(ai.confidence);

    /*
     * A model that names the language but not the gloss's language has still
     * answered the question that matters; the gloss falls back to the pair,
     * which is where the request asked for it in the first place.
     */
    const glossLanguage = isLanguageCode(ai.translationLanguage)
      ? ai.translationLanguage
      : otherLanguage(ai.termLanguage, pair);

    /*
     * No number from the model means "it said which language, and said
     * nothing about how sure it was". Left below 1 because only a statement
     * earns 1, and flagged for review when the model itself was unsure.
     */
    const confidence = reported ?? 0.9;

    return finish(
      ai.termLanguage,
      glossLanguage,
      pair,
      "ai",
      confidence,
      confidence < DETECTION_CONFIDENCE_FLOOR,
    );
  }

  /* ---------- 3. read off the text ---------- */

  const detected = detectLanguage(term);

  if (detected.language && !detected.ambiguous) {
    const glossDetection = detectLanguage(translation);

    const glossLanguage =
      glossDetection.language &&
      !glossDetection.ambiguous &&
      glossDetection.language !== detected.language
        ? glossDetection.language
        : otherLanguage(detected.language, pair);

    return finish(
      detected.language,
      glossLanguage,
      pair,
      "auto-detected",
      detected.confidence,
      false,
      detected.candidates,
    );
  }

  /* ---------- 4. the reader's pair, and say so ---------- */

  /*
   * The pair is the best available answer and a poor one: nothing about this
   * text supported it. Recorded as coming from the settings — because it did
   * — with the detector's own confidence, which is low or zero, and with the
   * review flag set so the card can ask.
   */
  return finish(
    pair[0],
    pair[1],
    pair,
    "user-settings",
    detected.confidence,
    true,
    detected.candidates,
  );
}

/**
 * The identity of a row the reader has just corrected.
 *
 * Only the languages change. Nothing touches the word, the translation, the
 * review schedule or the pair the row was created under — the correction
 * says the app read the language wrong, not that the reader saved a
 * different word.
 */
export function correctedLanguageIdentity(
  termLanguage: LanguageCode,
  current: Pick<
    VocabularyLanguageIdentity,
    "translationLanguage" | "pairAtCreation"
  >,
): Pick<
  VocabularyLanguageIdentity,
  "termLanguage" | "translationLanguage" | "source" | "confidence" | "needsReview"
> {
  const pair: readonly [LanguageCode, LanguageCode] = [
    current.pairAtCreation.primary,
    current.pairAtCreation.secondary,
  ];

  return {
    termLanguage,
    translationLanguage:
      current.translationLanguage === termLanguage
        ? otherLanguage(termLanguage, pair)
        : current.translationLanguage,
    source: "user-corrected",
    confidence: 1,
    needsReview: false,
  };
}

/**
 * Moves a row's own text from one language key to another.
 *
 * Correcting a language leaves the map disagreeing with the row: a word
 * filed as Spanish has its headword under `es`, and saying "this is
 * Italian" without moving it leaves "solo" claiming to be the Spanish for
 * itself — which the gloss picker will happily show beside the Italian.
 *
 * Anything already sitting under the destination is replaced rather than
 * kept. It was produced by the background fill on the strength of the
 * language that has just been declared wrong: for a row misread as Spanish,
 * `it` holds the Italian translation of a Spanish word that was never
 * Spanish. The reader's own text is the one that is certainly right.
 */
export function relabelLanguage<T>(
  map: Partial<Record<LanguageCode, T>> | undefined,
  from: LanguageCode,
  to: LanguageCode,
): Partial<Record<LanguageCode, T>> {
  const source = map ?? {};

  if (from === to) return { ...source };

  const rest = { ...source };
  const moved = rest[from];
  delete rest[from];

  if (moved === undefined) return rest;

  return { ...rest, [to]: moved };
}

/** Reads a stored pair-at-creation back, or null for a row that has none. */
export function readLanguagePairAtCreation(
  value: unknown,
): LanguagePairAtCreation | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as { primary?: unknown; secondary?: unknown };

  if (!isLanguageCode(candidate.primary)) return null;
  if (!isLanguageCode(candidate.secondary)) return null;

  return { primary: candidate.primary, secondary: candidate.secondary };
}
