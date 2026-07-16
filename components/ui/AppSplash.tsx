"use client";

import { useState } from "react";
import styles from "./AppSplash.module.css";

export default function AppSplash() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div
      className={styles.splash}
      role="status"
      aria-label="Opening Exchange Notes"
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget) {
          setVisible(false);
        }
      }}
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
