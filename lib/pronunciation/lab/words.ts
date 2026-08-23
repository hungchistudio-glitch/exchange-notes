import type { LanguageCode } from "@/lib/languages";
import { getPhonetics } from "@/lib/pronunciation";
import type { VocabularyItem } from "@/lib/types/app";

import { getWeaknessMap } from "./progress";
import type {
  PronunciationLanguagePack,
  PronunciationUnit,
  ProgressByUnit,
} from "./types";

/* =========================================================
   Vocabulary → Pronunciation

   The Lab does not own any words. It reads the ones already saved in
   Vocabulary, works out which sounds each of them exercises, and practises
   those. A word saved from Discover, from a photo, from a message or from a
   menu scan arrives here by the same route, because there is only one
   route.

   The matching is rule-based and entirely data-driven: a unit's spellings
   come from its own symbol and from the highlights its examples already
   carry, so a new language pack is matchable the moment it is written
   without a line of code here changing.
   ========================================================= */

export type WordTargetReason = "weak" | "difficult" | "new" | "recent";

export type VocabularyPronunciationTarget = {
  itemId: string;
  /** The word, in the language being learned. */
  text: string;
  /** What it means, in whichever other language the row carries. */
  meaning?: string;
  phonetic?: string;
  /** Units this word gives practice on. May be empty — see below. */
  unitIds: string[];
  reason: WordTargetReason;
};

/**
 * The spellings that signal a unit inside a word.
 *
 * Derived, not authored twice. `symbol` covers the common case where the
 * unit is named after how it is written ("rr", "ñ", "gli"), the " · " form
 * covers units that carry two spellings of one sound ("ll · y"), and the
 * examples' highlights cover everything irregular — they were already
 * written to point at exactly this.
 *
 * Cased down and de-duplicated, longest first, so "rr" is tested before "r".
 */
export function spellingsForUnit(unit: PronunciationUnit): string[] {
  const found = new Set<string>();

  for (const part of unit.symbol.split("·")) {
    const trimmed = part.trim().toLocaleLowerCase();
    if (trimmed) found.add(trimmed);
  }

  if (unit.nativeRepresentation) {
    found.add(unit.nativeRepresentation.trim().toLocaleLowerCase());
  }

  for (const example of unit.examples) {
    const highlight = example.highlight?.trim().toLocaleLowerCase();
    if (highlight) found.add(highlight);
  }

  return [...found].sort((a, b) => b.length - a.length);
}

const spellingCache = new WeakMap<PronunciationUnit, string[]>();

function cachedSpellings(unit: PronunciationUnit): string[] {
  const cached = spellingCache.get(unit);
  if (cached) return cached;

  const spellings = spellingsForUnit(unit);
  spellingCache.set(unit, spellings);
  return spellings;
}

/**
 * Which units a word gives practice on.
 *
 * Matched against both the written word and its phonetic spelling, because
 * for some languages the sounds are not in the writing at all — a Chinese
 * word is Hanzi and the units are zhuyin, so the zhuyin has to be computed
 * before there is anything to match. Callers pass it in; this stays pure.
 *
 * Returns an empty array rather than a guess when nothing matches. A word
 * with no recognised sounds is still worth saying out loud, and the Words
 * module offers it without claiming it drills anything in particular.
 */
export function unitsForWord(
  pack: PronunciationLanguagePack,
  text: string,
  phonetic?: string,
): string[] {
  const haystack = `${text} ${phonetic ?? ""}`.toLocaleLowerCase();
  if (!haystack.trim()) return [];

  // Groups that index the writing system rather than the sound inventory
  // are skipped — see `matchesWords` on PronunciationCategoryGroup.
  const excluded = new Set(
    pack.categories
      .filter((category) => category.matchesWords === false)
      .map((category) => category.id),
  );

  const matched: string[] = [];

  for (const unit of pack.units) {
    if (excluded.has(unit.group)) continue;

    if (cachedSpellings(unit).some((spelling) => haystack.includes(spelling))) {
      matched.push(unit.id);
    }
  }

  return matched;
}

/**
 * The word itself, in the language being learned.
 *
 * `texts` is the honest answer — one concept in every language it is known
 * in — and the word/translation pair is what rows written before that
 * carry. Returns null when the row simply has nothing in this language,
 * which is a real state for a word saved while studying something else.
 */
export function textInLanguage(
  item: VocabularyItem,
  language: LanguageCode,
): string | null {
  const fromTexts = item.texts?.[language]?.trim();
  if (fromTexts) return fromTexts;

  if (item.word_language === language && item.word.trim()) return item.word;
  if (item.translation_language === language && item.translation.trim()) {
    return item.translation;
  }

  return null;
}

