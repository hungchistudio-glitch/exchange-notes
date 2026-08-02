"use client";

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
  if (!english?.trim() && !chinese?.trim()) return null;

  return (
    <section
      className={`mt-6 overflow-hidden rounded-[24px] bg-surface ${className}`}
    >
      {english?.trim() && (
        <div className="flex items-start gap-3 px-5 py-5">

          <p className="flex-1 text-[15px] leading-6 text-neutral-700">
            {english}
          </p>

          <VocabularySpeechButton
            text={english}
            language="en-US"
            label="Play English example"
            size="sm"
          />

        </div>
      )}

      {chinese?.trim() && (
        <div className="flex items-start gap-3 border-t border-black/[0.05] px-5 py-5">

          <p className="flex-1 text-[15px] leading-6 text-neutral-500">
            {chinese}
          </p>

          <VocabularySpeechButton
            text={chinese}
            language="zh-TW"
            label="播放中文例句"
            size="sm"
          />

        </div>
      )}
    </section>
  );
}
