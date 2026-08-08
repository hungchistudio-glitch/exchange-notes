"use client";

import PronunciationBlock from "@/components/pronunciation/PronunciationBlock";
import { useLearningLanguageContext } from "@/contexts/LearningLanguageContext";
import useTranslation from "@/hooks/i18n/useTranslation";
import type { VocabularyItem, VocabularyStatus } from "@/lib/types/app";

type Props = {
  item: VocabularyItem;
};

export default function VocabularyCompactHeader({ item }: Props) {
  const { t } = useTranslation();
  const { isLearningChinese } = useLearningLanguageContext();
  const statusLabels: Record<VocabularyStatus, string> = {
    new: t.vocabulary.search.statuses.new,
    learning: t.vocabulary.search.statuses.learning,
    mastered: t.vocabulary.search.statuses.mastered,
  };
  const translation = item.translation?.trim() ?? "";
  const primary = isLearningChinese ? translation : item.word;
  const secondary = isLearningChinese ? item.word : translation;

  return (
    <header className="min-w-0 px-4 py-3.5">
      <div className="flex min-w-0 items-start gap-3">
        <span
          className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#c9962e]/70"
          aria-hidden="true"
        />

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-baseline justify-between gap-3">
            <h3 className="min-w-0 break-words text-[17px] font-semibold leading-6 tracking-[-0.025em] text-black">
              {primary || item.word}
            </h3>
            <span className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.13em] text-black/28">
              {statusLabels[item.status]}
            </span>
          </div>

          {secondary ? (
            <p className="mt-0.5 break-words text-[13px] leading-5 text-black/45">
              {secondary}
            </p>
          ) : null}

          <PronunciationBlock
            english={item.word}
            chinese={translation}
            showEnglish
            className="mt-2 flex flex-wrap gap-x-3 gap-y-1"
          />
        </div>
      </div>
    </header>
  );
}
