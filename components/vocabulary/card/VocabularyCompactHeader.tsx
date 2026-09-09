"use client";

import LanguageOriginBadge from "@/components/language/LanguageOriginBadge";
import PronunciationBlock from "@/components/pronunciation/PronunciationBlock";
import { getVocabularyCardSides } from "@/lib/vocabulary/cardSides";
import useDisplayLanguages from "@/hooks/useDisplayLanguages";
import useTranslation from "@/hooks/i18n/useTranslation";
import type { VocabularyItem, VocabularyStatus } from "@/lib/types/app";

type Props = {
  item: VocabularyItem;
};

export default function VocabularyCompactHeader({ item }: Props) {
  const { t } = useTranslation();
  const { learningLanguage, supportLanguage } = useDisplayLanguages();
  const statusLabels: Record<VocabularyStatus, string> = {
    new: t.vocabulary.search.statuses.new,
    learning: t.vocabulary.search.statuses.learning,
    mastered: t.vocabulary.search.statuses.mastered,
  };
  const { primary, secondary } = getVocabularyCardSides(item, learningLanguage, supportLanguage);

  return (
    <header className="min-w-0 px-4 py-3.5">
      <div className="flex min-w-0 items-start gap-3">
        <span
          className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent-amber)]/70"
          aria-hidden="true"
        />

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center justify-between gap-3">
            <h3 className="min-w-0 break-words text-[1.0625rem] font-semibold leading-6 tracking-[-0.025em] text-black">
              {primary.text || item.word}
            </h3>
            {/*
              One right-hand cluster, not two.

              A compact row has room for a single trailing group; the badge
              joins the status label inside it rather than claiming a corner
              of its own, which is what would have pushed the word's line
              short on a narrow phone.
            */}
            <span className="flex shrink-0 items-center gap-2">
              <LanguageOriginBadge language={primary.language} size="sm" />

              <span className="text-[0.5625rem] font-semibold uppercase tracking-[0.13em] text-ink-faint">
                {statusLabels[item.status]}
              </span>
            </span>
          </div>

          {secondary.text ? (
            <p className="mt-0.5 break-words text-[0.8125rem] leading-5 text-ink-soft">
              {secondary.text}
            </p>
          ) : null}

          <PronunciationBlock
            entries={[
              { text: primary.text, language: primary.language },
              { text: secondary.text, language: secondary.language },
            ]}
            className="mt-2 flex flex-wrap gap-x-3 gap-y-1"
          />
        </div>
      </div>
    </header>
  );
}
