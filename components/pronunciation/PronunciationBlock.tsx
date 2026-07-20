"use client";

import { useMemo } from "react";
import { getPronunciationData } from "@/lib/pronunciation";

type PronunciationBlockProps = {
  english?: string | null;
  chinese?: string | null;
  showEnglish?: boolean;
  className?: string;
};

export default function PronunciationBlock({
  english,
  chinese,
  showEnglish = false,
  className = "",
}: PronunciationBlockProps) {
  const pronunciation = useMemo(
    () =>
      getPronunciationData({
        english,
        chinese,
      }),
    [english, chinese],
  );

  const hasContent =
    pronunciation.pinyin ||
    pronunciation.zhuyin ||
    (showEnglish && pronunciation.english);

  if (!hasContent) return null;

  return (
    <div
      className={`space-y-1 font-sans text-[12px] font-normal leading-[1.55] tracking-[-0.01em] text-black/45 ${className}`}
    >
      {showEnglish && pronunciation.english && <p>{pronunciation.english}</p>}

      {pronunciation.pinyin && <p>{pronunciation.pinyin}</p>}

      {pronunciation.zhuyin && <p>{pronunciation.zhuyin}</p>}
    </div>
  );
}
