"use client";

import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";

import { useVocabulary } from "@/contexts/VocabularyContext";
import useTranslation from "@/hooks/i18n/useTranslation";
import useVocabularyStats from "@/hooks/useVocabularyStats";
import type { ReviewAnalytics } from "@/lib/review/analytics";

import styles from "./LearningProgressPanel.module.css";

/*
 * The four readings the home screen used to carry.
 *
 * Accuracy, retention, mastered and to-revisit were the bottom of the old
 * home, under "學習總覽". The home is only Yumi now, so they had nowhere to
 * be — and unlike the cards that moved to the vocabulary screen, these are
 * not about today's words. They are about how the learning is going, which
 * is a question you ask on purpose rather than one the app should answer at
 * you every time you open it.
 *
 * Settings is where that question already lives: Cosmic Mode's ProgressHud
 * sits in exactly this slot. This is Standard Mode's counterpart, drawn the
 * way Standard Mode draws things — see the stylesheet beside this file.
 */

type Reading = {
  label: string;
  value: string;
  unit?: string;
  sublabel: string;
  /**
   * Where the reading sits on a scale of a hundred, for the two that are
   * rates. Left out for the two that are counts — there is no full mark to
   * draw them against — and left out for every card while the answer is not
   * yet known.
   */
  reading?: number;
};

function Tile({ label, value, unit, sublabel, reading }: Reading) {
  return (
    <div className={styles.tile}>
      <dt className={styles.head}>
        <span className={styles.index} aria-hidden="true" />
        <span className={styles.label}>{label}</span>
      </dt>

      <dd className={styles.value}>
        {value}
        {unit ? <span className={styles.unit}>{unit}</span> : null}
      </dd>

      {reading === undefined ? (
        <div className={styles.noScale} aria-hidden="true" />
      ) : (
        <div
          className={styles.scale}
          // Clamped here rather than trusted: the maths upstream is bounded,
          // and a bar drawn at 140% would be the one place that stopped being
          // true without anybody noticing.
          style={
            {
              "--reading": Math.max(0, Math.min(100, reading)),
            } as CSSProperties
          }
          aria-hidden="true"
        />
      )}

      <dd className={styles.sublabel}>{sublabel}</dd>
    </div>
  );
}

/** The same vocabulary snapshot the library screen uses; no second request. */
export default function LearningProgressPanel() {
  const { items, loading, error } = useVocabulary();
  const { reviewStats } = useVocabularyStats(items);

  return (
    <LearningProgressPanelDisplay
      readings={reviewStats}
      loading={loading}
      loadError={Boolean(error)}
    />
  );
}

/**
 * The instruments, with the readings handed to them.
 *
 * Split from the component above so a review route can hold the panel at a
 * chosen set of figures without an account or a seeded database behind it.
 * The fetching half stays above, so nothing that ships to a reader can pass
 * this panel a number the app did not derive.
 */
export function LearningProgressPanelDisplay({
  readings,
  loading = false,
  loadError = false,
}: {
  readings: ReviewAnalytics;
  loading?: boolean;
  loadError?: boolean;
}) {
  const { t } = useTranslation();
  const copy = t.home.progress;

  const unavailable = loading || loadError;
  /*
   * Accuracy and retention are rates over reviews. With no review behind
   * them there is nothing to be a rate of, and 0% beside 100% is a verdict
   * on somebody who has not started — so both show a dash instead, and the
   * two counts either side of them, which are real from the first word
   * saved, still show their figures.
   */
  const noRates = unavailable || readings.reviewed === 0;
  const dash = "—";

  const values: Reading[] = [
    {
      label: copy.accuracy,
      value: noRates ? dash : String(readings.accuracy),
      unit: noRates ? undefined : "%",
      sublabel: unavailable
        ? dash
        : copy.totalReviews.replace("{count}", String(readings.reviewed)),
      reading: noRates ? undefined : readings.accuracy,
    },
    {
      label: copy.retention,
      value: noRates ? dash : String(readings.retention),
      unit: noRates ? undefined : "%",
      sublabel: copy.memoryStrength,
      reading: noRates ? undefined : readings.retention,
    },
    {
      label: copy.mastered,
      value: unavailable ? dash : String(readings.mastered),
      sublabel: copy.wordsCompleted,
    },
    {
      label: copy.practice,
      value: unavailable ? dash : String(readings.weak),
      sublabel: copy.wordsToRevisit,
    },
  ];

  return (
    <div
      className={`settings-progress ${styles.panel}`}
      // Explicit false rather than absent: "not busy" is a state worth
      // announcing on a panel whose figures arrive a moment after it does.
      aria-busy={loading}
    >
      {loadError ? (
        <p role="alert" className={styles.notice}>
          {t.common.error}
        </p>
      ) : null}

      {!unavailable && readings.reviewed === 0 ? (
        <p className={styles.notice}>{t.cosmic.hud.noReadings}</p>
      ) : null}

      <dl className={styles.grid}>
        {values.map((value) => (
          <Tile key={value.label} {...value} />
        ))}
      </dl>

      {/* Four readings about how the reviewing is going, with no way to
          review from here, would be a dashboard. */}
      {unavailable ? null : (
        <Link href="/review" className={styles.review}>
          <span>{copy.continueReview}</span>
          <ArrowUpRight size={16} aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
