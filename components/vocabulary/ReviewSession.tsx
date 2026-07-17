"use client";

import { useState } from "react";
import ReviewCard from "./ReviewCard";

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
  const [index, setIndex] = useState(0);

  if (words.length === 0) {
    return (
      <div className="rounded-2xl border p-8 text-center">
        🎉 No words to review today.
      </div>
    );
  }

  if (index >= words.length) {
    return (
      <div className="rounded-2xl border p-8 text-center">
        ✅ Today's Review Complete!
      </div>
    );
  }

  const word = words[index];

  function nextCard() {
    setIndex((i) => i + 1);
  }

  return (
    <ReviewCard
      key={word.id}
      english={word.english}
      chinese={word.chinese}
      example={word.example}
      onCorrect={nextCard}
      onIncorrect={nextCard}
    />
  );
}
