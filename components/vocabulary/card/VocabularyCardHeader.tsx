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
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-[0.28em] text-neutral-500">
          {STATUS_LABELS[item.status]}
        </p>

        {item.part_of_speech?.trim() ? (
          <p className="text-[10px] uppercase tracking-[0.28em] text-neutral-400">
            {item.part_of_speech.trim()}
          </p>
        ) : null}
      </div>

      <VocabularyWord
        word={item.word.toUpperCase()}
        className="mt-8 tracking-[0.08em]"
      />

      <PronunciationBlock
        english={item.word}
        chinese={translation}
        showEnglish
        className="mt-5"
      />

      {translation ? (
        <VocabularyTranslation
          text={translation}
          className="mt-6 border-t border-black/10 pt-6"
        />
      ) : null}

      <VocabularyLearningStats item={item} />
    </header>
  );
}
