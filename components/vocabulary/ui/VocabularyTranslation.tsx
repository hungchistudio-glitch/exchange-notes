"use client";

import { cn, insertValues } from "@/lib/utils";
import { Display, Title } from "@/components/ui/Typography";
import useTranslation from "@/hooks/i18n/useTranslation";
import VocabularySpeechButton from "./VocabularySpeechButton";

type Props = {
  text: string;
  className?: string;
  /** "secondary" (default) renders as the smaller supporting line; "primary"
   * renders as the large hero headline. Callers flip this based on which
   * language the user is learning (see isLearningChinese from
   * LearningLanguageContext) — NOT the interface display language. */
  variant?: "primary" | "secondary";
  showSpeechButton?: boolean;
};

export default function VocabularyTranslation({
  text,
  className,
  variant = "secondary",
  showSpeechButton = true,
}: Props) {
  const { t } = useTranslation();
  const normalizedText = text.trim();

  if (!normalizedText) {
    return null;
  }

  const TextComponent = variant === "primary" ? Display : Title;

  return (
    <div
      className={cn(
        "flex min-w-0 items-start justify-between gap-4",
        className,
      )}
    >
      <TextComponent
        className={
          variant === "primary"
            ? "min-w-0 flex-1 break-words text-[30px] font-semibold leading-[1.08] tracking-[-0.04em] text-black sm:text-[34px]"
            // CJK glyphs carry more visual weight than Latin at the same
            // size, so the demoted Chinese line needs to sit a step lower
            // than the demoted English line (see VocabularyWord) to read
            // as genuinely secondary rather than as a second headline.
            : "min-w-0 flex-1 break-words text-[20px] font-normal leading-[1.45] tracking-[-0.01em] text-black/35"
        }
      >
        {normalizedText}
      </TextComponent>

      {showSpeechButton ? <div className="shrink-0">
        <VocabularySpeechButton
          text={normalizedText}
          language="zh-TW"
          label={insertValues(t.vocabulary.detail.listenAriaLabel, {
            text: normalizedText,
          })}
          size="sm"
          prominence={variant}
        />
      </div> : null}
    </div>
  );
}
