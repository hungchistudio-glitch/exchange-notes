"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import type { CSSProperties, MouseEvent } from "react";

import useTranslation from "@/hooks/i18n/useTranslation";
import useInView from "@/hooks/useInView";
import FeatureMark from "@/components/features/FeatureMark";
import { flyIntoFeature } from "@/lib/motion/featureFlight";

import styles from "./DailyFocusCard.module.css";

type DailyFocusCardProps = {
  due: number;
  /** Words answered today that are no longer due. */
  clearedToday?: number;
  retention: number;
  accuracy: number;
  /** Reviews ever answered. With none, the two rates are not 100% and 0%: there is no reading yet. */
  reviewed: number;
  loading?: boolean;
  /** Where "Continue review" goes. */
  reviewHref?: string;
};

/** More words than this share their cells, so the track keeps one row. */
export const FOCUS_MAX_CELLS = 24;
/** The track a reader with nothing due today sees, every cell lit. */
const CLEAR_CELLS = 12;

/**
 * Which cells are lit: today's queue (cleared plus still due), one cell a
 * word, or shared out over FOCUS_MAX_CELLS when there are more. A cell
 * only lights when the words it stands for are all cleared, so the track
 * never reads finished before the queue is.
 */
export function focusCells(due: number, cleared: number): boolean[] {
  const total = due + cleared;
  if (total === 0) return Array.from({ length: CLEAR_CELLS }, () => true);
  const count = Math.min(total, FOCUS_MAX_CELLS);
  const lit = due === 0 ? count : Math.min(count - 1, Math.floor((cleared / total) * count));
  return Array.from({ length: count }, (_, index) => index < lit);
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function fill(template: string, values: Record<string, number>) {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  );
}

/*
 * Daily Focus, as a mission readout (Chi, 2026-11-12: 任務 HUD).
 *
 * It used to say the same number twice (the title and a badge), add a
 * sentence repeating the title, and spend a third of the card on two rates
 * that read "—" until the first review. Now: a tally, a track of today's
 * queue with one cell a word that lights as each is cleared, the one thing
 * to do, and the two rates in a single quiet line once they mean something.
 *
 * Cosmic draws it as obsidian glass like the home's bridge, not the cream
 * card that was the brightest thing on a dark page; Standard keeps a dark
 * card on its pearl page.
 *
 * "Continue review" opens Practice the way the halo does: Practice's key
 * rises out of the button and flies to the Review page's title
 * (lib/motion/featureFlight.ts). It stays a link, so a modified click
 * still opens a tab.
 */
export default function DailyFocusCard({
  due,
  clearedToday = 0,
  retention,
  accuracy,
  reviewed,
  loading = false,
  reviewHref = "/review",
}: DailyFocusCardProps) {
  // The same rule as Settings' Learning overview (LearningProgressPanel).
  const noRates = loading || reviewed === 0;
  const { t } = useTranslation();
  const router = useRouter();
  const { ref, inView } = useInView<HTMLElement>();
  const copy = t.home.dailyFocus;
  const hasReviews = !loading && due > 0;
  const total = due + clearedToday;

  const sessionTitle = loading
    ? "—"
    : due === 1
      ? copy.wordReady
      : due > 1
        ? fill(copy.wordsReady, { count: due })
        : copy.caughtUp;

  const cells = loading
    ? Array.from({ length: CLEAR_CELLS }, () => false)
    : focusCells(due, clearedToday);
  const next = hasReviews ? cells.indexOf(false) : -1;

  function openReview(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const source = event.currentTarget.querySelector("[data-flight-source]") ?? event.currentTarget;
    flyIntoFeature({ source, feature: "review", go: () => router.push(reviewHref) });
  }

  return (
    <article
      ref={ref}
      className={`${styles.hud} ob-edge`}
      data-state={loading ? "loading" : hasReviews ? "due" : "clear"}
      data-in-view={inView ? "true" : "false"}
    >
      <div className={styles.top}>
        <p className={styles.eyebrow}>{copy.cardEyebrow}</p>
        <p className={styles.tally} aria-hidden="true">
          {loading ? (
            "— / —"
          ) : (
            <>
              <span className={styles.done}>{pad(clearedToday)}</span>
              <span className={styles.slash}>/</span>
              <span>{pad(total)}</span>
            </>
          )}
        </p>
      </div>

      <div
        className={styles.track}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={clearedToday}
        aria-label={fill(copy.progressLabel, { done: clearedToday, total })}
      >
        {cells.map((lit, index) => (
          <span
            key={index}
            className={styles.cell}
            data-lit={lit ? "true" : "false"}
            data-next={index === next ? "true" : undefined}
            style={{ "--i": index } as CSSProperties}
          />
        ))}
      </div>

      <div className={styles.bottom}>
        <h2 className={styles.title}>{sessionTitle}</h2>
        {hasReviews ? (
          <Link href={reviewHref} className={styles.go} onClick={openReview}>
            <FeatureMark feature="review" size="sm" flightSource />
            <span>{copy.continueReview}</span>
            <ArrowRight aria-hidden="true" size={15} strokeWidth={1.9} />
          </Link>
        ) : null}
      </div>

      {noRates ? null : (
        <p className={styles.readout}>
          <span>
            {copy.retention} <b>{retention}%</b>
          </span>
          <span>
            {copy.accuracy} <b>{accuracy}%</b>
          </span>
        </p>
      )}
    </article>
  );
}
