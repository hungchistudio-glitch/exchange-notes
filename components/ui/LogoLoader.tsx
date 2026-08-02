"use client";

import ExchangeNotesMark from "./ExchangeNotesMark";
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
        <ExchangeNotesMark
          className={styles.logo}
          upperLidClassName={styles.upperLid}
          lowerLidClassName={styles.lowerLid}
          surfaceColor="#f0efec"
          highlightColor="#ffffff"
          withTile
        />
      </div>

      <span className={styles.srOnly}>{label}</span>
    </div>
  );
}