/** Whatever the row says this word means, in some other language. */
function meaningOutsideLanguage(
  item: VocabularyItem,
  language: LanguageCode,
): string | undefined {
  for (const [code, text] of Object.entries(item.texts ?? {})) {
    if (code !== language && text?.trim()) return text;
  }

  if (item.translation_language !== language && item.translation?.trim()) {
    return item.translation;
  }
  if (item.word_language !== language && item.word?.trim()) {
    return item.word;
  }

  return undefined;
}

const RECENT_WINDOW_MS = 7 * 86_400_000;

function reasonFor(
  item: VocabularyItem,
  matchedUnits: string[],
  weakUnitIds: Set<string>,
  now: number,
): WordTargetReason | null {
  if (matchedUnits.some((unitId) => weakUnitIds.has(unitId))) return "weak";

  if ((item.review_lapses ?? 0) >= 2 || item.difficulty === "hard") {
    return "difficult";
  }
  if (item.status === "new") return "new";

  const created = new Date(item.created_at).getTime();
  if (!Number.isNaN(created) && now - created <= RECENT_WINDOW_MS) {
    return "recent";
  }

  return null;
}

const REASON_PRIORITY: Record<WordTargetReason, number> = {
  weak: 0,
  difficult: 1,
  new: 2,
  recent: 3,
};

/**
 * A saved word, with the work that does not depend on progress already done.
 *
 * Split out because it is the expensive half: computing the phonetic
 * spelling of a Chinese word runs a conversion per word, and a full library
 * is hundreds of them. Ranking, by contrast, changes on every single
 * attempt. Folded together, every answer re-derived the zhuyin for the
 * entire library — so they are two functions, and the caller memoises them
 * on different keys.
 */
export type AnnotatedWord = {
  item: VocabularyItem;
  text: string;
  meaning?: string;
  phonetic?: string;
  unitIds: string[];
};

export function annotateVocabulary(
  pack: PronunciationLanguagePack,
  items: VocabularyItem[],
): AnnotatedWord[] {
  const language = pack.language;
  const annotated: AnnotatedWord[] = [];

  for (const item of items) {
    const text = textInLanguage(item, language);
    if (!text) continue;

    const phonetic = getPhonetics(text, language).zhuyin;

    annotated.push({
      item,
      text,
      meaning: meaningOutsideLanguage(item, language),
      phonetic,
      unitIds: unitsForWord(pack, text, phonetic),
    });
  }

  return annotated;
}

/**
 * Which of the annotated words are worth saying out loud, best first.
 *
 * Ordered by why they were chosen rather than by when they were saved: a
 * word containing a sound you keep missing is a better use of two minutes
 * than a word you happened to add this morning.
 */
export function rankPronunciationWords(
  pack: PronunciationLanguagePack,
  annotated: AnnotatedWord[],
  progress: ProgressByUnit,
  options: { limit?: number; now?: Date } = {},
): VocabularyPronunciationTarget[] {
  const { limit = 12, now = new Date() } = options;

  const weakUnitIds = new Set(
    getWeaknessMap(pack, progress)
      .filter((entry) => entry.band === "needsWork")
      .map((entry) => entry.unit.id),
  );

  const targets: VocabularyPronunciationTarget[] = [];

  for (const word of annotated) {
    const reason = reasonFor(
      word.item,
      word.unitIds,
      weakUnitIds,
      now.getTime(),
    );
    if (!reason) continue;

    targets.push({
      itemId: word.item.id,
      text: word.text,
      meaning: word.meaning,
      phonetic: word.phonetic,
      unitIds: word.unitIds,
      reason,
    });
  }

  return targets
    .sort((a, b) => REASON_PRIORITY[a.reason] - REASON_PRIORITY[b.reason])
    .slice(0, limit);
}

/** Both halves, for callers with nothing to memoise between them. */
export function selectPronunciationWords(
  pack: PronunciationLanguagePack,
  items: VocabularyItem[],
  progress: ProgressByUnit,
  options: { limit?: number; now?: Date } = {},
): VocabularyPronunciationTarget[] {
  return rankPronunciationWords(
    pack,
    annotateVocabulary(pack, items),
    progress,
    options,
  );
}

/**
 * How many of the learner's words this language has at all.
 *
 * Asked separately from the selection above so an empty Words module can
 * tell the difference between "you have no vocabulary in Spanish yet" and
 * "everything you have is already in good shape".
 */
export function countWordsInLanguage(
  items: VocabularyItem[],
  language: LanguageCode,
): number {
  return items.filter((item) => textInLanguage(item, language) !== null).length;
}
