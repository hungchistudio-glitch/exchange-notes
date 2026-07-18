import AppBadge from "@/components/ui/AppBadge";
import PronunciationBlock from "@/components/pronunciation/PronunciationBlock";
import type { VocabularyItem } from "./types";

type VocabularyHeaderProps = {
  item: VocabularyItem;
};

type LearningLevel = {
  stars: number;
  label: string;
};

function getLearningLevel(
  reviewCount: number,
  accuracy: number,
  status: string | null,
): LearningLevel {
  if (status?.toLowerCase() === "mastered") {
    return {
      stars: 5,
      label: "Mastered",
    };
  }

  if (reviewCount === 0) {
    return {
      stars: 1,
      label: "New",
    };
  }

  if (reviewCount >= 12 && accuracy >= 90) {
    return {
      stars: 5,
      label: "Mastered",
    };
  }

  if (reviewCount >= 8 && accuracy >= 80) {
    return {
      stars: 4,
      label: "Strong",
    };
  }

  if (reviewCount >= 4 && accuracy >= 65) {
    return {
      stars: 3,
      label: "Familiar",
    };
  }

  return {
    stars: 2,
    label: "Learning",
  };
}

export default function VocabularyHeader({
  item,
}: VocabularyHeaderProps) {
  const reviewCount = item.review_count ?? 0;

  const accuracy =
    reviewCount > 0
      ? Math.round(
          ((item.correct_count ?? 0) / reviewCount) * 100,
        )
      : 0;

  const learningLevel = getLearningLevel(
    reviewCount,
    accuracy,
    item.status,
  );

  return (
    <header className="overflow-hidden rounded-[32px] bg-neutral-950 text-white shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
      <div className="p-7 sm:p-9">
        <div className="flex flex-wrap gap-2">
          {item.part_of_speech ? (
            <AppBadge className="border-white/10 bg-white/10 text-white">
              {item.part_of_speech}
            </AppBadge>
          ) : null}

          {item.category ? (
            <AppBadge className="border-white/10 bg-white/10 text-white">
              {item.category}
            </AppBadge>
          ) : null}

          {item.status ? (
            <AppBadge className="border-white/10 bg-white/10 text-white capitalize">
              {item.status}
            </AppBadge>
          ) : null}
        </div>

        <div className="mt-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
            Vocabulary
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
              Translation
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
              aria-label={`${learningLevel.stars} out of 5 stars`}
            >
              {Array.from({ length: 5 }).map(
                (_, index) => (
                  <span
                    key={index}
                    className={
                      index < learningLevel.stars
                        ? "text-white"
                        : "text-neutral-700"
                    }
                  >
                    ★
                  </span>
                ),
              )}
            </div>

            <p className="mt-2 text-lg font-semibold">
              {learningLevel.label}
            </p>

            <p className="mt-1 text-sm text-neutral-400">
              Learning progress
            </p>
          </div>

          <div className="flex gap-8 sm:text-right">
            <div>
              <p className="text-2xl font-semibold tracking-[-0.04em]">
                {accuracy}%
              </p>

              <p className="mt-1 text-xs uppercase tracking-[0.14em] text-neutral-500">
                Accuracy
              </p>
            </div>

            <div>
              <p className="text-2xl font-semibold tracking-[-0.04em]">
                {reviewCount}
              </p>

              <p className="mt-1 text-xs uppercase tracking-[0.14em] text-neutral-500">
                Reviews
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
