"use client";

import { Flame } from "lucide-react";
import type { LearningStreak } from "@/lib/review/getLearningStreak";

type Props = {
  streak: LearningStreak;
};

export default function LearningStreakCard({
  streak,
}: Props) {
  const labels = ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <div className="rounded-3xl border bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <Flame className="h-5 w-5 text-orange-500" />
        <h2 className="text-lg font-semibold">
          Learning Streak
        </h2>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-4">
        <div>
          <div className="text-3xl font-bold">
            {streak.currentStreak}
          </div>
          <div className="text-sm text-neutral-500">
            Current
          </div>
        </div>

        <div>
          <div className="text-3xl font-bold">
            {streak.longestStreak}
          </div>
          <div className="text-sm text-neutral-500">
            Best
          </div>
        </div>

        <div>
          <div
            className={`text-lg font-semibold ${
              streak.reviewedToday
                ? "text-green-600"
                : "text-neutral-400"
            }`}
          >
            {streak.reviewedToday ? "✓ Today" : "Not yet"}
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-between">
        {streak.week.map((day, index) => (
          <div
            key={day.date}
            className="flex flex-col items-center gap-2"
          >
            <span className="text-xs text-neutral-400">
              {labels[index]}
            </span>

            <div
              className={`h-3 w-3 rounded-full ${
                day.active
                  ? "bg-black"
                  : "bg-neutral-200"
              }`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
