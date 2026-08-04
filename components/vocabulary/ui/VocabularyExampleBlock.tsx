"use client";

import useTranslation from "@/hooks/i18n/useTranslation";
import { useLearningLanguageContext } from "@/contexts/LearningLanguageContext";
import { insertValues } from "@/lib/utils";
import VocabularySpeechButton from "./VocabularySpeechButton";

type Props = {
  english?: string | null;
  chinese?: string | null;
  compact?: boolean;
  className?: string;
};

export default function VocabularyExampleBlock({
  english,
  chinese,
  className = "",
}: Props) {
  const { t } = useTranslation();
  const { isLearningChinese } = useLearningLanguageContext();

  if (!english?.trim() && !chinese?.trim()) return null;

  const englishBlock = english?.trim() ? (
    <div key="english" className="flex items-start gap-3 px-5 py-5">
      <p className="flex-1 text-[15px] leading-6 text-neutral-700">
        {english}
      </p>

      <VocabularySpeechButton
        text={english}
        language="en-US"
        label={insertValues(t.vocabulary.detail.listenAriaLabel, {
          text: english,
        })}
        size="sm"
      />
    </div>
  ) : null;

  const chineseBlock = chinese?.trim() ? (
    <div key="chinese" className="flex items-start gap-3 px-5 py-5">
      <p className="flex-1 text-[15px] leading-6 text-neutral-500">
        {chinese}
      </p>

      <VocabularySpeechButton
        text={chinese}
        language="zh-TW"
        label={insertValues(t.vocabulary.detail.listenAriaLabel, {
          text: chinese,
        })}
        size="sm"
      />
    </div>
  ) : null;

  const blocks = isLearningChinese
    ? [chineseBlock, englishBlock]
    : [englishBlock, chineseBlock];
  const visibleBlocks = blocks.filter(Boolean);

  return (
    <section
      className={`mt-6 overflow-hidden rounded-[24px] bg-surface ${className}`}
    >
      {visibleBlocks.map((block, index) => (
        <div
          key={index}
          className={index > 0 ? "border-t border-black/[0.05]" : ""}
        >
          {block}
        </div>
      ))}
    </section>
  );
}
