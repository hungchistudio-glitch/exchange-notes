"use client";

import { RotateCcw, Frown, Smile, PartyPopper } from "lucide-react";

import AppButton from "@/components/ui/AppButton";
import SectionCard from "@/components/design/SectionCard";

type Props = {
  onRate?: (rating: "again" | "hard" | "good" | "easy") => void;
};

export default function VocabularyReviewPanel({
  onRate,
}: Props) {
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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {buttons.map((button) => {
          const Icon = button.icon;

          return (
            <AppButton
              key={button.key}
              variant="secondary"
              className="flex flex-col gap-2 py-5"
              onClick={() => {
                if (onRate) {
                  onRate(button.key);
                }
              }}
            >
              <Icon size={20} />
              <span>{button.label}</span>
            </AppButton>
          );
        })}
      </div>
    </SectionCard>
  );
}
