"use client";

import { useEffect, useState } from "react";
import styles from "./AppSplash.module.css";

const SPLASH_SESSION_KEY = "exchange-notes-splash-seen";

type SplashPhase = "hidden" | "active" | "leaving";

export default function AppSplash() {
  const [phase, setPhase] = useState<SplashPhase>("hidden");

  useEffect(() => {
    const forceReplay = new URLSearchParams(window.location.search).has(
      "intro",
    );

    const alreadySeen =
      window.sessionStorage.getItem(SPLASH_SESSION_KEY) === "true";

    if (alreadySeen && !forceReplay) {
      setPhase("hidden");
      return;
    }

    setPhase("active");

    const leaveTimer = window.setTimeout(() => {
      setPhase("leaving");
    }, 2300);

    const removeTimer = window.setTimeout(() => {
      window.sessionStorage.setItem(SPLASH_SESSION_KEY, "true");
      setPhase("hidden");
    }, 3000);

    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(removeTimer);
    };
  }, []);

  if (phase === "hidden") return null;

  return (
    <div
      className={[styles.splash, phase === "leaving" ? styles.leaving : ""]
        .filter(Boolean)
        .join(" ")}
      role="status"
      aria-label="Opening Exchange Notes"
    >
      <div className={styles.logoWrap}>
        <svg
          className={styles.logo}
          viewBox="0 0 400 400"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M 300,70 Q 110,70 100,180"
            fill="none"
            stroke="currentColor"
            strokeWidth="52"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <path
            d="M 100,180 Q 110,320 300,320"
            fill="none"
            stroke="currentColor"
            strokeWidth="52"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <path
            d="M 100,180 L 250,180"
            fill="none"
            stroke="currentColor"
            strokeWidth="52"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <circle
            cx="285"
            cy="180"
            r="40"
            fill="transparent"
            stroke="currentColor"
            strokeWidth="12"
          />

          <g className={styles.eye}>
            <g className={styles.pupil}>
              <circle cx="294" cy="172" r="14" fill="currentColor" />

              <circle cx="300" cy="166" r="5" className={styles.eyeHighlight} />
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}
