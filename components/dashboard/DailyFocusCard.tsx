"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import useTranslation from "@/hooks/i18n/useTranslation";

type DailyFocusCardProps = {
  due: number;
  retention: number;
  accuracy: number;
  loading?: boolean;
};

type MetricProps = {
  label: string;
  value: string;
};

function Metric({
  label,
  value,
}: MetricProps) {
  return (
    <div className="border-t border-white/10 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/38">
        {label}
      </p>

      <p className="mt-2 text-[24px] font-semibold leading-none tracking-[-0.04em] text-white">
        {value}
      </p>
    </div>
  );
}

function insertCount(
  template: string,
  count: number,
) {
  return template.replace("{count}", String(count));
}

export default function DailyFocusCard({
  due,
  retention,
  accuracy,
  loading = false,
}: DailyFocusCardProps) {
  const { t } = useTranslation();
  const copy = t.home.dailyFocus;
  const hasReviews = due > 0;

  const sessionTitle = loading
    ? "—"
    : due === 1
      ? copy.wordReady
      : due > 1
        ? insertCount(copy.wordsReady, due)
        : copy.caughtUp;

  const description = hasReviews
    ? copy.reviewDescription
    : copy.caughtUpDescription;

  return (
    <article className="overflow-hidden rounded-[26px] bg-black p-5 text-white sm:p-6">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/38">
            {copy.cardEyebrow}
          </p>

          <h2 className="mt-3 whitespace-nowrap text-[clamp(26px,6vw,34px)] font-semibold leading-none tracking-[-0.045em]">
            {sessionTitle}
          </h2>
        </div>

        <span className="flex h-11 min-w-11 shrink-0 items-center justify-center rounded-full border border-white/15 text-sm font-semibold">
          {loading ? "—" : due}
        </span>
      </div>

      <p className="mt-4 max-w-sm text-sm leading-6 text-white/48">
        {loading ? "…" : description}
      </p>

      <div className="mt-7 grid grid-cols-2 gap-x-5">
        <Metric
          label={copy.retention}
          value={loading ? "—" : `${retention}%`}
        />

        <Metric
          label={copy.accuracy}
          value={loading ? "—" : `${accuracy}%`}
        />
      </div>

      <Link
        href={hasReviews ? "/review" : "/vocabulary"}
        className="group mt-2 flex items-center justify-between border-t border-white/10 pt-5"
      >
        <span className="text-sm font-semibold">
          {hasReviews
            ? copy.continueReview
            : copy.exploreVocabulary}
        </span>

        <ArrowUpRight
          aria-hidden="true"
          size={17}
          strokeWidth={1.8}
          className="text-white/45 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white"
        />
      </Link>
    </article>
  );
}
