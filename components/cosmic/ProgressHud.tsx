"use client";

import { useEffect, useState } from "react";

import useDailyGoalMinutes from "@/hooks/preferences/useDailyGoalMinutes";
import useTranslation from "@/hooks/i18n/useTranslation";
import useVocabularyStats from "@/hooks/useVocabularyStats";
import type { VocabularyItem } from "@/lib/types/app";
import { fetchVocabulary, getCurrentUser } from "@/lib/vocabulary/repository";

import styles from "./ProgressHud.module.css";

/**
 * A single arc gauge.
 *
 * SVG rather than a conic gradient so the arc can be a stroke with a round
 * cap and a track behind it, and so the sweep animates by interpolating
 * stroke-dashoffset — one composited property, no repaint of a gradient on
 * every frame.
 */
function Gauge({
  value,
  display,
  label,
  tone,
}: {
  /** 0–1. Anything outside that is clamped rather than drawn wrong. */
  value: number;
  display: string;
  label: string;
  tone: "cyan" | "violet" | "amber";
}) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, value));

  return (
    <div className={styles.gauge}>
      <svg viewBox="0 0 80 80" className={styles.gaugeSvg} aria-hidden="true">
        <circle
          className={styles.track}
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          strokeWidth="5"
        />
        <circle
          className={`${styles.arc} ${styles[tone]}`}
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{
            // Drawn from the full-circle offset so the arc sweeps into place
            // rather than appearing at its final length.
            ["--arc-offset" as string]: `${circumference * (1 - clamped)}`,
            ["--arc-length" as string]: `${circumference}`,
          }}
        />
      </svg>

      <span className={styles.gaugeValue}>{display}</span>
      <span className={`hud-label ${styles.gaugeLabel}`}>{label}</span>
    </div>
  );
}

/**
 * The Progress HUD — Cosmic Mode's read on how the learning is going.
 *
 * Every figure here is one the app already derives from the user's own
 * vocabulary: accuracy and retention from the review history, words mastered
 * from the learning state, and the daily goal from their own setting. There
 * is no level, no rank and no score — nothing on this panel is a number
 * invented to fill an instrument.
 */
export default function ProgressHud() {
  const { t } = useTranslation();
  const copy = t.cosmic.hud;
  const dailyGoal = useDailyGoalMinutes();

  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { reviewStats } = useVocabularyStats(items);

  useEffect(() => {
    let active = true;

    async function load() {
      const { user } = await getCurrentUser();

      if (!user) {
        if (active) setLoading(false);
        return;
      }

      const vocabulary = await fetchVocabulary(user.id);

      if (!active) return;

      setItems((vocabulary ?? []) as VocabularyItem[]);
      setLoading(false);
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  const dash = "—";

  return (
    <section className={`hud-frame ${styles.hud}`}>
      <p className="hud-label">{copy.eyebrow}</p>
      <h2 className={styles.title}>{copy.title}</h2>

      <div className={styles.gauges}>
        <Gauge
          value={reviewStats.accuracy / 100}
          display={loading ? dash : `${reviewStats.accuracy}%`}
          label={copy.accuracy}
          tone="cyan"
        />
        <Gauge
          value={reviewStats.retention / 100}
          display={loading ? dash : `${reviewStats.retention}%`}
          label={copy.retention}
          tone="violet"
        />
        <Gauge
          // The goal is the whole ring by definition — it is a target, not a
          // measurement, so the arc shows the target rather than pretending
          // to know how much of today has been spent against it.
          value={1}
          display={`${dailyGoal}m`}
          label={copy.dailyGoal}
          tone="amber"
        />
      </div>

      <div className={styles.tiles}>
        <div className={styles.tile}>
          <p className={styles.tileValue}>
            {loading ? dash : reviewStats.mastered}
          </p>
          <p className={`hud-label ${styles.tileLabel}`}>{copy.mastered}</p>
        </div>

        <div className={styles.tile}>
          <p className={styles.tileValue}>
            {loading ? dash : reviewStats.reviewed}
          </p>
          <p className={`hud-label ${styles.tileLabel}`}>{copy.reviewed}</p>
        </div>
      </div>
    </section>
  );
}
