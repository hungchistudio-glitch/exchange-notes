"use client";

import type { RefObject } from "react";

import ExchangeNotesMark from "@/components/ui/ExchangeNotesMark";
import type { YumiFeedingPhase } from "@/hooks/pet/useYumiFeedingSequence";
import type {
  YumiLookTarget,
  YumiOrbitPhase,
} from "@/hooks/pet/useYumiOrbitMenu";
import type { GrowthStage } from "@/lib/pet/moodEngine";
import type { YumiMood } from "@/lib/pet/types";

import YumiFeedingFace from "./YumiFeedingFace";
import styles from "./YumiMark.module.css";

type YumiMarkProps = {
  mood: YumiMood;
  isWaking: boolean;
  isEating: boolean;
  feedingPhase?: YumiFeedingPhase;
  chewBeat?: number;
  feedTargetRef?: RefObject<HTMLSpanElement | null>;
  growthStage: GrowthStage;
  crownEarned: boolean;
  // One-shot: a brief downward glance, used right after Yumi wakes up to
  // suggest awareness of the vocabulary list below — not a steady mood.
  glanceDown?: boolean;
  onWakeAnimationEnd?: () => void;
  onEatAnimationEnd?: () => void;
  orbitPhase?: YumiOrbitPhase;
  lookTarget?: YumiLookTarget;
};

// Yumi is the same breathing "E"-mark used on the splash screen, loader,
// and the Messages mood swiper — grown up into a full companion via CSS
// layering only (glow ring / particles / crown), never by changing the
// underlying SVG shape, so it keeps its identity as it grows.
export default function YumiMark({
  mood,
  isWaking,
  isEating,
  feedingPhase,
  chewBeat = 0,
  feedTargetRef,
  growthStage,
  crownEarned,
  glanceDown = false,
  onWakeAnimationEnd,
  onEatAnimationEnd,
  orbitPhase = "closed",
  lookTarget = "viewer",
}: YumiMarkProps) {
  const resolvedFeedingPhase =
    feedingPhase ?? (isEating ? "chewing" : "idle");

  return (
    <div className={styles.stage}>
      {orbitPhase !== "closed" ? (
        <div className={styles.menuAura} data-phase={orbitPhase} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      ) : null}

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

      {resolvedFeedingPhase !== "idle" ? (
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
        className={styles.shell}
        data-mood={mood}
        data-waking={isWaking ? "true" : "false"}
        data-glance={glanceDown ? "true" : "false"}
        data-feeding={resolvedFeedingPhase}
        data-chew-beat={chewBeat}
        data-orbit={orbitPhase}
        data-look={lookTarget}
        onAnimationEnd={(event) => {
          if (event.animationName.startsWith("wake")) {
            onWakeAnimationEnd?.();
          }

          if (
            event.animationName.startsWith("eat")
            || event.animationName.startsWith("markBite")
            || event.animationName.startsWith("markChew")
            || event.animationName.startsWith("markSwallow")
          ) {
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

        <YumiFeedingFace
          phase={resolvedFeedingPhase}
          chewBeat={chewBeat}
          targetRef={feedTargetRef}
        />
      </div>
    </div>
  );
}
