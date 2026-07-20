"use client";

import Link from "next/link";
import { ArrowUpRight, Brain, FolderOpen } from "lucide-react";

type Props = {
  todayProgress: number;
  todayGoal: number;
};

export default function VocabularyHero({
  todayProgress,
  todayGoal,
}: Props) {
  const percent =
    todayGoal === 0
      ? 0
      : Math.min(
          100,
          Math.round((todayProgress / todayGoal) * 100),
        );

  const remaining = Math.max(todayGoal - todayProgress, 0);
  const goalCompleted = todayProgress >= todayGoal;

  return (
    <section className="overflow-hidden rounded-[28px] bg-black px-5 py-5 text-white shadow-[0_12px_32px_rgba(0,0,0,0.12)] sm:px-6 sm:py-6">
      <div className="flex items-start justify-between gap-5">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
            Today&apos;s progress
          </p>

          <div className="mt-2 flex items-end gap-2">
            <h1 className="text-[42px] font-semibold leading-none tracking-[-0.055em]">
              {todayProgress}
            </h1>

            <span className="pb-1 text-sm font-medium text-white/40">
              of {todayGoal} words
            </span>
          </div>

          <p className="mt-3 text-sm leading-5 text-white/55">
            {goalCompleted
              ? "Daily goal complete. Keep the momentum going."
              : `${remaining} ${
                  remaining === 1 ? "word" : "words"
                } left to reach your goal.`}
          </p>
        </div>

        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.07]">
          <span className="text-sm font-semibold">{percent}%</span>
        </div>
      </div>

      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-white transition-[width] duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <Link
          href="/vocabulary/collections"
          className="group flex min-w-0 items-center gap-3 rounded-[18px] border border-white/10 bg-white/[0.06] px-3.5 py-3 transition hover:bg-white/[0.1] active:scale-[0.99]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10">
            <FolderOpen size={17} strokeWidth={1.8} />
          </span>

          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold">
              Collections
            </span>
            <span className="mt-0.5 block truncate text-[11px] text-white/40">
              Organize words
            </span>
          </span>

          <ArrowUpRight
            size={14}
            className="shrink-0 text-white/25 transition group-hover:text-white/55"
          />
        </Link>

        <Link
          href="/vocabulary/quiz"
          className="group flex min-w-0 items-center gap-3 rounded-[18px] border border-white/10 bg-white/[0.06] px-3.5 py-3 transition hover:bg-white/[0.1] active:scale-[0.99]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10">
            <Brain size={17} strokeWidth={1.8} />
          </span>

          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold">
              Quick Quiz
            </span>
            <span className="mt-0.5 block truncate text-[11px] text-white/40">
              Review now
            </span>
          </span>

          <ArrowUpRight
            size={14}
            className="shrink-0 text-white/25 transition group-hover:text-white/55"
          />
        </Link>
      </div>
    </section>
  );
}
