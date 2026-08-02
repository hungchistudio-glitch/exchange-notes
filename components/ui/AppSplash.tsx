"use client";

import { useCallback, useEffect, useRef } from "react";

import ExchangeNotesMark from "./ExchangeNotesMark";
import styles from "./AppSplash.module.css";

type AppSplashProps = {
  onComplete?: () => void;
};

const FALLBACK_DURATION_MS = 3600;

export default function AppSplash({ onComplete }: AppSplashProps) {
  const completedRef = useRef(false);

  const complete = useCallback(() => {
    if (completedRef.current) return;

    completedRef.current = true;
    onComplete?.();
  }, [onComplete]);

  useEffect(() => {
    const fallbackTimer = window.setTimeout(
      complete,
      FALLBACK_DURATION_MS
    );

    return () => {
      window.clearTimeout(fallbackTimer);
    };
  }, [complete]);

  return (
    <div
      className={styles.splash}
      role="status"
      aria-live="polite"
      aria-label="Opening Exchange Notes"
      onAnimationEnd={(event) => {
        if (event.target !== event.currentTarget) return;
        complete();
      }}
    >
      <div className={styles.logoPosition}>
        <div className={styles.logoArrival}>
          <div className={styles.logoBreath}>
            <ExchangeNotesMark
              className={styles.logo}
              pupilClassName={styles.pupil}
              upperLidClassName={styles.upperLid}
              lowerLidClassName={styles.lowerLid}
              surfaceColor="#f5f3ed"
              highlightColor="#ffffff"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
