import type { CSSProperties } from "react";

import ExchangeNotesMark from "@/components/ui/ExchangeNotesMark";

import styles from "./ReviewCelebration.module.css";

/**
 * The end of a review round in Standard Mode (Chi, 2026-10-24: "完成一輪時
 * Yumi 慶祝"). It was a black disc with a ✓ in it. Now Yumi hops up, two
 * orbits ring out from her, a few sparks scatter and a check is drawn at her
 * side; then she settles into the app's shared idle (breathing, blinking,
 * glancing; app/yumi-motion.css).
 *
 * The cookies a passed round earns are not drawn here. They land through
 * EnergyRewardObserver, which only plays for credits the server has
 * committed, so a round that did not pay never pretends it did.
 *
 * Cosmic Mode has its own (MissionCompleteStage). Under reduced motion
 * everything is simply in place.
 */
export default function ReviewCelebration() {
  return (
    <div className={styles.stage} aria-hidden="true">
      <span className={styles.orbit} />
      <span className={`${styles.orbit} ${styles.orbitLate}`} />
      {SPARKS.map(([x, y, delay], index) => (
        <i
          key={index}
          className={styles.spark}
          style={{ "--x": `${x}px`, "--y": `${y}px`, "--delay": `${delay}ms` } as CSSProperties}
        />
      ))}
      <div className={styles.hop}>
        <div className="yumi-breath">
          <ExchangeNotesMark
            className={styles.yumi}
            pupilClassName="yumi-glance"
            upperLidClassName="yumi-blink-upper"
            lowerLidClassName="yumi-blink-lower"
          />
        </div>
      </div>
      <svg className={styles.check} viewBox="0 0 32 32">
        <circle cx="16" cy="16" r="15" />
        <path d="M9.5 16.5l4.5 4.5 8.5-9" />
      </svg>
    </div>
  );
}

/** The result's lines under her, rising in one after another. */
export const riseClassName = styles.rise;

/** Where each spark flies to from Yumi's centre, and when it leaves. */
const SPARKS: readonly (readonly [number, number, number])[] = [
  [-58, -34, 420], [-40, -62, 470], [0, -74, 440], [42, -60, 500],
  [60, -30, 450], [-66, 6, 520], [66, 8, 480],
];
