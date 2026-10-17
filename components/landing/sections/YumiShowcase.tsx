"use client";

import { Check, RotateCcw } from "lucide-react";
import { useRef, useState } from "react";

import { ListenButton, speechTagFor, useSpeaker } from "@/components/landing/listen";
import Yumi3DFigure from "@/components/yumi3d/Yumi3DFigure";
import type { TranslationDictionary } from "@/lib/i18n/types";

import styles from "./LandingSections.module.css";

type YumiCopy = TranslationDictionary["landing"]["yumi"];
type Phase = "idle" | "recall" | "answer" | "again" | "gotIt";

/*
 * Yumi, and the one thing she does that this page can show for real.
 *
 * She notices what you kept and brings it back when it is ready: the chip
 * under her message is that word (the same one the note kept and the
 * exchange passed on). Open it and she looks down at it; remember it and
 * she reaches for it, the way she takes a cookie in the app; and the line
 * under it says what the app's scheduler would do next. She can still be
 * turned and her eye pulled, as anywhere — the hint says so, because
 * nothing on her says it.
 */
export default function YumiShowcase({
  copy,
  interfaceLang,
}: {
  copy: YumiCopy;
  interfaceLang: string;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [reachKey, setReachKey] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const speaker = useSpeaker();
  const speech = speechTagFor(copy.reviewLang);

  function grade(result: "again" | "gotIt") {
    setPhase(result);
    if (result === "gotIt") setReachKey(key => key + 1);
  }

  return (
    <div className={styles.yumi} role="group" aria-label={copy.previewAriaLabel}>
      <div className={styles.yumiStage}>
        <Yumi3DFigure
          prepare="idle"
          gaze={phase === "idle" ? null : { x: 0, y: 0.9 }}
          reach={{ key: reachKey, target: cardRef }}
        />
      </div>
      <p className={styles.touchHint}>{copy.touchHint}</p>

      <div className={styles.bubble}>
        <p lang={interfaceLang}>{copy.message}</p>
        <span lang={interfaceLang === "en" ? "zh-Hant" : "en"}>{copy.translation}</span>
      </div>

      <div ref={cardRef} className={styles.reviewCard} data-phase={phase}>
        {phase === "idle" ? (
          <button type="button" className={styles.reviewChip} onClick={() => setPhase("recall")}>
            <strong lang={copy.reviewLang}>{copy.reviewWord}</strong>
            <span>{copy.reviewHint}</span>
          </button>
        ) : (
          <div className={styles.reviewOpen}>
            <div className={styles.wordCardHead}>
              <strong lang={copy.reviewLang}>{copy.reviewWord}</strong>
              {speech ? (
                <ListenButton
                  id="review"
                  text={copy.reviewWord}
                  speech={speech}
                  speaker={speaker}
                  play={copy.listen}
                  playing={copy.playing}
                  label={`${copy.listen}: ${copy.reviewWord}`}
                  className={styles.iconButton}
                  iconOnly
                />
              ) : null}
            </div>
            <span lang={copy.reviewLang}>{copy.reviewReading}</span>
            {phase === "recall" ? (
              <button type="button" className={styles.primary} onClick={() => setPhase("answer")}>
                {copy.reveal}
              </button>
            ) : (
              <p className={styles.reviewMeaning}>{copy.reviewMeaning}</p>
            )}
            {phase === "answer" ? (
              <div className={styles.actions}>
                <button type="button" className={styles.secondary} onClick={() => grade("again")}>
                  <RotateCcw size={15} aria-hidden="true" /> {copy.again}
                </button>
                <button type="button" className={styles.primary} onClick={() => grade("gotIt")}>
                  <Check size={15} aria-hidden="true" /> {copy.gotIt}
                </button>
              </div>
            ) : null}
            <p className={styles.small} role="status">
              {phase === "gotIt" ? copy.gotItReaction : phase === "again" ? copy.againReaction : ""}
            </p>
            {phase === "gotIt" || phase === "again" ? (
              <button type="button" className={styles.textButton} onClick={() => setPhase("recall")}>
                <RotateCcw size={14} aria-hidden="true" /> {copy.restart}
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
