"use client";

import styles from "./LogoLoader.module.css";

type LogoLoaderProps = {
  fullScreen?: boolean;
  label?: string;
  compact?: boolean;
};

export default function LogoLoader({
  fullScreen = true,
  label = "Loading",
  compact = false,
}: LogoLoaderProps) {
  return (
    <div
      className={[
        styles.wrapper,
        fullScreen ? styles.fullScreen : styles.inline,
        compact ? styles.compact : "",
      ]
        .filter(Boolean)
        .join(" ")}
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className={styles.logoShell}>
        <svg
          className={styles.logo}
          viewBox="0 0 400 400"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <rect x="0" y="0" width="400" height="400" rx="88" fill="#f0efec" />

          <path
            d="M 300,70 Q 110,70 100,180"
            fill="none"
            stroke="#111111"
            strokeWidth="52"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <path
            d="M 100,180 Q 110,320 300,320"
            fill="none"
            stroke="#111111"
            strokeWidth="52"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <path
            d="M 100,180 L 250,180"
            fill="none"
            stroke="#111111"
            strokeWidth="52"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          <circle
            cx="285"
            cy="180"
            r="40"
            fill="#f0efec"
            stroke="#111111"
            strokeWidth="12"
          />

          <g className={styles.eye}>
            <circle cx="294" cy="172" r="14" fill="#111111" />
            <circle cx="300" cy="166" r="5" fill="#f0efec" />
          </g>
        </svg>
      </div>

      <span className={styles.srOnly}>{label}</span>
    </div>
  );
}
