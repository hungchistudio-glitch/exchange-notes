"use client";

import { useState } from "react";

type Props = {
  english: string;
  chinese: string;
  example?: string;
  onCorrect?: () => void;
  onIncorrect?: () => void;
};

export default function ReviewCard({
  english,
  chinese,
  example,
  onCorrect,
  onIncorrect,
}: Props) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm">
      <div className="space-y-4">

        <h2 className="text-3xl font-bold">
          {english}
        </h2>

        {revealed && (
          <>
            <p className="text-lg text-neutral-700">
              {chinese}
            </p>

            {example && (
              <p className="text-sm text-neutral-500">
                {example}
              </p>
            )}
          </>
        )}

        {!revealed ? (
          <button
            onClick={() => setRevealed(true)}
            className="w-full rounded-xl bg-black py-3 text-white"
          >
            Reveal Answer
          </button>
        ) : (
          <div className="grid grid-cols-2 gap-3">

            <button
              onClick={onIncorrect}
              className="rounded-xl border py-3"
            >
              ❌ Again
            </button>

            <button
              onClick={onCorrect}
              className="rounded-xl bg-green-600 py-3 text-white"
            >
              ✅ Got it
            </button>

          </div>
        )}

      </div>
    </div>
  );
}
