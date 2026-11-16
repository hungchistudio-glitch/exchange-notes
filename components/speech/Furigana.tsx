"use client";

import { Fragment, useMemo, useSyncExternalStore, type ReactNode } from "react";

import usePhonetics from "@/hooks/usePhonetics";
import {
  alignFurigana,
  hasKanji,
  parseAnnotatedFurigana,
  stripAnnotatedFurigana,
  type FuriganaSegment,
} from "@/lib/japanese/kana";
import type { LanguageCode } from "@/lib/languages";
import {
  getReadingDisplay,
  getServerReadingDisplay,
  setReadingDisplay,
  showsFurigana,
  subscribeToReadingDisplay,
  type FuriganaPlace,
  type ReadingDisplay,
} from "@/lib/preferences/readingDisplay";

/* =========================================================
   Furigana (Chi, 2026-11-16)

   Small hiragana over the kanji of a Japanese word, never over its kana.
   On a word card it is the word's own reading, fetched like any other
   (usePhonetics) and laid over the kanji it belongs to (alignFurigana);
   in long text it comes written inline by whoever wrote the text
   ({漢字|かんじ}), because a sentence's readings depend on the sentence.

   Whether it shows at all is the reader's: 讀音顯示 in Settings.
   ========================================================= */

/** The reader's reading-display choices, live. */
export function useReadingDisplay(): ReadingDisplay {
  return useSyncExternalStore(subscribeToReadingDisplay, getReadingDisplay, getServerReadingDisplay);
}

export { setReadingDisplay };

/** Longest text a word card asks a reading for: a word or a short phrase. */
const MAX_WORD_LENGTH = 16;
/** Longest sentence asked for in one piece; the phonetics route takes 160. */
const MAX_SENTENCE_LENGTH = 120;

/** Japanese text cut into the sentences its reading is asked for by. */
function sentencesOf(text: string): string[] {
  const pieces = text.match(/[^。！？!?\n]+[。！？!?]*\n?|\n/gu) ?? [text];
  return pieces.flatMap((piece) => {
    if (piece.length <= MAX_SENTENCE_LENGTH) return [piece];
    /* A run-on sentence is cut at its commas, then at the length. */
    const parts = piece.match(/[^、，,]+[、，,]?/gu) ?? [piece];
    return parts.flatMap((part) =>
      part.length <= MAX_SENTENCE_LENGTH
        ? [part]
        : part.match(new RegExp(`[\\s\\S]{1,${MAX_SENTENCE_LENGTH}}`, "gu")) ?? [part],
    );
  });
}

/** Whether text is a single word or short phrase rather than running text. */
export function isWordLike(text: string): boolean {
  const word = text.trim();
  return word.length <= MAX_WORD_LENGTH && !/[\s。、！？!?]/u.test(word);
}

/**
 * Furigana for Japanese text, once its reading is known: a word on a card
 * (place "card"), or running text cut into sentences, each read and laid
 * over its kanji on its own (place "text"). Undefined for anything else —
 * another language, no kanji, a reading not here yet, or furigana turned
 * off for this place in 讀音顯示.
 *
 * A sentence whose reading does not line up with its kana is left without
 * furigana rather than given one long reading over the whole line.
 */
export function useWordFurigana(
  text: string | null | undefined,
  language: LanguageCode,
  place: FuriganaPlace = "card",
  knownReading?: string | null,
): FuriganaSegment[] | undefined {
  const display = useReadingDisplay();
  const source = text ?? "";
  const wanted =
    language === "ja" &&
    hasKanji(source) &&
    showsFurigana(display, place) &&
    (place === "text" || isWordLike(source));

  const pieces = useMemo(
    () => (!wanted ? [] : place === "card" ? [source.trim()] : sentencesOf(source)),
    [wanted, place, source],
  );
  const requests = useMemo(
    () =>
      knownReading && place === "card"
        ? []
        : pieces.filter((piece) => hasKanji(piece)).map((piece) => ({ text: piece, language })),
    [pieces, knownReading, place, language],
  );
  const phoneticsFor = usePhonetics(requests);

  return useMemo(() => {
    if (!wanted || pieces.length === 0) return undefined;
    if (place === "card") {
      const kana = knownReading?.trim() || phoneticsFor({ text: pieces[0], language })?.kana;
      return kana ? alignFurigana(pieces[0], kana) : undefined;
    }
    const segments: FuriganaSegment[] = [];
    let any = false;
    for (const piece of pieces) {
      const reading = hasKanji(piece) ? phoneticsFor({ text: piece.trim(), language })?.kana : undefined;
      const aligned = reading ? alignFurigana(piece, reading) : null;
      /* One reading over a whole sentence means it did not line up. */
      const usable = aligned && !(aligned.length === 1 && aligned[0].ruby && piece.length > MAX_WORD_LENGTH);
      if (usable) {
        segments.push(...aligned);
        any = true;
      } else {
        segments.push({ text: piece });
      }
    }
    return any ? segments : undefined;
  }, [wanted, pieces, place, knownReading, phoneticsFor, language]);
}

/**
 * Long Japanese text written with its readings inline: the plain text to
 * say and search, and the segments to draw — or none, if the reader keeps
 * furigana to word cards or off.
 */
export function useTextFurigana(
  annotated: string,
  language: LanguageCode,
): { text: string; ruby?: FuriganaSegment[] } {
  const display = useReadingDisplay();
  return useMemo(() => {
    if (language !== "ja" || !annotated.includes("{")) return { text: annotated };
    const text = stripAnnotatedFurigana(annotated);
    return showsFurigana(display, "text")
      ? { text, ruby: parseAnnotatedFurigana(annotated) }
      : { text };
  }, [annotated, language, display]);
}

/**
 * Segments drawn between two character offsets of their plain text. A base
 * belongs to the range it starts in, whole, so a word boundary never cuts
 * a kanji from its reading.
 */
export function RubyRange({
  segments,
  start = 0,
  end = Number.POSITIVE_INFINITY,
}: {
  segments: readonly FuriganaSegment[];
  start?: number;
  end?: number;
}) {
  const out: ReactNode[] = [];
  let at = 0;
  segments.forEach((segment, index) => {
    const from = at;
    const to = at + segment.text.length;
    at = to;
    if (segment.ruby) {
      if (from >= start && from < end) {
        out.push(
          <ruby key={index} className="furigana">
            {segment.text}
            <rt>{segment.ruby}</rt>
          </ruby>,
        );
      }
      return;
    }
    const left = Math.max(from, start);
    const right = Math.min(to, end);
    if (left < right) out.push(<Fragment key={index}>{segment.text.slice(left - from, right - from)}</Fragment>);
  });
  return <>{out}</>;
}
