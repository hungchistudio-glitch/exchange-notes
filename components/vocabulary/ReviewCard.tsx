"use client";

import { useState } from "react";
import type { ReviewGrade } from "@/types/vocabulary";

type Props = {
  english: string;
  chinese: string;
  example?: string | null;
  onGrade: (grade: ReviewGrade) => void;
  disabled?: boolean;
};

const gradeButtons: Array<{
  grade: ReviewGrade;
  label: string;
  description: string;
  className: string;
}> = [
  {
    grade: "again",
    label: "Again",
    description: "Forgot",
    className: "border-red-200 bg-red-50 text-red-700",
  },
  {
    grade: "hard",
    label: "Hard",
    description: "Difficult",
    className: "border-orange-200 bg-orange-50 text-orange-700",
  },
  {
    grade: "good",
    label: "Good",
    description: "Remembered",
    className: "border-green-200 bg-green-50 text-green-700",
  },
  {
    grade: "easy",
    label: "Easy",
    description: "Very easy",
    className: "border-blue-200 bg-blue-50 text-blue-700",
  },
];

export default function ReviewCard({
  english,
  chinese,
  example,
  onGrade,
  disabled = false,
}: Props) {
  const [revealed, setRevealed] = useState(false);

  return (
    <article className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="min-h-64">
        <p className="text-sm font-medium uppercase tracking-widest text-neutral-400">
          Vocabulary
        </p>

        <h2 className="mt-4 text-4xl font-bold tracking-tight">
          {english}
        </h2>

        {revealed && (
          <div className="mt-8 space-y-4">
            <p className="text-2xl font-semibold text-neutral-800">
              {chinese}
            </p>

            {example && (
              <p className="rounded-2xl bg-neutral-50 p-4 leading-7 text-neutral-600">
                {example}
              </p>
            )}
          </div>
        )}
      </div>

      {!revealed ? (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="mt-6 w-full rounded-2xl bg-black px-5 py-4 font-semibold text-white transition hover:opacity-90"
        >
          Reveal Answer
        </button>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3">
          {gradeButtons.map((button) => (
            <button
              key={button.grade}
              type="button"
              disabled={disabled}
              onClick={() => onGrade(button.grade)}
              className={`rounded-2xl border px-4 py-3 text-left transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50 ${button.className}`}
            >
              <span className="block font-semibold">
                {button.label}
              </span>

              <span className="mt-1 block text-xs opacity-70">
                {button.description}
              </span>
            </button>
          ))}
        </div>
      )}
    </article>
  );
}
