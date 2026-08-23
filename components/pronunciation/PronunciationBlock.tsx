"use client";

import { useMemo } from "react";
import { getPhonetics } from "@/lib/pronunciation";
import { getLanguage, type LanguageCode } from "@/lib/languages";
import { speak } from "@/lib/speech";
import usePhonetics from "@/hooks/usePhonetics";
import useTranslation from "@/hooks/i18n/useTranslation";
import { insertValues } from "@/lib/utils";

/**
 * The phonetic annotations for one or more pieces of text, each in its own
 * language.
 *
 * This used to take `english` and `chinese` and render IPA under the first
 * and pinyin/zhuyin under the second — correct for exactly one pairing, and
 * silent for every other. It takes languages now, and each one contributes
 * whatever annotations it actually has:
 *
 *   en · es · fr · it   IPA
 *   zh-TW               zhuyin and pinyin
 *
 * Chinese is computed locally and costs nothing. IPA has to be looked up,
 * and this component now does that itself rather than rendering only what a
 * caller thought to pass in — which is why a word card showed zhuyin under
 * Chinese and nothing at all under everything else, English included.
 *
 * Requests from every card on screen are gathered into one per language by
 * the hook, and answers are cached across the session and in the database,
 * so a list of two hundred words is a request, not two hundred.
 */
export type PronunciationEntry = {
  text: string | null | undefined;
  language: LanguageCode;
  /**
   * IPA the caller already has. Optional — when it is absent this component
   * fetches it, which is why every word card gained an annotation without
   * every word card having to learn how to ask for one.
   */
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
  const ipaFor = usePhonetics(entries);

  const rows = useMemo(
    () =>
      entries.flatMap((entry) => {
        const text = entry.text?.trim() ?? "";
        if (!text) return [];

        const phonetics = getPhonetics(text, entry.language);
        const speechTag = getLanguage(entry.language).speechTag;

        // A caller that already has the transcription wins; everyone else
        // gets the looked-up one.
        const ipa = entry.ipa?.trim() || ipaFor(entry);

        return [ipa, phonetics.pinyin, phonetics.zhuyin]
          .filter((label): label is string => Boolean(label))
          .map((label) => ({ label, text, speechTag }));
      }),
    [entries, ipaFor],
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
