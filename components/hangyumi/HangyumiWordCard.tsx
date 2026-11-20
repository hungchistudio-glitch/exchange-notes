"use client";

import { LoaderCircle, Play, Square } from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";

import { useReadingDisplay } from "@/components/speech/Furigana";
import useTranslation from "@/hooks/i18n/useTranslation";
import usePhonetics from "@/hooks/usePhonetics";
import type { HangyumiReading } from "@/lib/hangyumi/rules";
import { alignFurigana, hasKanji } from "@/lib/japanese/kana";
import { getLanguage, type LanguageCode } from "@/lib/languages";
import { koreanPronounced } from "@/lib/korean/romanize";
import { readingLines, showsFurigana } from "@/lib/preferences/readingDisplay";
import { SpokenText } from "@/components/speech/Spoken";
import { playSpoken, stopSpoken } from "@/lib/spokenWords";

import styles from "./Hangyumi.module.css";

/* Report a problem (Chi, 2026-11-16: 回報問題), loaded when a sheet first shows it. */
const ReportProblem = lazy(() => import("@/components/reports/ReportProblem"));

/* =========================================================
   A finished round's word, as a word card

   The app's own card (components/home/yumi/FloatingWordCard): the word
   in the language being learnt with its readings, under it the same word
   in the reader's language, each with its own speaker (Chi, 2026-10-26).

   Each side's reading comes with the word's card, written ahead beside
   the word bank (IPA; zhuyin and pinyin; kana and romaji; or Korean
   romanization and IPA), so every side of every word has one; only a side
   without it asks the phonetics service. Which of them show is the
   reader's 讀音顯示, and a Japanese word's kana sits over its kanji.

   A speaker speaks only when it is pressed. iOS Safari lets speech start
   only inside the tap that asked for it; the word used to be spoken on
   its own as the round ended, outside any tap, and that left every
   speaker on the screen mute for the session.
   ========================================================= */

export type WordCardSide = { text: string; language: LanguageCode; reading?: HangyumiReading };

/** A reading with nothing in it is no reading: the service is asked instead. */
const hasReading = (reading?: HangyumiReading): reading is HangyumiReading =>
  !!reading && Boolean(reading.ipa || reading.pinyin || reading.zhuyin || reading.kana || reading.rr);

export default function HangyumiWordCard({ sides, pending }: {
  /** The word first, then its gloss. */
  sides: WordCardSide[];
  /** The gloss is still being fetched. */
  pending?: boolean;
}) {
  const { t, language: interfaceLanguage } = useTranslation();
  const copy = t.hangyumi;
  const display = useReadingDisplay();
  const shown = useMemo(() => sides.filter(side => side.text.trim()), [sides]);
  const unread = useMemo(() => shown.filter(side => !hasReading(side.reading)), [shown]);
  const phoneticsFor = usePhonetics(unread);
  const sequence = useRef(0);
  const watchdog = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [audio, setAudio] = useState<{ index: number; started: boolean } | null>(null);
  const [failed, setFailed] = useState(false);

  // Leaving the card, or the page going to the background, stops the voice.
  useEffect(() => {
    const stop = () => {
      sequence.current++;
      clearTimeout(watchdog.current);
      stopSpoken();
    };
    const onHidden = () => { if (document.hidden) { stop(); setAudio(null); } };
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      stop();
    };
  }, []);

  function play(index: number) {
    if (audio?.index === index) {
      sequence.current++;
      clearTimeout(watchdog.current);
      stopSpoken();
      setAudio(null);
      return;
    }
    const token = ++sequence.current;
    clearTimeout(watchdog.current);
    setAudio({ index, started: false });
    setFailed(false);
    const finish = (error = false) => {
      if (sequence.current !== token) return;
      clearTimeout(watchdog.current);
      setAudio(null);
      setFailed(error);
    };
    // Inside the tap, so iOS lets it speak.
    /* Through the app's speech state, so the word lights as it is said (Chi,
       2026-11-14): a Chinese word a character at a time. */
    playSpoken({
      text: shown[index].text,
      lang: getLanguage(shown[index].language).speechTag,
      onStart: () => { if (sequence.current === token) setAudio({ index, started: true }); },
      onEnd: () => finish(),
      onError: () => finish(true),
      // Another key took over: back to rest.
      onCancel: () => finish(),
    });
    watchdog.current = setTimeout(() => {
      if (sequence.current !== token) return;
      stopSpoken();
      finish(true);
    }, 12000);
  }

  return (
    <div className={styles.wordCard}>
      {shown.map((side, index) => {
        const phonetics = hasReading(side.reading) ? side.reading : phoneticsFor(side);
        const said = side.language === "ko" ? koreanPronounced(side.text) ?? undefined : undefined;
        const readings = readingLines(side.language, phonetics && { ...phonetics, said }, display).join(" · ");
        const ruby =
          side.language === "ja" && phonetics?.kana && hasKanji(side.text) && showsFurigana(display, "card")
            ? alignFurigana(side.text, phonetics.kana)
            : undefined;
        const playing = audio?.index === index;
        return (
          <div className={styles.wordSide} key={`${side.language}:${index}`} data-side={index === 0 ? "word" : "gloss"}>
            <div className={styles.wordSideText}>
              <span className={styles.wordSideLanguage}>{getLanguage(side.language).name[interfaceLanguage]}</span>
              <span className={index === 0 ? styles.wordSideWord : styles.wordSideGloss} lang={getLanguage(side.language).htmlLang}>
                <SpokenText text={side.text} lang={getLanguage(side.language).speechTag} ruby={ruby} />
              </span>
              {readings && <span className={styles.wordSideReadings}>{readings}</span>}
            </div>
            <button
              type="button"
              className={styles.listen}
              onClick={() => play(index)}
              aria-pressed={playing}
              aria-label={`${playing ? copy.stop : copy.listen}: ${side.text}`}
              title={playing ? copy.stop : copy.listen}
            >
              {playing
                ? audio.started
                  ? <Square size={16} fill="currentColor" aria-hidden="true" />
                  : <LoaderCircle size={19} className={styles.spinner} aria-hidden="true" />
                : <Play size={18} fill="currentColor" strokeWidth={0} className="translate-x-px" aria-hidden="true" />}
            </button>
          </div>
        );
      })}
      {pending && shown.length < 2 && <span className={styles.wordSideGhost} aria-hidden="true" />}
      <p className={styles.soundStatus} role="status">{failed ? copy.soundFailed : ""}</p>
      {!pending && shown.length > 0 && (
        <Suspense fallback={null}>
          <ReportProblem
            surface="game"
            itemKey={`${shown[0].language}:${shown[0].text}`}
            quoted={shown.map((side) => side.text).join(" — ")}
            language={shown[0].language}
          />
        </Suspense>
      )}
    </div>
  );
}
