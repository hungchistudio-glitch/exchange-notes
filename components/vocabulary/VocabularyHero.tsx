"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

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

  return (
    <section className="overflow-hidden rounded-[22px] bg-black px-5 py-5 text-white sm:px-6 sm:py-6">
      <div className="flex items-start justify-between gap-5">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-white/40">
            Vocabulary
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
            Today&apos;s progress
          </p>
        </div>

        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.22em] text-white/35">
            Completion
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
          ? "Daily target completed."
          : `${remaining} ${
              remaining === 1 ? "word" : "words"
            } remaining.`}
      </p>

      <div className="mt-6">
        <Metric label="Due Today" value={dueToday} />
        <Metric label="Retention" value={`${retention}%`} />
        <Metric label="Accuracy" value={`${accuracy}%`} />
        <Metric label="Weak Words" value={weakWords} />
        <Metric label="Total Words" value={totalWords} />
        <Metric label="Learning" value={learningWords} />
        <Metric label="Mastered" value={masteredWords} />
      </div>

      <div className="mt-3 grid grid-cols-2 border-y border-white/10">
        <Link
          href="/review"
          className="group flex min-w-0 items-center justify-between border-r border-white/10 py-4 pr-4"
        >
          <span>
            <span className="block text-[10px] uppercase tracking-[0.22em] text-white/35">
              Today
            </span>

            <span className="mt-1 block text-sm font-medium">
              Start Review
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
              Library
            </span>

            <span className="mt-1 block text-sm font-medium">
              Collections
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
