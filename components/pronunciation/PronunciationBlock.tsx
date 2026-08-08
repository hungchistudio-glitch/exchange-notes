"use client";

import { useMemo } from "react";
import { getPronunciationData } from "@/lib/pronunciation";
import { speak } from "@/lib/speech";
import useTranslation from "@/hooks/i18n/useTranslation";
import { insertValues } from "@/lib/utils";

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
  const { t } = useTranslation();
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

  function pronunciationButton(
    label: string,
    spokenText: string,
    language: "en-US" | "zh-TW",
  ) {
    return (
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          speak(spokenText, language);
        }}
        aria-label={insertValues(t.vocabulary.detail.listenAriaLabel, {
          text: spokenText,
        })}
        className="block max-w-full rounded-md text-left transition-colors hover:text-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c9962e]/30 active:text-black"
      >
        {label}
      </button>
    );
  }

  return (
    <div
      className={`space-y-1.5 break-words font-sans text-[11px] font-normal leading-[1.5] tracking-[-0.01em] text-black/45 ${className}`}
    >
      {showEnglish && pronunciation.english
        ? pronunciationButton(pronunciation.english, pronunciation.english, "en-US")
        : null}

      {pronunciation.pinyin && chinese
        ? pronunciationButton(pronunciation.pinyin, chinese, "zh-TW")
        : null}

      {pronunciation.zhuyin && chinese
        ? pronunciationButton(pronunciation.zhuyin, chinese, "zh-TW")
        : null}
    </div>
  );
}
