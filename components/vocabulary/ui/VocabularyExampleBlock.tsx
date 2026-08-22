"use client";

import useTranslation from "@/hooks/i18n/useTranslation";
import { getLanguage, type LanguageCode } from "@/lib/languages";
import { insertValues } from "@/lib/utils";
import VocabularySpeechButton from "./VocabularySpeechButton";

type ExampleEntry = {
  text?: string | null;
  language: LanguageCode;
};

type Props = {
  primary: ExampleEntry;
  secondary: ExampleEntry;
  className?: string;
};

export default function VocabularyExampleBlock({
  primary,
  secondary,
  className = "",
}: Props) {
  const { t } = useTranslation();

  if (!primary.text?.trim() && !secondary.text?.trim()) return null;

  /*
   * Two examples, each in its own language, in the order the caller decided.
   * They used to be called `english` and `chinese` and be reordered here by
   * asking whether the reader was learning Chinese — which is not a question
   * with an answer once there are more than two languages, and not this
   * component's question either.
   */
  function exampleBlock(
    entry: { text?: string | null; language: LanguageCode },
    hero: boolean,
  ) {
    const text = entry.text?.trim();
    if (!text) return null;

    return (
      <div
        key={entry.language}
        className="flex items-start gap-3 px-5 py-5"
      >
        <p
          className={`flex-1 text-[15px] leading-6 ${
            hero ? "text-neutral-700" : "text-ink-soft"
          }`}
        >
          {text}
        </p>

        <VocabularySpeechButton
          text={text}
          language={getLanguage(entry.language).speechTag}
          label={insertValues(t.vocabulary.detail.listenAriaLabel, { text })}
          size="sm"
        />
      </div>
    );
  }

  const blocks = [exampleBlock(primary, true), exampleBlock(secondary, false)];

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
