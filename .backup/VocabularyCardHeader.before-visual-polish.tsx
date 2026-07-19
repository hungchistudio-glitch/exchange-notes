"use client";

import AppBadge from "@/components/ui/AppBadge";
import PronunciationBlock from "@/components/pronunciation/PronunciationBlock";
import VocabularyWord from "@/components/vocabulary/ui/VocabularyWord";
import VocabularyTranslation from "@/components/vocabulary/ui/VocabularyTranslation";

import type {
  VocabularyItem,
  VocabularyStatus,
} from "@/lib/types/app";

const STATUS_LABELS: Record<VocabularyStatus, string> = {
  new: "＋ New",
  learning: "● Learning",
  mastered: "✓ Mastered",
};

function statusTone(status: VocabularyStatus) {
  if (status === "mastered") return "success" as const;
  if (status === "learning") return "warning" as const;
  return "neutral" as const;
}

type Props = {
  item: VocabularyItem;
};

export default function VocabularyCardHeader({
  item,
}: Props) {
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <AppBadge tone={statusTone(item.status)}>
          {STATUS_LABELS[item.status]}
        </AppBadge>

        {item.part_of_speech && (
          <AppBadge>
            {item.part_of_speech}
          </AppBadge>
        )}
      </div>

      <VocabularyWord
        word={item.word}
        className="mt-5"
      />

      <PronunciationBlock
        english={item.word}
        chinese={item.translation}
        showEnglish
        className="mt-3"
      />

      <VocabularyTranslation
        text={item.translation}
        className="mt-5"
      />
    </div>
  );
}
