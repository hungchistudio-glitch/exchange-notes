"use client";

import { cn, insertValues } from "@/lib/utils";
import { Display, Title } from "@/components/ui/Typography";
import useTranslation from "@/hooks/i18n/useTranslation";
import type { SpeechLanguage } from "@/lib/speech";
import VocabularyCopyButton from "./VocabularyCopyButton";
import VocabularySpeechButton from "./VocabularySpeechButton";

type Props = {
  word: string;
  className?: string;
  /** "primary" (default) renders as the large hero headline; "secondary"
   * renders as the smaller supporting line. Callers flip this based on
   * which language the user is learning (see getVocabularyCardSides and
   * LearningLanguageContext) — NOT the interface display language. */
  variant?: "primary" | "secondary";
  showSpeechButton?: boolean;
  language: SpeechLanguage;
};

export default function VocabularyWord({
  word,
  className,
  variant = "primary",
  showSpeechButton = true,
  language,
}: Props) {
  const { t } = useTranslation();
  const normalizedWord = word.trim();
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
            : "min-w-0 flex-1 break-words text-[22px] font-normal leading-[1.4] tracking-[-0.02em] text-ink-soft"
        }
      >
        {normalizedWord}
      </TextComponent>

      <div className="flex shrink-0 items-center gap-2">
        {variant === "primary" ? (
          <VocabularyCopyButton text={normalizedWord} />
        ) : null}

        {showSpeechButton ? (
          <VocabularySpeechButton
            text={normalizedWord}
            language={language}
            label={insertValues(t.vocabulary.detail.listenAriaLabel, {
              text: normalizedWord,
            })}
            size="sm"
            prominence={variant}
          />
        ) : null}
      </div>
    </div>
  );
}
