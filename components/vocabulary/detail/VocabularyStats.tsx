import StatCard from "@/components/vocabulary/detail/VocabularyStatCard";
import type { VocabularyItem } from "./types";
import { formatVocabularyDate } from "./types";

type VocabularyStatsProps = {
  item: VocabularyItem;
};

export default function VocabularyStats({
  item,
}: VocabularyStatsProps) {
  const reviewCount = item.review_count ?? 0;

  const accuracy =
    reviewCount > 0
      ? Math.round(
          ((item.correct_count ?? 0) / reviewCount) * 100,
        )
      : 0;

  return (
    <section className="grid gap-4 sm:grid-cols-3">
      <StatCard
        label="Reviews"
        value={reviewCount}
      />

      <StatCard
        label="Accuracy"
        value={`${accuracy}%`}
      />

      <StatCard
        label="Next review"
        value={formatVocabularyDate(item.next_review_at)}
      />
    </section>
  );
}
