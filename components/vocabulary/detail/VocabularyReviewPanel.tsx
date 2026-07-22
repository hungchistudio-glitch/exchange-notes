"use client";

import { Frown, PartyPopper, RotateCcw, Smile } from "lucide-react";

import AppButton from "@/components/ui/AppButton";
import SectionCard from "@/components/vocabulary/detail/VocabularySection";

type Rating = "again" | "hard" | "good" | "easy";

type Props = {
  onRate?: (rating: Rating) => void;
};

export default function VocabularyReviewPanel({ onRate }: Props) {
  const buttons = [
    {
      key: "again",
      label: "Again",
      icon: RotateCcw,
    },
    {
      key: "hard",
      label: "Hard",
      icon: Frown,
    },
    {
      key: "good",
      label: "Good",
      icon: Smile,
    },
    {
      key: "easy",
      label: "Easy",
      icon: PartyPopper,
    },
  ] as const;

  return (
    <SectionCard
      title="Review this word"
      description="How well did you remember it?"
    >
      <div className="grid grid-cols-4 gap-3">
        {buttons.map((button) => {
          const Icon = button.icon;

          return (
            <AppButton
              key={button.key}
              type="button"
              variant="secondary"
              className="flex min-h-16 items-center justify-center px-2 py-5"
              onClick={() => onRate?.(button.key)}
              aria-label={button.label}
              title={button.label}
            >
              <Icon size={24} aria-hidden="true" />
            </AppButton>
          );
        })}
      </div>
    </SectionCard>
  );
}
