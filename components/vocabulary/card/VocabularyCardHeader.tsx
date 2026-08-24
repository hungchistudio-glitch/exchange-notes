"use client";

import LanguageOriginBadge from "@/components/language/LanguageOriginBadge";
import PronunciationBlock from "@/components/pronunciation/PronunciationBlock";
import { getVocabularyCardSides } from "@/lib/vocabulary/cardSides";
import VocabularyWord from "@/components/vocabulary/ui/VocabularyWord";
import VocabularyTranslation from "@/components/vocabulary/ui/VocabularyTranslation";
import useTranslation from "@/hooks/i18n/useTranslation";
import useDisplayLanguages from "@/hooks/useDisplayLanguages";

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
  const { learningLanguage, supportLanguage } = useDisplayLanguages();
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
  const { primary, secondary } = getVocabularyCardSides(item, learningLanguage, supportLanguage);

  const partOfSpeechLabel = item.part_of_speech?.trim()
    ? detail.partOfSpeech[
        normalizePartOfSpeech(item.part_of_speech)
      ]
    : null;

  return (
    <header className="min-w-0">
      {/*
        The badge shares the eyebrow's line rather than the word's.

        Identity and action are different visual roles: this row is what the
        card *is* (status, part of speech, language), and the controls that
        act on it live in the expanded footer. Putting the flag up here keeps
        the word's own line clear and gives the badge a lane of its own, so
        nothing has to be squeezed when a long part-of-speech label arrives.
      */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.26em] text-ink-soft">
            {statusLabels[item.status]}
          </p>

          {partOfSpeechLabel ? (
            <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.26em] text-ink-faint">
              {partOfSpeechLabel}
            </p>
          ) : null}
        </div>

        <LanguageOriginBadge language={primary.language} />
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
