import { getLanguageBySpeechTag, type LanguageCode } from "@/lib/languages";
import { segmentWords } from "@/lib/spokenWords";
import type { VocabularyItem } from "@/lib/types/app";

/* =========================================================
   The words a reader has kept, found in what they read

   Chi, 2026-11-15 (新聞裡學過的字發光): a word already in the reader's
   library glows where it turns up in the news, so a story shows what they
   know before what they do not.

   Every language a kept word carries counts. A word saved from English
   carries its Chinese, Spanish, French and Italian too (`texts`), so the
   Chinese line of a story lights the same words the English line does.

   Matching is deliberately plain, and errs towards missing rather than
   lighting the wrong word:
   - Chinese, which has no spaces, by substring, for words of two
     characters or more. One character would light half of every sentence.
   - Everything else, by the browser's word breaker, as whole words, case
     and accents folded. Common endings are tried as well, so "reports" finds
     "report" and "launched" finds "launch". A phrase is found as a phrase,
     between word boundaries.
   ========================================================= */

export type KnownWords = Map<LanguageCode, { words: Set<string>; phrases: string[]; han: string[] }>;

export type TextRange = { start: number; end: number };

const HAN = /\p{Script=Han}/u;
/** Longer than any word anyone saves on purpose: a pasted sentence. */
const LONGEST = 40;

const fold = (value: string) =>
  value.normalize("NFKD").replace(/\p{Mark}/gu, "").toLocaleLowerCase().trim();

/** Every language a word's library entry is written in. */
function textsOf(item: VocabularyItem): Array<[LanguageCode, string]> {
  const pairs: Array<[LanguageCode, string]> = [];
  for (const [code, value] of Object.entries(item.texts ?? {})) {
    if (typeof value === "string") pairs.push([code as LanguageCode, value]);
  }
  if (item.word_language && item.word) pairs.push([item.word_language, item.word]);
  if (item.translation_language && item.translation) pairs.push([item.translation_language, item.translation]);
  return pairs;
}

export function buildKnownWords(items: readonly VocabularyItem[]): KnownWords {
  const known: KnownWords = new Map();
  for (const item of items) {
    for (const [code, raw] of textsOf(item)) {
      const value = fold(raw);
      if (!value || value.length > LONGEST) continue;
      let entry = known.get(code);
      if (!entry) {
        entry = { words: new Set(), phrases: [], han: [] };
        known.set(code, entry);
      }
      if (code === "zh-TW" || HAN.test(value)) {
        if (Array.from(value).length >= 2 && !/\s/.test(value)) entry.han.push(value);
      } else if (/\s/.test(value)) {
        entry.phrases.push(value.replace(/\s+/g, " "));
      } else {
        entry.words.add(value);
      }
    }
  }
  for (const entry of known.values()) {
    /* Longest first, so 圖書館員 is found before 圖書館 inside it. */
    entry.han = [...new Set(entry.han)].sort((a, b) => b.length - a.length);
    entry.phrases = [...new Set(entry.phrases)].sort((a, b) => b.length - a.length);
  }
  return known;
}

/** The forms a written word may have come from: reports → report. */
function stems(word: string): string[] {
  const forms = [word];
  const cut = (ending: string, add = "") => {
    if (word.length > ending.length + 2 && word.endsWith(ending)) forms.push(word.slice(0, -ending.length) + add);
  };
  cut("s");
  cut("es");
  cut("ies", "y");
  cut("ed");
  cut("d");
  cut("ing");
  cut("ing", "e");
  cut("ly");
  return forms;
}

/** Ranges that do not overlap, earliest first: the first found wins. */
function settle(ranges: TextRange[]): TextRange[] {
  const sorted = ranges.sort((a, b) => a.start - b.start || b.end - a.end);
  const kept: TextRange[] = [];
  for (const range of sorted) {
    const last = kept.at(-1);
    if (!last || range.start >= last.end) kept.push(range);
  }
  return kept;
}

/** Where the reader's kept words are in `text`, which is in `speechTag`'s language. */
export function knownRanges(text: string, speechTag: string, known: KnownWords): TextRange[] {
  if (!text || known.size === 0) return [];
  let code: LanguageCode;
  try {
    code = getLanguageBySpeechTag(speechTag as Parameters<typeof getLanguageBySpeechTag>[0]).code;
  } catch {
    return [];
  }
  const entry = known.get(code);
  if (!entry) return [];

  const ranges: TextRange[] = [];

  if (code === "zh-TW") {
    const taken = new Array<boolean>(text.length).fill(false);
    for (const word of entry.han) {
      for (let at = text.indexOf(word); at >= 0; at = text.indexOf(word, at + word.length)) {
        if (taken.slice(at, at + word.length).some(Boolean)) continue;
        taken.fill(true, at, at + word.length);
        ranges.push({ start: at, end: at + word.length });
      }
    }
    return settle(ranges);
  }

  /* Phrases, between word boundaries. Folding keeps lengths for the Latin
     scripts these languages use, so offsets carry over. */
  const folded = fold(text);
  if (folded.length === text.length) {
    for (const phrase of entry.phrases) {
      for (let at = folded.indexOf(phrase); at >= 0; at = folded.indexOf(phrase, at + 1)) {
        const before = folded[at - 1];
        const after = folded[at + phrase.length];
        if ((before && /[\p{L}\p{N}]/u.test(before)) || (after && /[\p{L}\p{N}]/u.test(after))) continue;
        ranges.push({ start: at, end: at + phrase.length });
      }
    }
  }

  for (const segment of segmentWords(text, speechTag)) {
    if (!segment.word) continue;
    if (stems(fold(segment.text)).some((form) => entry.words.has(form))) {
      ranges.push({ start: segment.start, end: segment.end });
    }
  }

  return settle(ranges);
}
