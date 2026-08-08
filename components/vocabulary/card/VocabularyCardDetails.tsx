"use client";

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
  const { t, isTraditionalChinese } = useTranslation();
  const detail = t.vocabulary.detail;
  const locale = isTraditionalChinese ? "zh-TW" : "en-US";
  const added = formatDate(item.created_at, locale);
  const reviewed = formatDate(item.last_reviewed_at, locale);

  return (
    <div className="border-t border-black/[0.055] px-5 pb-5 pt-1">
      <VocabularyExampleBlock
        english={item.example_sentence}
        chinese={item.translated_example}
        className="mt-4"
      />

      <dl className="mt-4 grid grid-cols-2 gap-x-5 gap-y-3 rounded-[18px] bg-black/[0.025] px-4 py-3.5 text-[11px]">
        <div className="min-w-0">
          <dt className="text-black/35">{detail.reviews}</dt>
          <dd className="mt-0.5 font-semibold text-black/65">
            {item.review_count ?? 0}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className="text-black/35">
            {detail.reviewDetails.lastReviewed}
          </dt>
          <dd className="mt-0.5 break-words font-semibold text-black/65">
            {reviewed ?? detail.reviewDetails.never}
          </dd>
        </div>
        {added ? (
          <div className="col-span-2 min-w-0 border-t border-black/[0.05] pt-3">
            <dt className="sr-only">{detail.vocabulary}</dt>
            <dd className="text-black/38">
              {detail.addedLabel.replace("{date}", added)}
            </dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}
