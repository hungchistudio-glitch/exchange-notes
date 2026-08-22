"use client";

import PronunciationBlock from "@/components/pronunciation/PronunciationBlock";
import { getVocabularyCardSides } from "@/lib/vocabulary/cardSides";
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
  const { learningLanguage } = useLearningLanguageContext();
  const search = t.vocabulary.search;
  const detail = t.vocabulary.detail;

  const statusLabels: Record<VocabularyStatus, string> = {
    new: search.statuses.new,
    learning: search.statuses.learning,
    mastered: search.statuses.mastered,
  };

  /*
   * Which side leads comes from the row's own two languages against the one
   * being learned, not from a yes/no about Chinese. A word saved under a
   * different pairing keeps the order it was saved in rather than being
   * relabelled by today's profile.
   */
  const { primary, secondary } = getVocabularyCardSides(item, learningLanguage);

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

      <VocabularyWord word={primary.text} className="mt-6" />

      <PronunciationBlock
        entries={[
          { text: primary.text, language: primary.language },
          { text: secondary.text, language: secondary.language },
        ]}
        className="mt-4"
      />

      {secondary.text ? (
        <VocabularyTranslation
          text={secondary.text}
          className="mt-5 border-t border-black/[0.06] pt-5"
        />
      ) : null}

    </header>
  );
}
