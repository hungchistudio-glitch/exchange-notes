import type { LanguageCode } from "@/lib/languages";
import { segmentWords } from "@/lib/spokenWords";
import type { TextRange } from "@/lib/vocabulary/knownWords";

/* =========================================================
   How much of a story the reader can already read (Chi, 2026-11-28:
   理解度掃描儀)

   Counted against the reader's own library only: of a story's key words
   (its headline and summary, without the little words every sentence
   has), how many are words they have kept. Not a test score and not a
   level: a scanner reading, so a reader can pick the story that is
   within reach today, or the one that will teach them the most.
   ========================================================= */

/* The little words, which say nothing about whether a story is readable. */
const LITTLE: Partial<Record<LanguageCode, ReadonlySet<string>>> = {
  en: new Set("the a an and or but of to in on at for with from by as is are was were be been being has have had do does did will would can could should may might must this that these those it its they them their there here what which who whom whose when where why how not no yes than then so if into over after before about up down out off more most such only also just very new says said".split(" ")),
  es: new Set("el la los las un una unos unas y o pero de del a al en con por para como es son era fue ser ha han hay que se su sus lo le les este esta estos estas ese esa muy más ya no sí".split(" ")),
  fr: new Set("le la les un une des et ou mais de du au aux en dans sur pour par avec comme est sont était être a ont il elle ils elles que qui se sa son ses ce cette ces plus très ne pas oui".split(" ")),
  it: new Set("il lo la i gli le un uno una e o ma di del della dei a al in con per come è sono era essere ha hanno che chi si suo sua suoi questo questa più molto non sì".split(" ")),
};

const fold = (value: string) => value.normalize("NFKD").replace(/\p{Mark}/gu, "").toLocaleLowerCase();

export type Comprehension = {
  /** Key words found in the reader's library. */
  known: number;
  /** Key words counted. */
  total: number;
  percent: number;
  /** A few of the words that would be new, longest first. */
  fresh: string[];
};

const covered = (ranges: readonly TextRange[], start: number, end: number) =>
  ranges.some((range) => range.start < end && range.end > start);

/** The reading for one text, given where the reader's kept words are in it. */
export function comprehension(text: string, speechTag: string, code: LanguageCode, ranges: readonly TextRange[]): Comprehension {
  // Chinese and Japanese: by character, counting the ones that carry meaning.
  if (code === "zh-TW" || code === "ja") {
    let total = 0;
    let known = 0;
    for (let index = 0; index < text.length; index += 1) {
      if (!/[\p{Script=Han}\p{Script=Katakana}]/u.test(text[index])) continue;
      total += 1;
      if (covered(ranges, index, index + 1)) known += 1;
    }
    return { known, total, percent: total ? Math.round((known / total) * 100) : 0, fresh: [] };
  }

  const little = LITTLE[code];
  const shortest = code === "ko" ? 2 : 4;
  const seen = new Map<string, { word: string; known: boolean }>();
  for (const segment of segmentWords(text, speechTag)) {
    if (!segment.word) continue;
    const letters = segment.text.replace(/[^\p{L}]/gu, "");
    if (letters.length < shortest) continue;
    const key = fold(segment.text);
    if (little?.has(key)) continue;
    const known = covered(ranges, segment.start, segment.end);
    const before = seen.get(key);
    seen.set(key, { word: segment.text, known: known || Boolean(before?.known) });
  }
  const words = [...seen.values()];
  const known = words.filter((word) => word.known).length;
  const fresh = words
    .filter((word) => !word.known)
    .map((word) => word.word)
    .sort((a, b) => b.length - a.length)
    .slice(0, 3);
  return { known, total: words.length, percent: words.length ? Math.round((known / words.length) * 100) : 0, fresh };
}
