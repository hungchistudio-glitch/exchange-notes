"use client";

import SectionCard from "@/components/vocabulary/detail/VocabularySection";
import useTranslation from "@/hooks/i18n/useTranslation";
import type { VocabularyItem } from "./types";
import { formatVocabularyDate } from "./types";

type VocabularyReviewDetailsProps = {
  item: VocabularyItem;
};

export default function VocabularyReviewDetails({
  item,
}: VocabularyReviewDetailsProps) {
  const { t } = useTranslation();
  const reviewDetails = t.vocabulary.detail.reviewDetails;

  const interval = item.review_interval ?? 0;
  const intervalUnit =
    interval === 1
      ? reviewDetails.day
      : reviewDetails.days;

  return (
    <SectionCard title={reviewDetails.title}>
      <dl className="space-y-3 text-sm">
        <div className="flex justify-between gap-6">
          <dt className="text-neutral-500">
            {reviewDetails.lastReviewed}
          </dt>

          <dd className="text-right font-medium">
            {item.last_reviewed_at
              ? formatVocabularyDate(
                  item.last_reviewed_at,
                  reviewDetails.never,
                )
              : reviewDetails.never}
          </dd>
        </div>

        <div className="flex justify-between gap-6">
          <dt className="text-neutral-500">
            {reviewDetails.interval}
          </dt>

          <dd className="font-medium">
            {interval} {intervalUnit}
          </dd>
        </div>

        <div className="flex justify-between gap-6">
          <dt className="text-neutral-500">
            {reviewDetails.ease}
          </dt>

          <dd className="font-medium">
            {Number(item.review_ease ?? 2.5).toFixed(2)}
          </dd>
        </div>
      </dl>
    </SectionCard>
  );
}
