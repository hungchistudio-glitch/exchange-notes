"use client";

import { type CSSProperties, type ReactNode, useEffect, useState } from "react";

import useTranslation from "@/hooks/i18n/useTranslation";
import useVocabularyStats from "@/hooks/useVocabularyStats";
import type { VocabularyItem } from "@/lib/types/app";
import { fetchVocabulary, getCurrentUser } from "@/lib/vocabulary/repository";

import styles from "./ProgressHud.module.css";

function clampProgress(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
}

/*
 * The scale under a reading.
 *
 * Graduated like a real instrument — minor marks every twentieth, major every
 * quarter — because a row of identical ticks is a decoration and a graduated
 * one can be read. Where the reading is a rate the marks up to it are lit and
 * the rest stay dim, which is what makes 88% and 0% differ at a glance rather
 * than only in the two characters above them.
 *
 * `progress` is null for a count. "Words mastered: 4" has no full mark to be
 * four out of, so that scale carries no lit region and no pointer: an
 * instrument may not draw a reading against a maximum nobody set.
 */
function Scale({ progress }: { progress: number | null }) {
  const style =
    progress === null
      ? undefined
      : ({ "--progress": clampProgress(progress) } as CSSProperties);

  return (
    <div className={styles.ruler} aria-hidden="true" style={style}>
      <span className={styles.rulerTrack} />
      {progress !== null && (
        <>
          <span className={styles.rulerLit} />
          <span className={styles.rulerMarker} />
        </>
      )}
    </div>
  );
}

/**
 * The daily goal, as the panel's one dial.
 *
 * Sixty graduations with a major every fifth, a sweeping arc, and the reading
 * inside the ring rather than beside it — the arrangement that makes this the
 * instrument the rest of the panel is arranged around.
 */
function GoalDial({ value, children }: { value: number; children: ReactNode }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const clamped = clampProgress(value);

  return (
    <div className={styles.dial}>
      <svg viewBox="0 0 100 100" className={styles.dialSvg} aria-hidden="true">
        {Array.from({ length: 60 }, (_, index) => {
          const major = index % 5 === 0;

          return (
            <line
              key={index}
              className={major ? styles.dialTickMajor : styles.dialTick}
              x1="50"
              y1="2.5"
              x2="50"
              y2={major ? "9.5" : "6"}
              transform={`rotate(${index * 6} 50 50)`}
            />
          );
        })}
        <circle
          className={styles.track}
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth="3"
        />
        <circle
          className={styles.arc}
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          transform="rotate(-90 50 50)"
          style={{ strokeDashoffset: circumference * (1 - clamped) }}
        />
      </svg>
      <p className={styles.dialReading}>{children}</p>
    </div>
  );
}

function MetricCard({
  value,
  display,
  label,
  tone,
  unavailable,
}: {
  value: number;
  display: string;
  label: string;
  tone: "mint" | "pink";
  /** No reading to show: the value is a dash and the ruler keeps its marker off. */
  unavailable: boolean;
}) {
  return (
    <div className={`${styles.card} ${styles.metric} ${styles[tone]}`}>
      <p className={styles.cardLabel}>{label}</p>
      <p className={styles.metricValue}>{display}</p>
      <Scale progress={unavailable ? null : value} />
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
  /*
   * Accuracy and retention are rates over reviews. With no review behind
   * them there is no rate, and the empty values the maths falls back to —
   * 0% accuracy beside 100% retention — read as a verdict on someone who has
   * not started yet. The counts either side of them are real and stay.
   */
  const noReviewsYet = unavailable || reviewStats.reviewed === 0;
  /*
   * Five instruments with nothing to read, and not a word about why.
   *
   * The dashes above are the honest answer to "what is the accuracy of no
   * reviews", and they stay. What they cannot do is say which of the three
   * reasons they are dashes: still loading, failed to load, or nothing has
   * been reviewed yet. The first is over in a moment and the second already
   * speaks for itself in the alert above, so the only one left unsaid is the
   * one a new reader is actually in — and for them a panel of empty gauges
   * reads as something broken rather than as something not started.
   *
   * Deliberately not `noReviewsYet`: that folds the loading and error states
   * in, and telling someone their history is empty while it is still arriving
   * would be the same lie the dashes exist to avoid.
   */
  const nothingReviewedYet = !unavailable && reviewStats.reviewed === 0;

  return (
    <section className={styles.hud} aria-busy={loading}>
      <p className={styles.eyebrow}>{copy.eyebrow}</p>
      <h2 className={styles.title}>{copy.title}</h2>
      {loadError && (
        <p className={styles.error} role="alert">{t.common.error}</p>
      )}
      {nothingReviewedYet && (
        <p className={styles.waiting}>{copy.noReadings}</p>
      )}

      <div className={styles.cards}>
        <div className={`${styles.card} ${styles.goal}`}>
          <p className={styles.cardLabel}>{copy.dailyGoal}</p>
          <GoalDial value={unavailable ? 0 : todayAdded / dailyGoal}>
            {/*
              The dash stands alone while the reading is unavailable: "—/10"
              would be a target held against nothing.
            */}
            {unavailable ? (
              dash
            ) : (
              <>
                {todayAdded}
                <span className={styles.dialTarget}>/{dailyGoal}</span>
              </>
            )}
          </GoalDial>
        </div>

        <MetricCard
          value={reviewStats.accuracy / 100}
          display={noReviewsYet ? dash : `${reviewStats.accuracy}%`}
          label={copy.accuracy}
          tone="mint"
          unavailable={noReviewsYet}
        />
        <MetricCard
          value={reviewStats.retention / 100}
          display={noReviewsYet ? dash : `${reviewStats.retention}%`}
          label={copy.retention}
          tone="pink"
          unavailable={noReviewsYet}
        />

        <div className={`${styles.card} ${styles.tile} ${styles.blue}`}>
          <p className={styles.cardLabel}>{copy.mastered}</p>
          <p className={styles.tileValue}>
            {unavailable ? dash : reviewStats.mastered}
          </p>
          <Scale progress={null} />
        </div>

        <div className={`${styles.card} ${styles.tile} ${styles.amber}`}>
          <p className={styles.cardLabel}>{copy.reviewed}</p>
          <p className={styles.tileValue}>
            {unavailable ? dash : reviewStats.reviewed}
          </p>
          <Scale progress={null} />
        </div>
      </div>
    </section>
  );
}
