"use client";

import { useEffect, useMemo, useState } from "react";

import useInView from "@/hooks/useInView";
import useKnownWords from "@/hooks/useKnownWords";
import { comprehension } from "@/lib/discover/comprehension";
import { fill } from "@/lib/i18n/format";
import type { TranslationDictionary } from "@/lib/i18n/types";
import { getLanguage, type LanguageCode } from "@/lib/languages";

import styles from "./ComprehensionGauge.module.css";

/**
 * The comprehension scanner (Chi, 2026-11-28): an instrument on each
 * story that reads how many of its key words are already in the reader's
 * library. The arc sweeps to its reading once, when the story comes into
 * view; the number is a measured figure (.hud-figure).
 */
export default function ComprehensionGauge({
  text,
  language,
  copy,
  size = "sm",
}: {
  text: string;
  language: LanguageCode;
  copy: TranslationDictionary["discover"]["comprehension"];
  /** scope: in the featured card's scope, stacked; sm: a row's small reading. */
  size?: "scope" | "sm";
}) {
  const { marksFor } = useKnownWords();
  const speechTag = getLanguage(language).speechTag;
  const reading = useMemo(
    () => comprehension(text, speechTag, language, marksFor(text, speechTag)),
    [text, speechTag, language, marksFor],
  );
  const { ref, inView } = useInView<HTMLSpanElement>();
  // Armed a frame after mounting, so the arc is seen sweeping to its reading.
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setArmed(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  if (reading.total === 0) return null;

  const label = fill(copy.aria, { percent: String(reading.percent), known: String(reading.known), total: String(reading.total) });
  // A ring of 100 units: the reading is how much of it is drawn.
  return (
    <span
      ref={ref}
      className={styles.gauge}
      data-size={size}
      data-scanned={inView && armed ? "" : undefined}
      role="img"
      aria-label={label}
      title={label}
      style={{ "--reading": reading.percent } as React.CSSProperties}
    >
      <svg className={styles.ring} viewBox="0 0 36 36" aria-hidden="true">
        <circle className={styles.track} cx="18" cy="18" r="15.9155" pathLength={100} />
        <circle className={styles.ticks} cx="18" cy="18" r="12.4" pathLength={100} />
        <circle className={styles.arc} cx="18" cy="18" r="15.9155" pathLength={100} />
      </svg>
      <span className={`${styles.figure} hud-figure`}>{reading.percent}%</span>
      {size === "scope" && reading.total - reading.known > 0 ? (
        <span className={styles.caption}>{fill(copy.newWords, { count: String(reading.total - reading.known) })}</span>
      ) : null}
    </span>
  );
}
