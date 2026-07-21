import SectionCard from "@/components/vocabulary/detail/VocabularySection";
import type { VocabularyItem } from "./types";
import { formatVocabularyDate } from "./types";

type VocabularyReviewDetailsProps = {
  item: VocabularyItem;
};

export default function VocabularyReviewDetails({
  item,
}: VocabularyReviewDetailsProps) {
  return (
    <SectionCard title="Review details">
      <dl className="space-y-3 text-sm">
        <div className="flex justify-between gap-6">
          <dt className="text-neutral-500">
            Last reviewed
          </dt>

          <dd className="text-right font-medium">
            {item.last_reviewed_at
              ? formatVocabularyDate(
                  item.last_reviewed_at,
                  "Never",
                )
              : "Never"}
          </dd>
        </div>

        <div className="flex justify-between gap-6">
          <dt className="text-neutral-500">
            Interval
          </dt>

          <dd className="font-medium">
            {item.review_interval ?? 0} days
          </dd>
        </div>

        <div className="flex justify-between gap-6">
          <dt className="text-neutral-500">
            Ease
          </dt>

          <dd className="font-medium">
            {Number(item.review_ease ?? 2.5).toFixed(2)}
          </dd>
        </div>
      </dl>
    </SectionCard>
  );
}
