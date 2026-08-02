"use client";

import AppBadge from "@/components/ui/AppBadge";
import PronunciationBlock from "@/components/pronunciation/PronunciationBlock";
import useTranslation from "@/hooks/i18n/useTranslation";
import { getVocabularyInsights } from "@/lib/vocabulary/getVocabularyInsights";
import type { VocabularyItem } from "./types";

type VocabularyHeaderProps = {
  item: VocabularyItem;
};

type LearningLevelKey =
  | "new"
  | "learning"
  | "familiar"
  | "strong"
  | "mastered";

type LearningLevel = {
  stars: number;
  key: LearningLevelKey;
};

type PartOfSpeechKey =
  | "noun"
  | "verb"
  | "adjective"
  | "adverb"
  | "pronoun"
  | "preposition"
  | "conjunction"
  | "interjection"
  | "phrase"
  | "other";

function getLearningLevel(
  reviewCount: number,
  accuracy: number,
  status: string | null,
): LearningLevel {
  if (status?.toLowerCase() === "mastered") {
    return {
      stars: 5,
      key: "mastered",
    };
  }

  if (reviewCount === 0) {
    return {
      stars: 1,
      key: "new",
    };
  }

  if (reviewCount >= 12 && accuracy >= 90) {
    return {
      stars: 5,
      key: "mastered",
    };
  }

  if (reviewCount >= 8 && accuracy >= 80) {
    return {
      stars: 4,
      key: "strong",
    };
  }

  if (reviewCount >= 4 && accuracy >= 65) {
    return {
      stars: 3,
      key: "familiar",
    };
  }

  return {
    stars: 2,
    key: "learning",
  };
}

function normalizePartOfSpeech(
  value: string,
): PartOfSpeechKey {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  const aliases: Record<string, PartOfSpeechKey> = {
    noun: "noun",
    verb: "verb",
    adjective: "adjective",
    adj: "adjective",
    adverb: "adverb",
    adv: "adverb",
    pronoun: "pronoun",
    preposition: "preposition",
    conjunction: "conjunction",
    interjection: "interjection",
    phrase: "phrase",
  };

  return aliases[normalized] ?? "other";
}

export default function VocabularyHeader({
  item,
}: VocabularyHeaderProps) {
  const { t } = useTranslation();
  const detail = t.vocabulary.detail;

  const { accuracy, reviewCount } =
    getVocabularyInsights(item);

  const learningLevel = getLearningLevel(
    reviewCount,
    accuracy,
    item.status,
  );

  const learningLevelLabel =
    detail.levels[learningLevel.key];

  const partOfSpeechLabel = item.part_of_speech
    ? detail.partOfSpeech[
        normalizePartOfSpeech(item.part_of_speech)
      ]
    : null;

  const statusLabel =
    item.status === "mastered"
      ? detail.levels.mastered
      : item.status === "learning"
        ? detail.levels.learning
        : item.status === "new"
          ? detail.levels.new
          : item.status;

  const starsAriaLabel =
    detail.starsAriaLabel.replace(
      "{count}",
      String(learningLevel.stars),
    );

  return (
    <header className="overflow-hidden rounded-[32px] bg-neutral-950 text-white shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
      <div className="p-7 sm:p-9">
        <div className="flex flex-wrap gap-2">
          {partOfSpeechLabel ? (
            <AppBadge className="border-white/10 bg-white/10 text-white">
              {partOfSpeechLabel}
            </AppBadge>
          ) : null}

          {item.category ? (
            <AppBadge className="border-white/10 bg-white/10 text-white">
              {item.category}
            </AppBadge>
          ) : null}

          {statusLabel ? (
            <AppBadge className="border-white/10 bg-white/10 text-white">
              {statusLabel}
            </AppBadge>
          ) : null}
        </div>

        <div className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
            {detail.vocabulary}
          </p>

          <h1 className="mt-3 break-words text-5xl font-semibold tracking-[-0.055em] sm:text-6xl">
            {item.word}
          </h1>

          <PronunciationBlock
            english={item.word}
            chinese={item.translation}
            showEnglish
            className="mt-4 text-sm leading-6 text-neutral-400"
          />

          <div className="mt-7 h-px bg-white/10" />

          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
              {detail.translation}
            </p>

            <p className="mt-2 text-2xl font-medium tracking-[-0.025em] text-neutral-100">
              {item.translation}
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 bg-white/[0.04] px-7 py-6 sm:px-9">
        <div className="grid gap-6 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <div
              className="flex gap-1 text-xl"
              aria-label={starsAriaLabel}
            >
              {Array.from({ length: 5 }).map((_, index) => (
                <span
                  key={index}
                  className={
                    index < learningLevel.stars
                      ? "text-white"
                      : "text-neutral-700"
                  }
                  aria-hidden="true"
                >
                  ★
                </span>
              ))}
            </div>

            <p className="mt-2 text-lg font-semibold">
              {learningLevelLabel}
            </p>

            <p className="mt-1 text-sm text-neutral-400">
              {detail.learningProgress}
            </p>
          </div>

          <div className="flex gap-8 sm:text-right">
            <div>
              <p className="text-2xl font-semibold tracking-[-0.04em]">
                {accuracy}%
              </p>

              <p className="mt-1 text-xs uppercase tracking-[0.14em] text-neutral-500">
                {detail.accuracy}
              </p>
            </div>

            <div>
              <p className="text-2xl font-semibold tracking-[-0.04em]">
                {reviewCount}
              </p>

              <p className="mt-1 text-xs uppercase tracking-[0.14em] text-neutral-500">
                {detail.reviews}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
