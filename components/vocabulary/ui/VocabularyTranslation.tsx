"use client";

import { cn, insertValues } from "@/lib/utils";
import { Display, Title } from "@/components/ui/Typography";
import useTranslation from "@/hooks/i18n/useTranslation";
import type { SpeechLanguage } from "@/lib/speech";
import VocabularyCopyButton from "./VocabularyCopyButton";
import VocabularySpeechButton from "./VocabularySpeechButton";

type Props = {
  text: string;
  className?: string;
  /** "secondary" (default) renders as the smaller supporting line; "primary"
   * renders as the large hero headline. Callers flip this based on which
   * language the user is learning (see getVocabularyCardSides and
   * LearningLanguageContext) — NOT the interface display language. */
  variant?: "primary" | "secondary";
  showSpeechButton?: boolean;
  language: SpeechLanguage;
};

export default function VocabularyTranslation({
  text,
  className,
  variant = "secondary",
  showSpeechButton = true,
  language,
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
            : "min-w-0 flex-1 break-words text-[20px] font-normal leading-[1.45] tracking-[-0.01em] text-ink-faint"
        }
      >
        {normalizedText}
      </TextComponent>

      <div className="flex shrink-0 items-center gap-2">
        {variant === "primary" ? (
          <VocabularyCopyButton text={normalizedText} />
        ) : null}

        {showSpeechButton ? (
          <VocabularySpeechButton
            text={normalizedText}
            language={language}
            label={insertValues(t.vocabulary.detail.listenAriaLabel, {
              text: normalizedText,
            })}
            size="sm"
            prominence={variant}
          />
        ) : null}
      </div>
    </div>
  );
}
