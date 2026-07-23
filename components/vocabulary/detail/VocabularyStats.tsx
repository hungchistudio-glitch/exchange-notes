"use client";

import StatCard from "@/components/vocabulary/detail/VocabularyStatCard";
import useTranslation from "@/hooks/i18n/useTranslation";
import { getVocabularyInsights } from "@/lib/vocabulary/getVocabularyInsights";
import type { VocabularyItem } from "./types";
import { formatVocabularyDate } from "./types";

type VocabularyStatsProps = {
  item: VocabularyItem;
};

export default function VocabularyStats({
  item,
}: VocabularyStatsProps) {
  const { t } = useTranslation();
  const detail = t.vocabulary.detail;

  const { accuracy, reviewCount } =
    getVocabularyInsights(item);

  return (
    <section className="grid gap-4 sm:grid-cols-3">
      <StatCard
        label={detail.reviews}
        value={reviewCount}
      />

      <StatCard
        label={detail.accuracy}
        value={`${accuracy}%`}
      />

      <StatCard
        label={detail.nextReview}
        value={formatVocabularyDate(item.next_review_at)}
      />
    </section>
  );
}
