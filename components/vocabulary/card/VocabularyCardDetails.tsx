"use client";

import useDisplayLanguages from "@/hooks/useDisplayLanguages";
import { getVocabularyCardSides } from "@/lib/vocabulary/cardSides";
import VocabularyExampleBlock from "@/components/vocabulary/ui/VocabularyExampleBlock";
import useTranslation from "@/hooks/i18n/useTranslation";
import type { VocabularyItem } from "@/lib/types/app";

type Props = {
  item: VocabularyItem;
};

function formatDate(value: string | null | undefined, locale: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export default function VocabularyCardDetails({ item }: Props) {
  const { learningLanguage, supportLanguage } = useDisplayLanguages();
  const sides = getVocabularyCardSides(item, learningLanguage, supportLanguage);

  const { t, isTraditionalChinese } = useTranslation();
  const detail = t.vocabulary.detail;
  const locale = isTraditionalChinese ? "zh-TW" : "en-US";
  const added = formatDate(item.created_at, locale);
  const reviewed = formatDate(item.last_reviewed_at, locale);

  return (
    <div className="border-t border-black/[0.055] px-5 pb-5 pt-1">
      <VocabularyExampleBlock
        primary={{ text: sides.primary.example, language: sides.primary.language }}
        secondary={{
          text: sides.secondary.example,
          language: sides.secondary.language,
        }}
        className="mt-4"
      />

      <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 rounded-[18px] bg-black/[0.025] px-4 py-3.5 text-[0.6875rem]">
        <div className="min-w-0">
          <dt className="text-ink-faint">{detail.reviews}</dt>
          <dd className="mt-0.5 font-semibold text-ink-soft">
            {item.review_count ?? 0}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-ink-faint">
            {detail.reviewDetails.lastReviewed}
          </dt>
          <dd className="mt-0.5 break-words font-semibold text-ink-soft">
            {reviewed ?? detail.reviewDetails.never}
          </dd>
        </div>
        {added ? (
          <div className="col-span-2 min-w-0 border-t border-black/[0.05] pt-3">
            <dt className="sr-only">{detail.vocabulary}</dt>
            <dd className="text-ink-faint">
              {detail.addedLabel.replace("{date}", added)}
            </dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}
