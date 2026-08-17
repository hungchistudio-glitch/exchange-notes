"use client";

import type { ReactNode } from "react";

import styles from "./CosmicCommsHero.module.css";

/*
 * The Cosmic Mode comms hero.
 *
 * Two exports rather than one, because the scene is two different things in
 * the layout: the environment spans the whole hero band and sits behind the
 * header, while the orbit is centred on Yumi inside the header's middle
 * column. They share one stylesheet because they are one visual system — the
 * rings echo the planet's curve, and both draw their light from --msg-accent,
 * so a change to either belongs in the same file.
 *
 * Both are decoration. Neither renders in Standard Mode: MessagesHub gates on
 * isCosmic rather than hiding these with CSS, so the default experience ships
 * none of this DOM. The brief is explicit that Cosmic visuals must not leak
 * halfway into the standard shell.
 */

/**
 * Starfield, communication lanes and the Earth's limb — everything behind the
 * header. Absolutely positioned; give the parent `position: relative`.
 */
export function CosmicCommsBackdrop() {
  return (
    <div className={styles.hero} aria-hidden="true">
      <div className={styles.starsFar} />
      <div className={styles.starsNear} />

      {/*
        Planetary communication lanes. Drawn rather than bordered so they can
        actually curve; kept to three, at an opacity that reads as suggestion.
      */}
      <svg
        className={styles.lanes}
        viewBox="0 0 900 260"
        preserveAspectRatio="none"
        fill="none"
      >
        <path
          d="M-40 232 C 210 150, 520 96, 940 128"
          stroke="var(--msg-accent)"
          strokeOpacity="0.16"
          strokeWidth="1"
        />
        <path
          d="M-40 254 C 260 196, 560 150, 940 176"
          stroke="var(--msg-accent)"
          strokeOpacity="0.1"
          strokeWidth="1"
        />
        <path
          d="M-40 122 C 180 66, 470 34, 940 58"
          stroke="#9ec9ee"
          strokeOpacity="0.07"
          strokeWidth="1"
        />
      </svg>

      <div className={styles.earthGroup}>
        <div className={styles.earthBloom} />
        <div className={styles.earthHalo} />
        <div className={styles.earth} />
        <div className={styles.earthSheen}>
          <div className={styles.earthSheenBar} />
        </div>
      </div>

      {[styles.meteorOne, styles.meteorTwo, styles.meteorThree].map(
        (position, index) => (
          <span key={index} className={`${styles.meteor} ${position}`}>
            <span className={styles.meteorBody} />
          </span>
        ),
      )}

      <div className={styles.textShield} />
      <div className={styles.bandFade} />
    </div>
  );
}

/**
 * The rings, signal nodes and two-source halo around Yumi, with the figure
 * itself slotted at the centre so the light lands on the real silhouette
 * rather than a copy of it.
 */
export function CosmicYumiOrbit({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex items-center justify-center">
      {/*
        Sized off the figure and allowed to overflow its column: the rings are
        decoration, so they must not claim layout width on a 375px screen.
      */}
      <div className={styles.orbit} aria-hidden="true">
        <div className={styles.halo} />

        <div
          className={styles.ringWrap}
          style={{ width: "180%", aspectRatio: "1" }}
        >
          <div className={styles.ring} />
          <span className={styles.node} />
        </div>

        <div
          className={`${styles.ringWrap} ${styles.ringTwo}`}
          style={{ width: "232%", aspectRatio: "1" }}
        >
          <div className={styles.ring} />
          <span className={`${styles.node} ${styles.nodeTrailing}`} />
        </div>

        <div
          className={`${styles.ringWrap} ${styles.ringThree}`}
          style={{ width: "248%", aspectRatio: "1" }}
        >
          <div className={styles.ring} />
        </div>
      </div>

      <div className={`${styles.float} relative z-10`}>
        <div className={styles.drift}>{children}</div>
      </div>
    </div>
  );
}
