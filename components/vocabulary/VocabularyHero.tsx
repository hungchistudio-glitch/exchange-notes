"use client";

import { FolderOpen, Brain } from "lucide-react";

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
          Math.round((todayProgress / todayGoal) * 100)
        );

  return (
    <section className="mb-8 overflow-hidden rounded-[32px] bg-black p-7 text-white shadow-xl">

      <p className="text-sm text-white/60">
        Today's Review
      </p>

      <h1 className="mt-2 text-5xl font-bold tracking-tight">
        {todayProgress}
        <span className="ml-2 text-2xl text-white/45">
          / {todayGoal}
        </span>
      </h1>

      <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/15">
        <div
          className="h-full rounded-full bg-white transition-all duration-500"
          style={{
            width: `${percent}%`,
          }}
        />
      </div>

      <div className="mt-2 flex justify-between text-xs text-white/55">
        <span>Today's Progress</span>
        <span>{percent}%</span>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3">

        <button
          className="rounded-2xl bg-white/10 p-4 text-left transition hover:bg-white/15"
        >
          <FolderOpen
            size={18}
            className="mb-3"
          />

          <div className="font-semibold">
            Collections
          </div>

          <div className="mt-1 text-xs text-white/55">
            Organize words
          </div>
        </button>

        <button
          className="rounded-2xl bg-white/10 p-4 text-left transition hover:bg-white/15"
        >
          <Brain
            size={18}
            className="mb-3"
          />

          <div className="font-semibold">
            Quick Quiz
          </div>

          <div className="mt-1 text-xs text-white/55">
            2 minute review
          </div>
        </button>

      </div>

    </section>
  );
}
