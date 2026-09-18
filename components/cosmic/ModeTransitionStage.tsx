"use client";

import type { CSSProperties } from "react";

import {
  useInterfaceMode,
  type ModeTransitionPhase,
} from "@/contexts/InterfaceModeContext";
import useTranslation from "@/hooks/i18n/useTranslation";

import styles from "./ModeTransitionStage.module.css";

/*
 * Six systems, matching the six controls on the deck, brought online one at a
 * time. The stagger is what makes it read as a checklist rather than a flash.
 *
 * The checklist has to finish inside the scene that is carrying it, and it did
 * not. Each dot ran for 620ms from a delay of up to 810ms, ending at 1430ms
 * against an entering scene that is torn down at 1150 — so four of the six
 * were still on screen when the stage unmounted, and the veil had already
 * faded to nothing by then, which meant they vanished as four lit dots over a
 * deck that was fully visible behind them. Standing down was worse: the same
 * delays against an 800ms scene left the last dot still waiting out its delay
 * when the scene ended, holding the 0.9 opacity its fill-mode gives it, so it
 * never went off at all.
 *
 * The two schedules below are the same checklist at the two lengths, and
 * `tests/modeTransitionTiming.test.ts` holds both of them inside their scene.
 * 340ms is also what a dot already took to go off, so the dot now costs the
 * same either way and only the ordering changes.
 */
const NODE_COUNT = 6;
const NODE_DURATION_MS = 340;
const NODE_STAGGER_MS = 78;
const FIRST_NODE_DELAY_MS = 420;
// Standing down is a shorter scene, so the same six land in less of it.
const LEAVE_NODE_STAGGER_MS = 52;
const LEAVE_FIRST_NODE_DELAY_MS = 120;

/** When the last system finishes, for the scene of the given length. */
export function lastNodeEndsAt(phase: ModeTransitionPhase) {
  const entering = phase === "entering-cosmic";
  const first = entering ? FIRST_NODE_DELAY_MS : LEAVE_FIRST_NODE_DELAY_MS;
  const stagger = entering ? NODE_STAGGER_MS : LEAVE_NODE_STAGGER_MS;

  return first + (NODE_COUNT - 1) * stagger + NODE_DURATION_MS;
}

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

  return <ModeTransitionScene phase={modeTransition} />;
}

/**
 * The scene itself, told which half it is playing.
 *
 * Split from the shell above for the same reason the Progress HUD's display
 * half is: the mode change lives behind a sign-in, and a sequence that lasts
 * 1150ms is not something to verify by describing it. The review route drives
 * this with the real constants, so what is inspected there is the scene that
 * ships and not a second drawing of it.
 *
 * `null` renders nothing, which is what "no change in flight" looks like —
 * the shell above has no state of its own to hold.
 */
export function ModeTransitionScene({
  phase,
}: {
  phase: ModeTransitionPhase | null;
}) {
  const { t } = useTranslation();

  if (!phase) return null;

  const entering = phase === "entering-cosmic";

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
                    (entering
                      ? FIRST_NODE_DELAY_MS
                      : LEAVE_FIRST_NODE_DELAY_MS) +
                    index *
                      (entering ? NODE_STAGGER_MS : LEAVE_NODE_STAGGER_MS)
                  }ms`,
                  "--node-duration": `${NODE_DURATION_MS}ms`,
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
