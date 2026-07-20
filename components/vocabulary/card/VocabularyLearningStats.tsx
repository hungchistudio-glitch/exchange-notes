import DataPanel from "@/components/ui/DataPanel";
import { getVocabularyInsights } from "@/lib/vocabulary/getVocabularyInsights";
import type { VocabularyItem } from "@/lib/types/app";

type Props = {
  item: VocabularyItem;
};

export default function VocabularyLearningStats({
  item,
}: Props) {
  const insights = getVocabularyInsights(item);

  return (
    <DataPanel
      rows={[
        {
          label: "Accuracy",
          value: `${insights.accuracy}%`,
        },
        {
          label: "Reviews",
          value: insights.reviewCount,
        },
        {
          label: "Next Review",
          value: insights.nextReviewLabel,
        },
      ]}
    />
  );
}
