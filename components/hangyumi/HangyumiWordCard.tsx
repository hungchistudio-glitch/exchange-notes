"use client";

import { LoaderCircle, Square, Volume2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import useTranslation from "@/hooks/i18n/useTranslation";
import usePhonetics from "@/hooks/usePhonetics";
import type { HangyumiReading } from "@/lib/hangyumi/rules";
import { getLanguage, type LanguageCode } from "@/lib/languages";
import { speak, stopSpeech } from "@/lib/speech";

import styles from "./Hangyumi.module.css";

/* =========================================================
   A finished round's word, as a word card

   The app's own card (components/home/yumi/FloatingWordCard): the word
   in the language being learnt with its readings, under it the same word
   in the reader's language, each with its own speaker (Chi, 2026-10-26).

   Each side's reading comes with the word's card, written ahead beside
   the word bank (IPA, or zhuyin and pinyin), so every side of every word
   has one; only a side without it asks the phonetics service.

   A speaker speaks only when it is pressed. iOS Safari lets speech start
   only inside the tap that asked for it; the word used to be spoken on
   its own as the round ended, outside any tap, and that left every
   speaker on the screen mute for the session.
   ========================================================= */

export type WordCardSide = { text: string; language: LanguageCode; reading?: HangyumiReading };

/** A reading with nothing in it is no reading: the service is asked instead. */
const hasReading = (reading?: HangyumiReading): reading is HangyumiReading =>
  !!reading && Boolean(reading.ipa || reading.pinyin || reading.zhuyin);

export default function HangyumiWordCard({ sides, pending }: {
  /** The word first, then its gloss. */
  sides: WordCardSide[];
  /** The gloss is still being fetched. */
  pending?: boolean;
}) {
  const { t, language: interfaceLanguage } = useTranslation();
  const copy = t.hangyumi;
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
      stopSpeech();
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
      stopSpeech();
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
    speak(shown[index].text, getLanguage(shown[index].language).speechTag, {
      onStart: () => { if (sequence.current === token) setAudio({ index, started: true }); },
      onEnd: () => finish(),
      onError: () => finish(true),
    });
    watchdog.current = setTimeout(() => {
      if (sequence.current !== token) return;
      stopSpeech();
      finish(true);
    }, 12000);
  }

  return (
    <div className={styles.wordCard}>
      {shown.map((side, index) => {
        const phonetics = hasReading(side.reading) ? side.reading : phoneticsFor(side);
        const readings = [phonetics?.zhuyin, phonetics?.pinyin, phonetics?.ipa].filter(Boolean).join(" · ");
        const playing = audio?.index === index;
        return (
          <div className={styles.wordSide} key={`${side.language}:${index}`} data-side={index === 0 ? "word" : "gloss"}>
            <div className={styles.wordSideText}>
              <span className={styles.wordSideLanguage}>{getLanguage(side.language).name[interfaceLanguage]}</span>
              <span className={index === 0 ? styles.wordSideWord : styles.wordSideGloss} lang={getLanguage(side.language).htmlLang}>
                {side.text}
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
                : <Volume2 size={20} strokeWidth={1.9} aria-hidden="true" />}
            </button>
          </div>
        );
      })}
      {pending && shown.length < 2 && <span className={styles.wordSideGhost} aria-hidden="true" />}
      <p className={styles.soundStatus} role="status">{failed ? copy.soundFailed : ""}</p>
    </div>
  );
}
