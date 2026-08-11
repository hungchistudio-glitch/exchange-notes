"use client";

import type { CSSProperties, ReactNode } from "react";

import ExchangeNotesMark from "@/components/ui/ExchangeNotesMark";

import styles from "./Mission.module.css";

// A handful of sparks, placed by hand. Enough to register as something
// happening, few enough that it never reads as confetti — which is precisely
// what the brief asks this beat not to be.
const SPARKS: Array<[left: string, top: string, delay: string]> = [
  ["24%", "34%", "520ms"],
  ["71%", "28%", "680ms"],
  ["38%", "70%", "760ms"],
  ["64%", "66%", "600ms"],
  ["50%", "20%", "840ms"],
  ["18%", "58%", "900ms"],
];

/**
 * The end of a mission.
 *
 * Wraps the review page's own completion content rather than replacing it, so
 * the words-reviewed count, the mode label and the way home all stay where
 * they were and stay real. This adds the frame around them: the orbital rings
 * settling onto one axis, a single energy wave, a few sparks, and Yumi
 * noticing and hopping.
 *
 * There is no score here, and nothing is awarded. The result underneath is
 * the same one Standard Mode shows.
 */
export default function MissionCompleteStage({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className={styles.complete}>
      <span className={styles.completeRing} aria-hidden="true" />
      <span
        className={`${styles.completeRing} ${styles.completeRingInner}`}
        aria-hidden="true"
      />
      <span className={styles.wave} aria-hidden="true" />

      {SPARKS.map(([left, top, delay]) => (
        <span
          key={`${left}-${top}`}
          className={styles.spark}
          style={{ left, top, "--spark-delay": delay } as CSSProperties}
          aria-hidden="true"
        />
      ))}

      <div className={styles.yumi} aria-hidden="true">
        <ExchangeNotesMark />
      </div>

      <div className={styles.result}>{children}</div>
    </div>
  );
}
