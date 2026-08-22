"use client";

import { useMemo } from "react";
import { getPhonetics } from "@/lib/pronunciation";
import { getLanguage, type LanguageCode } from "@/lib/languages";
import { speak } from "@/lib/speech";
import useTranslation from "@/hooks/i18n/useTranslation";
import { insertValues } from "@/lib/utils";

/**
 * The phonetic annotations for one or more pieces of text, each in its own
 * language.
 *
 * This used to take `english` and `chinese` and render IPA under the first
 * and pinyin/zhuyin under the second — correct for exactly one pairing, and
 * silent for every other. It takes languages now, and each one contributes
 * whatever annotations it actually has: Chinese brings pinyin and zhuyin,
 * a Latin language brings nothing this component can compute locally, and
 * neither is asked for the other's.
 */
export type PronunciationEntry = {
  text: string | null | undefined;
  language: LanguageCode;
  /** Pre-fetched IPA, which only a network dictionary can supply. */
  ipa?: string | null;
};

type PronunciationBlockProps = {
  entries: PronunciationEntry[];
  className?: string;
};

export default function PronunciationBlock({
  entries,
  className = "",
}: PronunciationBlockProps) {
  const { t } = useTranslation();

  const rows = useMemo(
    () =>
      entries.flatMap((entry) => {
        const text = entry.text?.trim() ?? "";
        if (!text) return [];

        const phonetics = getPhonetics(text, entry.language);
        const speechTag = getLanguage(entry.language).speechTag;

        return [entry.ipa?.trim(), phonetics.pinyin, phonetics.zhuyin]
          .filter((label): label is string => Boolean(label))
          .map((label) => ({ label, text, speechTag }));
      }),
    [entries],
  );

  if (rows.length === 0) return null;

  return (
    <div
      className={`space-y-1.5 break-words font-sans text-[11px] font-normal leading-[1.5] tracking-[-0.01em] text-ink-soft ${className}`}
    >
      {rows.map((row) => (
        <button
          key={`${row.speechTag}-${row.label}`}
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            speak(row.text, row.speechTag);
          }}
          aria-label={insertValues(t.vocabulary.detail.listenAriaLabel, {
            text: row.text,
          })}
          className="block max-w-full rounded-md text-left transition-colors hover:text-ink-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-amber)]/30 active:text-black"
        >
          {row.label}
        </button>
      ))}
    </div>
  );
}
