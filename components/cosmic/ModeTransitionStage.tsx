"use client";

import type { CSSProperties } from "react";

import { useInterfaceMode } from "@/contexts/InterfaceModeContext";
import useTranslation from "@/hooks/i18n/useTranslation";

import styles from "./ModeTransitionStage.module.css";

// Six systems, matching the six controls on the deck, brought online one at a
// time. The stagger is what makes it read as a checklist rather than a flash.
const NODE_COUNT = 6;
const NODE_STAGGER_MS = 78;
const FIRST_NODE_DELAY_MS = 420;

/**
 * The scene that plays when the interface mode changes.
 *
 * Mounted only while a change is in flight — there is nothing here at rest,
 * and nothing here when the user prefers reduced motion, since the context
 * commits instantly in that case and never sets a phase.
 *
 * Announced to assistive technology as a status rather than mimed silently:
 * the screen is doing something for the better part of a second and a screen
 * reader user is entitled to know the mode change is under way.
 */
export default function ModeTransitionStage() {
  const { modeTransition } = useInterfaceMode();
  const { t } = useTranslation();

  if (!modeTransition) return null;

  const entering = modeTransition === "entering-cosmic";

  return (
    <div
      className={`${styles.stage} ${
        entering ? styles.entering : styles.leaving
      }`}
      role="status"
      aria-live="polite"
    >
      <div className={styles.veil} aria-hidden="true" />

      <div className={styles.core} aria-hidden="true">
        <span className={`${styles.ring} ${styles.ringOuter}`} />
        <span className={`${styles.ring} ${styles.ringInner}`} />
        <span className={styles.coreLight} />
        <span className={styles.pulse} />

        <div className={styles.nodes}>
          {Array.from({ length: NODE_COUNT }, (_, index) => (
            <div
              key={index}
              className={styles.node}
              style={
                {
                  "--angle": `${(360 / NODE_COUNT) * index}deg`,
                  "--node-delay": `${
                    FIRST_NODE_DELAY_MS + index * NODE_STAGGER_MS
                  }ms`,
                } as CSSProperties
              }
            >
              <span className={styles.nodeDot} />
            </div>
          ))}
        </div>
      </div>

      <span className="sr-only">
        {entering
          ? t.cosmic.transition.entering
          : t.cosmic.transition.leaving}
      </span>
    </div>
  );
}
