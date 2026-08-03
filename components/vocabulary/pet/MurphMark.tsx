"use client";

import ExchangeNotesMark from "@/components/ui/ExchangeNotesMark";
import type { GrowthStage } from "@/lib/pet/moodEngine";
import type { MurphMood } from "@/lib/pet/types";

import styles from "./MurphMark.module.css";

type MurphMarkProps = {
  mood: MurphMood;
  isWaking: boolean;
  isEating: boolean;
  growthStage: GrowthStage;
  crownEarned: boolean;
  // One-shot: a brief downward glance, used right after Murph wakes up to
  // suggest awareness of the vocabulary list below — not a steady mood.
  glanceDown?: boolean;
  onWakeAnimationEnd?: () => void;
  onEatAnimationEnd?: () => void;
};

// Murph is the same breathing "E"-mark used on the splash screen, loader,
// and the Messages mood swiper — grown up into a full companion via CSS
// layering only (glow ring / particles / crown), never by changing the
// underlying SVG shape, so it keeps its identity as it grows.
export default function MurphMark({
  mood,
  isWaking,
  isEating,
  growthStage,
  crownEarned,
  glanceDown = false,
  onWakeAnimationEnd,
  onEatAnimationEnd,
}: MurphMarkProps) {
  return (
    <div className={styles.stage}>
      {growthStage >= 2 ? <div className={styles.glowRing} aria-hidden="true" /> : null}

      {growthStage >= 1 ? (
        <div className={styles.particles} aria-hidden="true">
          <span className={styles.particle} />
          <span className={styles.particle} />
          <span className={styles.particle} />
          {growthStage >= 3 ? (
            <>
              <span className={styles.particle} />
              <span className={styles.particle} />
            </>
          ) : null}
        </div>
      ) : null}

      {crownEarned ? (
        <svg
          className={styles.crown}
          viewBox="0 0 64 40"
          aria-hidden="true"
        >
          <path
            d="M6 30 L2 10 L18 22 L32 6 L46 22 L62 10 L58 30 Z"
            fill="#E8B94D"
            stroke="#C9962E"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      ) : null}

      {isEating ? (
        <div className={styles.sparkleBurst} aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      ) : null}

      <div className={styles.groundShadow} aria-hidden="true" />

      <div
        className={`${styles.shell} ${isEating ? styles.eating : ""}`}
        data-mood={mood}
        data-waking={isWaking ? "true" : "false"}
        data-glance={glanceDown ? "true" : "false"}
        onAnimationEnd={(event) => {
          if (event.animationName.startsWith("wake")) {
            onWakeAnimationEnd?.();
          }

          if (event.animationName.startsWith("eat")) {
            onEatAnimationEnd?.();
          }
        }}
      >
        <ExchangeNotesMark
          className={styles.logo}
          pupilClassName={styles.pupil}
          upperLidClassName={styles.upperLid}
          lowerLidClassName={styles.lowerLid}
          surfaceColor="#faf7f0"
          highlightColor="#ffffff"
        />
      </div>
    </div>
  );
}
