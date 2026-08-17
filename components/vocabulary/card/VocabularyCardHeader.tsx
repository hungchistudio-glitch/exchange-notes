"use client";

import PronunciationBlock from "@/components/pronunciation/PronunciationBlock";
import VocabularyWord from "@/components/vocabulary/ui/VocabularyWord";
import VocabularyTranslation from "@/components/vocabulary/ui/VocabularyTranslation";
import useTranslation from "@/hooks/i18n/useTranslation";
import { useLearningLanguageContext } from "@/contexts/LearningLanguageContext";

import { normalizePartOfSpeech } from "@/lib/vocabulary/partOfSpeech";
import type {
  VocabularyItem,
  VocabularyStatus,
} from "@/lib/types/app";

type Props = {
  item: VocabularyItem;
};

export default function VocabularyCardHeader({
  item,
}: Props) {
  const { t } = useTranslation();
  const { isLearningChinese } = useLearningLanguageContext();
  const search = t.vocabulary.search;
  const detail = t.vocabulary.detail;

  const statusLabels: Record<VocabularyStatus, string> = {
    new: search.statuses.new,
    learning: search.statuses.learning,
    mastered: search.statuses.mastered,
  };

  const translation = item.translation?.trim() || "";

  const partOfSpeechLabel = item.part_of_speech?.trim()
    ? detail.partOfSpeech[
        normalizePartOfSpeech(item.part_of_speech)
      ]
    : null;

  return (
    <header className="min-w-0">
      <div className="space-y-1.5">
        <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.26em] text-ink-soft">
          {statusLabels[item.status]}
        </p>

        {partOfSpeechLabel ? (
          <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.26em] text-ink-faint">
            {partOfSpeechLabel}
          </p>
        ) : null}
      </div>

      {isLearningChinese ? (
        <>
          {translation ? (
            <VocabularyTranslation
              text={translation}
              variant="primary"
              className="mt-6"            />
          ) : null}

          <PronunciationBlock
            english={item.word}
            chinese={translation}
            showEnglish
            className="mt-4"
          />

          <VocabularyWord
            word={item.word}
            variant="secondary"
            className="mt-5 border-t border-black/[0.06] pt-5"          />
        </>
      ) : (
        <>
          <VocabularyWord
            word={item.word}
            className="mt-6"          />

          <PronunciationBlock
            english={item.word}
            chinese={translation}
            showEnglish
            className="mt-4"
          />

          {translation ? (
            <VocabularyTranslation
              text={translation}
              className="mt-5 border-t border-black/[0.06] pt-5"            />
          ) : null}
        </>
      )}
    </header>
  );
}
