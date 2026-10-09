"use client";

import type { CSSProperties } from "react";
import type { ModeTransitionPhase } from "@/contexts/InterfaceModeContext";
import type { EclipseTransition } from "@/lib/home/eclipse";
import useTranslation from "@/hooks/i18n/useTranslation";
import styles from "./EclipseTransitionScene.module.css";

export default function EclipseTransitionScene({ phase, eclipse }: { phase: ModeTransitionPhase; eclipse: EclipseTransition }) {
  const { t } = useTranslation();
  return <div className={styles.stage} data-eclipse={phase} role="status" aria-live="polite"
    style={{ "--eclipse-x": `${eclipse.x}px`, "--eclipse-y": `${eclipse.y}px`, "--eclipse-diameter": `${eclipse.radius * 2}px`, "--eclipse-duration": `${eclipse.duration}ms` } as CSSProperties}>
    <div className={styles.wave} aria-hidden="true" />
    <div className={styles.halo} aria-hidden="true" />
    <span className="sr-only">{phase === "entering-cosmic" ? t.cosmic.transition.entering : t.cosmic.transition.leaving}</span>
  </div>;
}
