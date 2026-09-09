"use client";

import { Fragment } from "react";

import useTranslation from "@/hooks/i18n/useTranslation";
import { fill } from "@/lib/i18n/format";
import { getLanguage, type LanguageCode } from "@/lib/languages";
import type { RhythmPhrase, SyllableBeat } from "@/lib/pronunciation/lab/types";

import styles from "./RhythmPhraseView.module.css";

/* =========================================================
   One view, four languages' worth of rhythm

   Spanish stress, Chinese tone, French liaison and Italian consonant
   length are drawn by the same component because they are the same data:
   a row of syllables, each carrying weight, pitch, duration and a possible
   connection to the next. A language uses the fields its phonology has and
   leaves the rest unset, and the fields it leaves unset draw nothing —
   which is why there is no `if (language === "zh-TW")` anywhere below.
   ========================================================= */

const BAR_HEIGHT: Array<{ atLeast: number; height: number }> = [
  { atLeast: 1, height: 26 },
  { atLeast: 0.5, height: 16 },
  { atLeast: 0, height: 8 },
];

function barHeight(stress: number): number {
  return BAR_HEIGHT.find((step) => stress >= step.atLeast)?.height ?? 8;
}

/**
 * The Chao contour for a Mandarin tone.
 *
 * Drawn rather than described: a falling line teaches the fourth tone in a
 * way that the words "high falling" do not, and it is the same picture a
 * Taiwanese textbook draws next to the syllable.
 */
const TONE_PATH: Record<NonNullable<SyllableBeat["tone"]>, string> = {
  1: "M2 5 H26",
  2: "M2 21 L26 5",
  3: "M2 10 C 8 22, 14 24, 18 20 L26 8",
  4: "M2 4 L26 22",
  5: "M12 14 h4",
};

function ToneMark({ tone, label }: { tone: NonNullable<SyllableBeat["tone"]>; label: string }) {
  return (
    <svg
      viewBox="0 0 28 26"
      width="28"
      height="26"
      className={styles.contour}
      role="img"
      aria-label={label}
    >
      <path className={styles.contourLine} d={TONE_PATH[tone]} />
    </svg>
  );
}

/** The arc that says two syllables are said as one. */
function LinkArc({ label }: { label: string }) {
  return (
    <span className={styles.link}>
      <svg viewBox="0 0 22 14" width="22" height="14" role="img" aria-label={label}>
        <path className={styles.linkArc} d="M2 2 C 6 12, 16 12, 20 2" />
      </svg>
    </span>
  );
}

type RhythmPhraseViewProps = {
  phrase: RhythmPhrase;
  language: LanguageCode;
  /** Index of the beat currently sounding, or -1. */
  activeIndex?: number;
};

export default function RhythmPhraseView({
  phrase,
  language,
  activeIndex = -1,
}: RhythmPhraseViewProps) {
  const { t } = useTranslation();
  const copy = t.pronunciation.lab.rhythm;
  const meta = getLanguage(language);

  const usesTone = phrase.beats.some((beat) => beat.tone !== undefined);

  return (
    <div
      className={styles.row}
      // The phrase as a whole is what a screen reader should read, not
      // twelve separate syllable fragments. The visual row is decoration
      // over text that is already announced by the card around it.
      role="group"
      aria-label={phrase.text}
    >
      {phrase.beats.map((beat, index) => {
        const active = index === activeIndex;
        const length = beat.length ?? 1;

        return (
          <Fragment key={`${phrase.id}-${index}`}>
            <span
              className={`${styles.beat} ${active ? styles.active : ""} ${
                active ? styles.playing : ""
              }`}
            >
              {usesTone ? (
                beat.tone !== undefined ? (
                  <ToneMark
                    tone={beat.tone}
                    label={fill(copy.toneLabel, { tone: beat.tone })}
                  />
                ) : (
                  <span aria-hidden="true" style={{ height: 26 }} />
                )
              ) : null}

              <span
                className={`font-cjk ${styles.syllable} ${
                  beat.silent ? styles.silent : ""
                } ${active ? "" : "text-ink-soft"}`}
                style={{ fontFamily: `var(${meta.fontVariable})` }}
                lang={meta.htmlLang}
              >
                {beat.text}
              </span>

              {/*
                The stress bar. Its width carries duration, which is only
                meaningful where a language has contrastive length — for
                everything else `length` is 1 and every bar is the same
                width, so the same element says nothing extra rather than
                saying something wrong.
              */}
              <span
                aria-hidden="true"
                className={`${styles.bar} ${
                  beat.stress >= 0.5 ? "" : styles.unstressed
                }`}
                style={{
                  height: barHeight(beat.stress),
                  width: 10 + (length - 1) * 16,
                }}
              />
            </span>

            {beat.linkToNext && index < phrase.beats.length - 1 ? (
              <LinkArc label={copy.linked} />
            ) : null}
          </Fragment>
        );
      })}
    </div>
  );
}
