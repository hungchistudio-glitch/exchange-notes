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
      className={`mt-6 overflow-hidden rounded-3xl bg-neutral-50/70 ${className}`}
    >
      {english?.trim() && (
        <div className="flex items-start gap-4 px-6 py-5">

          <p className="flex-1 text-[15px] leading-7 text-neutral-700">
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
        <div className="flex items-start gap-4 border-t border-neutral-200/60 px-6 py-5">

          <p className="flex-1 text-[15px] leading-7 text-neutral-500">
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
