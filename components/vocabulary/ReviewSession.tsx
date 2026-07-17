"use client";

import { useState } from "react";
import ReviewCard from "./ReviewCard";
import { defaultVocabularyStats } from "@/types/vocabulary";
import { updateVocabularyStats } from "@/lib/review/updateVocabularyStats";

type ReviewWord = {
  id: string;
  english: string;
  chinese: string;
  example?: string | null;
};

type Props = {
  words: ReviewWord[];
};

export default function ReviewSession({
  words,
}: Props) {
  const [queue, setQueue] = useState(words);

  if (words.length === 0) {
    return (
      <div className="rounded-2xl border p-8 text-center">
        🎉 No words to review today.
      </div>
    );
  }

  if (queue.length === 0) {
    return (
      <div className="rounded-2xl border p-8 text-center">
        ✅ Today's Review Complete!
      </div>
    );
  }

  const word = queue[0];

  function handleCorrect() {
    console.log(
      updateVocabularyStats(
        defaultVocabularyStats,
        true
      )
    );

    setQueue((q) => q.slice(1));
  }

  function handleIncorrect() {
    console.log(
      updateVocabularyStats(
        defaultVocabularyStats,
        false
      )
    );

    setQueue((q) => {
      if (q.length === 0) return q;
      return [...q.slice(1), q[0]];
    });
  }

  return (
    <ReviewCard
      key={word.id}
      english={word.english}
      chinese={word.chinese}
      example={word.example}
      onCorrect={handleCorrect}
      onIncorrect={handleIncorrect}
    />
  );
}
