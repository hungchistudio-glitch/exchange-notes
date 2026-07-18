import VocabularyDashboard from "../VocabularyDashboard";
import SmartLearningInsights from "../SmartLearningInsights";

type Props = {
  total: number;
  learning: number;
  mastered: number;
  progress: number;
};

export default function VocabularyDashboardSection({
  total,
  learning,
  mastered,
  progress,
}: Props) {
  return (
    <>
      <VocabularyDashboard
        total={total}
        learning={learning}
        mastered={mastered}
        progress={progress}
      />

      <SmartLearningInsights />
    </>
  );
}
