"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import useTranslation from "@/hooks/i18n/useTranslation";

type Props = {
  todayProgress: number;
  todayGoal: number;
  totalWords: number;
  learningWords: number;
  masteredWords: number;
  dueToday: number;
  accuracy: number;
  retention: number;
  weakWords: number;
};

type MetricProps = {
  label: string;
  value: string | number;
};

function Metric({ label, value }: MetricProps) {
  return (
    <div className="flex items-center justify-between border-t border-white/10 py-3">
      <span className="text-[10px] font-medium uppercase tracking-[0.24em] text-white/40">
        {label}
      </span>

      <span className="text-sm font-semibold tracking-tight text-white">
        {value}
      </span>
    </div>
  );
}

export default function VocabularyHero({
  todayProgress,
  todayGoal,
  totalWords,
  learningWords,
  masteredWords,
  dueToday,
  accuracy,
  retention,
  weakWords,
}: Props) {
  const { t } = useTranslation();
  const hero = t.vocabulary.hero;

  const percent =
    todayGoal <= 0
      ? 0
      : Math.min(
          100,
          Math.round((todayProgress / todayGoal) * 100),
        );

  const remaining = Math.max(todayGoal - todayProgress, 0);
  const goalCompleted =
    todayGoal > 0 && todayProgress >= todayGoal;

  const remainingMessage = (
    remaining === 1
      ? hero.wordRemaining
      : hero.wordsRemaining
  ).replace("{count}", String(remaining));

  return (
    <section className="overflow-hidden rounded-[22px] bg-black px-5 py-5 text-white sm:px-6 sm:py-6">
      <div className="flex items-start justify-between gap-5">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-white/40">
            {hero.vocabulary}
          </p>

          <div className="mt-5 flex items-baseline gap-2">
            <h1 className="text-[44px] font-semibold leading-none tracking-[-0.055em]">
              {todayProgress}
            </h1>

            <span className="text-sm font-medium text-white/35">
              / {todayGoal}
            </span>
          </div>

          <p className="mt-2 text-[10px] font-medium uppercase tracking-[0.22em] text-white/40">
            {hero.todayProgress}
          </p>
        </div>

        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.22em] text-white/35">
            {hero.completion}
          </p>

          <p className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
            {percent}%
          </p>
        </div>
      </div>

      <div className="mt-6 h-px bg-white/10">
        <div
          className="h-px bg-white transition-[width] duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>

      <p className="mt-4 text-xs leading-5 text-white/45">
        {goalCompleted
          ? hero.dailyTargetCompleted
          : remainingMessage}
      </p>

      <div className="mt-6">
        <Metric label={hero.dueToday} value={dueToday} />
        <Metric label={hero.retention} value={`${retention}%`} />
        <Metric label={hero.accuracy} value={`${accuracy}%`} />
        <Metric label={hero.weakWords} value={weakWords} />
        <Metric label={hero.totalWords} value={totalWords} />
        <Metric label={hero.learning} value={learningWords} />
        <Metric label={hero.mastered} value={masteredWords} />
      </div>

      <div className="mt-3 grid grid-cols-2 border-y border-white/10">
        <Link
          href="/review?from=vocabulary"
          className="group flex min-w-0 items-center justify-between border-r border-white/10 py-4 pr-4"
        >
          <span>
            <span className="block text-[10px] uppercase tracking-[0.22em] text-white/35">
              {hero.today}
            </span>

            <span className="mt-1 block text-sm font-medium">
              {hero.startReview}
            </span>
          </span>

          <ArrowUpRight
            size={15}
            strokeWidth={1.6}
            className="text-white/35 transition group-hover:text-white"
          />
        </Link>

        <Link
          href="/vocabulary/collections"
          className="group flex min-w-0 items-center justify-between py-4 pl-4"
        >
          <span>
            <span className="block text-[10px] uppercase tracking-[0.22em] text-white/35">
              {hero.library}
            </span>

            <span className="mt-1 block text-sm font-medium">
              {hero.collections}
            </span>
          </span>

          <ArrowUpRight
            size={15}
            strokeWidth={1.6}
            className="text-white/35 transition group-hover:text-white"
          />
        </Link>
      </div>
    </section>
  );
}
