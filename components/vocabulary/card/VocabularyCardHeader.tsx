"use client";

import PronunciationBlock from "@/components/pronunciation/PronunciationBlock";
import VocabularyWord from "@/components/vocabulary/ui/VocabularyWord";
import VocabularyTranslation from "@/components/vocabulary/ui/VocabularyTranslation";
import VocabularyLearningStats from "@/components/vocabulary/card/VocabularyLearningStats";

import type {
  VocabularyItem,
  VocabularyStatus,
} from "@/lib/types/app";

const STATUS_LABELS: Record<VocabularyStatus, string> = {
  new: "New",
  learning: "Learning",
  mastered: "Mastered",
};

type Props = {
  item: VocabularyItem;
};

export default function VocabularyCardHeader({
  item,
}: Props) {
  const translation = item.translation?.trim() || "";

  return (
    <header className="min-w-0">
      <div className="space-y-1.5">
        <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.26em] text-black/45">
          {STATUS_LABELS[item.status]}
        </p>

        {item.part_of_speech?.trim() ? (
          <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.26em] text-black/30">
            {item.part_of_speech.trim()}
          </p>
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
        className="mt-4"
      />

      {translation ? (
        <VocabularyTranslation
          text={translation}
          className="mt-5 border-t border-black/[0.06] pt-5"
        />
      ) : null}

      <VocabularyLearningStats item={item} />
    </header>
  );
}
