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
        {/*
          The idle wrapper exists because .yumi is already spending its
          transform on the arrival hop, and that hop runs once. Without a
          second element Yumi lands and then holds perfectly still for as long
          as the result is on screen, which is most of the time anyone spends
          here — the entrance was animated and the character was not.
        */}
        <div className={`${styles.yumiIdle} yumi-breath`}>
          {/*
            The same refit Yumi wears on the deck — this screen is inside
            Cosmic Mode, and a Yumi that loses its shell and seam on the way to
            the celebration would read as a different character arriving.

            Energy is at the top of its range here, and this is the moment the
            brief reserved it for: finishing a mission is the notable event, so
            the seam and the constellation are allowed to be bright.

            The eye is new. It had none at all before: no pupil drift, no
            blink, no iris, so Yumi arrived at its own celebration and stared.

            These are the app's shared idle classes (app/yumi-motion.css),
            applied as global names — a CSS module scopes every animation-name
            it sees, so a module referring to a shared keyframe compiles to a
            name that matches nothing and silently stops. The pace comes from
            custom properties on .yumiIdle.
          */}
          <ExchangeNotesMark
            cosmic
            energy={1}
            pupilClassName="yumi-glance"
            upperLidClassName="yumi-blink-upper"
            lowerLidClassName="yumi-blink-lower"
            irisClassName="yumi-iris"
            sweepClassName="yumi-sweep-active"
          />
        </div>
      </div>

      <div className={styles.result}>{children}</div>
    </div>
  );
}
