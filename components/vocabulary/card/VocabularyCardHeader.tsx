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
  new: "New",
  learning: "Learning",
  mastered: "Mastered",
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
  const translation = item.translation?.trim() || "";

  return (
    <header className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <AppBadge tone={statusTone(item.status)}>
          {STATUS_LABELS[item.status]}
        </AppBadge>

        {item.part_of_speech?.trim() ? (
          <AppBadge>
            {item.part_of_speech.trim()}
          </AppBadge>
        ) : null}
      </div>

      <VocabularyWord
        word={item.word}
        className="mt-6"
      />

      <PronunciationBlock
        english={item.word}
        chinese={translation}
        showEnglish
        className="mt-3"
      />

      {translation ? (
        <VocabularyTranslation
          text={translation}
          className="mt-6 border-t border-black/[0.055] pt-5"
        />
      ) : null}
    </header>
  );
}
