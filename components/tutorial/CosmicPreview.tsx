"use client";

import type { CSSProperties } from "react";

import ExchangeNotesMark from "@/components/ui/ExchangeNotesMark";
import styles from "@/components/tutorial/CosmicPreview.module.css";

/*
 * Sixteen fixed points rather than a random scatter generated on mount. A
 * random field differs between the server's HTML and the browser's first
 * render, which is a hydration mismatch on a decorative layer — and it means
 * nobody can look at this file and know what the slide looks like.
 */
const STARS: ReadonlyArray<{ x: number; y: number; d: number; s: number }> = [
  { x: 8, y: 22, d: 0, s: 1.4 },
  { x: 17, y: 68, d: 1.1, s: 1 },
  { x: 26, y: 12, d: 2.3, s: 1.2 },
  { x: 33, y: 84, d: 0.6, s: 1 },
  { x: 41, y: 34, d: 3.1, s: 1.6 },
  { x: 48, y: 8, d: 1.7, s: 1 },
  { x: 57, y: 78, d: 2.8, s: 1.3 },
  { x: 64, y: 20, d: 0.3, s: 1 },
  { x: 71, y: 58, d: 3.6, s: 1.5 },
  { x: 78, y: 30, d: 1.4, s: 1 },
  { x: 84, y: 76, d: 2.1, s: 1.2 },
  { x: 91, y: 44, d: 0.9, s: 1 },
  { x: 12, y: 46, d: 3.3, s: 1 },
  { x: 53, y: 60, d: 2.6, s: 1 },
  { x: 88, y: 14, d: 1.9, s: 1.3 },
  { x: 22, y: 92, d: 3.9, s: 1 },
];

/**
 * Yumi Cosmic Mode, shown rather than described.
 *
 * The slide's copy makes a claim — that the mode is the same app in a
 * different atmosphere — and a still image of a dark card cannot support it.
 * What supports it is the character: the same mark that sits on the standard
 * home screen, drawn with `cosmic` on, breathing, blinking, its iris tracking
 * and a scan pass crossing the shell on a loop it never leaves.
 *
 * Everything here runs continuously and by design. The Command Deck's own
 * rhythms are deliberately sparse because it is a screen you live on and
 * ambience you cannot escape becomes noise; this card is on screen for a few
 * seconds and has one job, which is to be the reason someone tries the mode.
 * So the pass that the deck spaces thirty-five seconds apart runs here every
 * six, and the iris never fully stops.
 */
export default function CosmicPreview() {
  return (
    <div className={styles.card} aria-hidden="true">
      <span className={styles.nebula} />

      <span className={styles.stars}>
        {STARS.map((star, index) => (
          <span
            key={index}
            className={styles.star}
            style={
              {
                left: `${star.x}%`,
                top: `${star.y}%`,
                width: `${star.s}px`,
                height: `${star.s}px`,
                animationDelay: `${star.d}s`,
              } as CSSProperties
            }
          />
        ))}
      </span>

      {/* Two rings on different tilts and different clocks, each carrying a
          satellite. One ring reads as an orbit; two crossing read as a system. */}
      <span className={`${styles.orbit} ${styles.orbitOuter}`}>
        <span className={styles.satellite} />
      </span>
      <span className={`${styles.orbit} ${styles.orbitInner}`}>
        <span className={`${styles.satellite} ${styles.satelliteWarm}`} />
      </span>

      <span className={styles.halo} />

      <span className={styles.body}>
        <span className={styles.drift}>
          <ExchangeNotesMark
            cosmic
            /*
             * Higher than the deck's resting 0.12 on purpose. There the low
             * floor is what keeps a bright seam meaningful when it arrives;
             * here there is no later moment to save it for.
             */
            energy={0.55}
            className={`${styles.mark} ${styles.timing}`}
            upperLidClassName="yumi-blink-upper"
            lowerLidClassName="yumi-blink-lower"
            irisClassName={`yumi-iris ${styles.iris}`}
            sweepClassName={`yumi-sweep ${styles.sweep}`}
            gleamClassName={`yumi-gleam ${styles.gleam}`}
          />
        </span>
      </span>
    </div>
  );
}
