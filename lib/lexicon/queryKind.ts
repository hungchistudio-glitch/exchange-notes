import { normalizeQuery } from "@/lib/lexicon/normalize";
import type { LexiconQueryKind } from "@/lib/lexicon/types";

/* =========================================================
   How much was asked

   The distinction is not cosmetic. A word gets a headword and a gloss and
   goes into the review deck; a sentence gets a translation and, at most, an
   offer to keep one span of it. Saving a sentence as a vocabulary card is
   how a deck fills up with things nobody can review — the front is a
   paragraph and the back is a paragraph and there is no fact being recalled.

   Counted in tokens rather than characters, and the tokeniser is
   script-aware, because Chinese does not put spaces between its words. A
   character count would call 修剪 a word and 我需要修剪草坪 a word too.
   ========================================================= */

/** Beyond this many tokens the text is prose, whatever it is punctuated like. */
const SENTENCE_TOKENS = 5;

/** Sentence-final punctuation in every script the app handles. */
const TERMINAL_PUNCTUATION = /[.!?。！？…]\s*$/u;

const HAN = /\p{Script=Han}/u;

/**
 * Roughly how many words a string holds.
 *
 * Han runs are counted at two characters per word, which is the average
 * length of a Chinese word and close enough for a threshold: 修剪 counts as
 * one, 我需要修剪草坪 counts as four, and nothing here needs to be a
 * segmenter to tell those apart. Intl.Segmenter would be exact and is not
 * available everywhere this runs, including the Node runtime the API route
 * uses on older deployments.
 */
export function countTokens(value: string): number {
  const text = normalizeQuery(value);
  if (!text) return 0;

  let tokens = 0;

  for (const part of text.split(/\s+/)) {
    if (!part) continue;

    const han = part.match(/\p{Script=Han}/gu)?.length ?? 0;
    const rest = part.replace(/\p{Script=Han}/gu, "").trim();

    tokens += Math.ceil(han / 2);
    if (rest) tokens += 1;
  }

  return tokens;
}

/**
 * Word, phrase, or sentence.
 *
 * Terminal punctuation is treated as the writer saying so outright — "Go." is
 * a sentence even though it is one word — because a reader who typed a full
 * stop was quoting something they read, not naming a word.
 */
export function classifyQueryKind(value: string): LexiconQueryKind {
  const text = normalizeQuery(value);

  if (!text) return "word";

  const tokens = countTokens(text);

  if (TERMINAL_PUNCTUATION.test(text) && tokens > 1) return "sentence";
  if (tokens > SENTENCE_TOKENS) return "sentence";
  if (tokens > 1) return "phrase";

  /*
   * One token, and Chinese can still make it a phrase: 割草 is two
   * characters and one idea, 沒有時間割草 is six characters and several. The
   * token count above already halves Han runs, so anything that reaches here
   * with Han in it is short enough to be a word.
   */
  if (HAN.test(text) && text.replace(/[^\p{Script=Han}]/gu, "").length > 4) {
    return "phrase";
  }

  return "word";
}
