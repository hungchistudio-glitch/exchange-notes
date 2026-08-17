"use client";

import ExchangeNotesMark from "@/components/ui/ExchangeNotesMark";

import styles from "./YumiCommsMark.module.css";

/*
 * Yumi at the centre of the comms hub.
 *
 * One animation, always running, in both interface modes — this replaced a
 * five-mood swiper whose dots sat under the brand mark looking like a setting
 * to configure. Nobody arrives at Messages to pick an expression.
 *
 * Cosmic Mode does not get a different character. It gets the mark's own
 * refit — the energy seam, the lit constellation points and the iris optics
 * that ExchangeNotesMark already carries behind its `cosmic` prop — plus the
 * rings and halo that CosmicYumiOrbit draws around it. Same body, more light.
 *
 * Decorative: the page is already titled, so this is aria-hidden rather than
 * competing with the heading for a screen reader's attention.
 */

type YumiCommsMarkProps = {
  cosmic?: boolean;
};

export default function YumiCommsMark({ cosmic = false }: YumiCommsMarkProps) {
  return (
    <div
      aria-hidden="true"
      className={`${styles.shell} ${cosmic ? styles.shellCosmic : ""}`}
    >
      <ExchangeNotesMark
        className={styles.logo}
        pupilClassName={styles.pupil}
        upperLidClassName={styles.upperLid}
        lowerLidClassName={styles.lowerLid}
        irisClassName={cosmic ? styles.iris : undefined}
        cosmic={cosmic}
        /*
         * Mid-range on purpose. The mark's own guidance is that idle sits low
         * so brightness still means something when it goes high; this is a
         * resting hub, not a notable moment, but it is also the one place the
         * character is the subject rather than a signature — enough to light
         * the seam and two constellation points, and no more.
         */
        energy={cosmic ? 0.5 : 0}
        surfaceColor="var(--msg-surface-soft)"
        highlightColor="var(--msg-surface)"
      />
    </div>
  );
}
