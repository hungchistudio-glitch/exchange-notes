"use client";

import type { CSSProperties, ReactNode } from "react";

import OnboardingYumi from "@/components/onboarding/OnboardingYumi";
import styles from "@/components/tutorial/TutorialStage.module.css";

export type StagePerformance = "enter" | "finale" | "prop";

type TutorialStageProps = {
  performance: StagePerformance;
  children?: ReactNode;
};

/* Eight sparks thrown outward, each landing on its own delay so the burst
   reads as scattered rather than as a ring opening. */
const SPARKS = [
  { dx: -74, dy: -26, delay: 760 },
  { dx: -46, dy: -64, delay: 820 },
  { dx: 4, dy: -82, delay: 780 },
  { dx: 54, dy: -60, delay: 840 },
  { dx: 78, dy: -18, delay: 800 },
  { dx: 60, dy: 26, delay: 880 },
  { dx: -58, dy: 30, delay: 860 },
  { dx: -18, dy: 44, delay: 900 },
];

/**
 * The performance layer for a tour step's visual.
 *
 * Remounted on every step change by the caller's key, which is what restarts
 * the CSS. Nothing here loops: Yumi lands, and from then on only her existing
 * per-mood idle is running.
 */
export default function TutorialStage({
  performance,
  children,
}: TutorialStageProps) {
  if (performance === "prop") {
    return <div className={styles.stageEnter}>{children}</div>;
  }

  const isFinale = performance === "finale";

  return (
    <div className="relative flex flex-col items-center">
      <div
        className={isFinale ? styles.yumiFinale : styles.yumiEnter}
      >
        <OnboardingYumi mood={isFinale ? "excited" : "curious"} />
      </div>

      {/* Sits under her and moves in counterpoint — widest exactly when she
          is flattest. */}
      <div
        className={`w-24 ${styles.shadow} ${
          isFinale ? styles.shadowFinale : styles.shadowEnter
        }`}
      />

      {isFinale && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-1/2"
        >
          {SPARKS.map((spark, index) => (
            <span
              key={index}
              className={styles.spark}
              style={
                {
                  "--dx": `${spark.dx}px`,
                  "--dy": `${spark.dy}px`,
                  animationDelay: `${spark.delay}ms`,
                } as CSSProperties
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
