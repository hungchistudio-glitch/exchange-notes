"use client";

import { Frown, PartyPopper, RotateCcw, Smile } from "lucide-react";

import AppButton from "@/components/ui/AppButton";
import SectionCard from "@/components/vocabulary/detail/VocabularySection";
import useTranslation from "@/hooks/i18n/useTranslation";

type Rating = "again" | "hard" | "good" | "easy";

type Props = {
  onRate?: (rating: Rating) => void;
};

export default function VocabularyReviewPanel({ onRate }: Props) {
  const { t } = useTranslation();
  const reviewPanel = t.vocabulary.detail.reviewPanel;

  const buttons = [
    {
      key: "again",
      label: reviewPanel.again,
      icon: RotateCcw,
    },
    {
      key: "hard",
      label: reviewPanel.hard,
      icon: Frown,
    },
    {
      key: "good",
      label: reviewPanel.good,
      icon: Smile,
    },
    {
      key: "easy",
      label: reviewPanel.easy,
      icon: PartyPopper,
    },
  ] as const;

  return (
    <SectionCard
      title={reviewPanel.title}
      description={reviewPanel.description}
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
