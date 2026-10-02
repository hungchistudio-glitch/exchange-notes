"use client";

import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ArrowUpRight, LoaderCircle, Square, Volume2, X } from "lucide-react";
import OverlayPortal from "@/components/foundation/overlays/OverlayPortal";
import useSheetMotion from "@/components/foundation/overlays/useSheetMotion";
import useTranslation from "@/hooks/i18n/useTranslation";
import useDisplayLanguages from "@/hooks/useDisplayLanguages";
import usePhonetics from "@/hooks/usePhonetics";
import { getVocabularyCardSides } from "@/lib/vocabulary/cardSides";
import { getLanguage } from "@/lib/languages";
import { floatingCopy } from "@/lib/home/floatingCopy";
import { speak, stopSpeech } from "@/lib/speech";
import type { VocabularyItem } from "@/lib/types/app";
import styles from "./FloatingCookies.module.css";

export default function FloatingWordCard({ item, onClose, onFeed, canFeed }: {
  item: VocabularyItem; onClose: () => void; onFeed: () => void; canFeed: boolean;
}) {
  const { t, language } = useTranslation();
  const copy = floatingCopy[language];
  const { learningLanguage, supportLanguage } = useDisplayLanguages();
  const sides = useMemo(() => getVocabularyCardSides(item, learningLanguage, supportLanguage), [item, learningLanguage, supportLanguage]);
  const entries = useMemo(() => [sides.primary, sides.secondary].filter(side => side.text), [sides]);
  const phoneticsFor = usePhonetics(entries);
  const motion = useSheetMotion({ onClose });
  const titleId = useId();
  const sequence = useRef(0);
  const ownedAudio = useRef(false);
  const watchdog = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [audio, setAudio] = useState<{ index: number; started: boolean } | null>(null);
  const [error, setError] = useState(false);

  function cancel() {
    sequence.current++;
    clearTimeout(watchdog.current);
    if (ownedAudio.current) stopSpeech();
    ownedAudio.current = false;
    setAudio(null);
  }
  useEffect(() => {
    const stop = () => {
      sequence.current++;
      clearTimeout(watchdog.current);
      if (ownedAudio.current) stopSpeech();
      ownedAudio.current = false;
      setAudio(null);
    };
    const onHidden = () => { if (document.hidden) stop(); };
    document.addEventListener("visibilitychange", onHidden);
    return () => { document.removeEventListener("visibilitychange", onHidden); stop(); };
  }, []);

  useEffect(() => {
    if (motion.visible || !ownedAudio.current) return;
    sequence.current++;
    clearTimeout(watchdog.current);
    stopSpeech();
    ownedAudio.current = false;
    setAudio(null);
  }, [motion.visible]);

  function play(index: number) {
    if (audio?.index === index) { cancel(); return; }
    const token = ++sequence.current;
    clearTimeout(watchdog.current);
    ownedAudio.current = true;
    setAudio({ index, started: false });
    setError(false);
    const finish = (failed = false) => {
      if (sequence.current !== token) return;
      clearTimeout(watchdog.current);
      ownedAudio.current = false;
      setAudio(null);
      setError(failed);
    };
    // The first speak remains in the user's tap task for iOS Safari.
    speak(entries[index].text, getLanguage(entries[index].language).speechTag, {
      onStart: () => {
        if (sequence.current !== token) return;
        clearTimeout(watchdog.current);
        setAudio({ index, started: true });
      },
      onEnd: () => finish(),
      onError: () => finish(true),
    });
    watchdog.current = setTimeout(() => {
      if (sequence.current !== token) return;
      stopSpeech();
      finish(true);
    }, 12000);
  }
  const close = () => { cancel(); motion.requestClose(); };
  return <OverlayPortal><div className={styles.modal}>
    <div className={`${styles.backdrop} ${motion.backdropClassName}`} {...motion.backdropProps} onClick={close} />
    <section className={`${styles.card} ${motion.panelClassName}`} {...motion.panelProps}
      role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <header className={styles.cardHeader} {...motion.handleProps}>
        <span>{copy.collection}</span>
        <button type="button" className={styles.icon} onClick={close} aria-label={t.common.close}><X size={19} /></button>
      </header>
      <div className={styles.cardBody}>
        {entries.map((side, index) => {
          const phonetics = phoneticsFor(side);
          const readings = [phonetics?.zhuyin, phonetics?.pinyin, phonetics?.ipa].filter(Boolean).join(" · ");
          return <div className={styles.side} key={side.language}>
            <div className={styles.wordRow}>
              <div lang={side.language}>
                <span className={styles.language}>{getLanguage(side.language).name[language]}</span>
                {index === 0 ? <h2 id={titleId}>{side.text}</h2> : <p className={styles.translation}>{side.text}</p>}
              </div>
              <button type="button" className={styles.speaker} onClick={() => play(index)}
                aria-label={`${audio?.index === index ? copy.stop : copy.listen}: ${side.text}`}
                aria-pressed={audio?.index === index}>
                {audio?.index === index ? (audio.started ? <Square size={17} fill="currentColor" /> : <LoaderCircle size={20} className={styles.spinner} />) : <Volume2 size={21} />}
              </button>
            </div>
            {readings && <p className={styles.readings}>{readings}</p>}
            {side.example && <p className={styles.example} lang={side.language}>{side.example}</p>}
          </div>;
        })}
        <p className={styles.audioStatus} role="status">{error ? copy.error : ""}</p>
      </div>
      <footer className={styles.cardFooter}>
        <Link onClick={cancel} href={`/vocabulary?widgetAction=open-word&widgetWordId=${encodeURIComponent(item.id)}`}>
          {copy.library}<ArrowUpRight size={16} />
        </Link>
        <button type="button" disabled={!canFeed} onClick={() => { cancel(); onFeed(); motion.requestClose(); }}>{copy.feed} <span aria-hidden="true">↗</span></button>
      </footer>
    </section>
  </div></OverlayPortal>;
}
