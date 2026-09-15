"use client";

import { type CSSProperties, useEffect, useState } from "react";

import useTranslation from "@/hooks/i18n/useTranslation";
import useVocabularyStats from "@/hooks/useVocabularyStats";
import type { VocabularyItem } from "@/lib/types/app";
import { fetchVocabulary, getCurrentUser } from "@/lib/vocabulary/repository";

import styles from "./ProgressHud.module.css";

function clampProgress(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
}

/** The dial and its scale both read the same real daily-word progress. */
function GoalDial({ value }: { value: number }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const clamped = clampProgress(value);

  return (
    <div className={styles.dial} aria-hidden="true">
      <svg viewBox="0 0 100 100" className={styles.dialSvg}>
        {Array.from({ length: 40 }, (_, index) => (
          <line
            key={index}
            className={styles.dialTick}
            x1="50"
            y1="5"
            x2="50"
            y2={index % 5 === 0 ? "11" : "8"}
            transform={`rotate(${index * 9} 50 50)`}
          />
        ))}
        <circle
          className={styles.track}
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth="1"
        />
        <circle
          className={styles.arc}
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          transform="rotate(-90 50 50)"
          style={{
            strokeDashoffset: circumference * (1 - clamped),
          }}
        />
        <circle className={styles.dialCenter} cx="50" cy="50" r="19" />
        <path className={styles.dialCross} d="M46 50h8M50 46v8" />
      </svg>
    </div>
  );
}

function MetricCard({
  value,
  display,
  label,
  tone,
  loading,
}: {
  value: number;
  display: string;
  label: string;
  tone: "mint" | "pink";
  loading: boolean;
}) {
  return (
    <div className={`${styles.card} ${styles.metric} ${styles[tone]}`}>
      <p className={styles.cardLabel}>{label}</p>
      <p className={styles.metricValue}>{display}</p>
      <div
        className={styles.ruler}
        aria-hidden="true"
        style={{ "--progress": clampProgress(value) } as CSSProperties}
      >
        <span className={styles.rulerTrack} />
        {!loading && <span className={styles.rulerMarker} />}
      </div>
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
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const { reviewStats, todayAdded, dailyGoal } = useVocabularyStats(items);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const { user } = await getCurrentUser();

        if (!user) return;

        const vocabulary = await fetchVocabulary(user.id);

        if (!active) return;

        setItems((vocabulary ?? []) as VocabularyItem[]);
      } catch {
        // An unavailable history must never appear as zero progress.
        if (active) setLoadError(true);
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  const dash = "—";
  const unavailable = loading || loadError;

  return (
    <section className={styles.hud} aria-busy={loading}>
      <p className={styles.eyebrow}>{copy.eyebrow}</p>
      <h2 className={styles.title}>{copy.title}</h2>
      {loadError && (
        <p className={styles.error} role="alert">{t.common.error}</p>
      )}

      <div className={styles.cards}>
        <div className={`${styles.card} ${styles.goal}`}>
          <div className={styles.goalCopy}>
            <p className={styles.cardLabel}>{copy.dailyGoal}</p>
            <p className={styles.goalValue}>
              {unavailable ? (
                dash
              ) : (
                <>
                  {todayAdded}
                  <span className={styles.goalTarget}>/{dailyGoal}</span>
                </>
              )}
            </p>
          </div>
          <GoalDial value={unavailable ? 0 : todayAdded / dailyGoal} />
        </div>

        <MetricCard
          value={reviewStats.accuracy / 100}
          display={unavailable ? dash : `${reviewStats.accuracy}%`}
          label={copy.accuracy}
          tone="mint"
          loading={unavailable}
        />
        <MetricCard
          value={reviewStats.retention / 100}
          display={unavailable ? dash : `${reviewStats.retention}%`}
          label={copy.retention}
          tone="pink"
          loading={unavailable}
        />

        <div className={`${styles.card} ${styles.tile} ${styles.blue}`}>
          <p className={styles.cardLabel}>{copy.mastered}</p>
          <p className={styles.tileValue}>
            {unavailable ? dash : reviewStats.mastered}
          </p>
        </div>

        <div className={`${styles.card} ${styles.tile} ${styles.amber}`}>
          <p className={styles.cardLabel}>{copy.reviewed}</p>
          <p className={styles.tileValue}>
            {unavailable ? dash : reviewStats.reviewed}
          </p>
        </div>
      </div>
    </section>
  );
}
