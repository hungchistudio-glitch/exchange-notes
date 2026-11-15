"use client";

import { useMemo } from "react";
import { getLanguage, type LanguageCode } from "@/lib/languages";
import { SpokenReading, useSpeakToggle } from "@/components/speech/Spoken";
import type { SpeechLanguage } from "@/lib/speech";
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
 * All three are looked up together, by the hook, in one request per language
 * per tick. Chinese used to be computed here instead — which meant every
 * screen that renders a word card carried pinyin-pro's dictionary, 640KB of
 * it, on the critical path of the home and vocabulary screens, to derive
 * something the same response already contained and the client was throwing
 * away.
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
  const phoneticsFor = usePhonetics(entries);

  const groups = useMemo(
    () =>
      entries.flatMap((entry) => {
        const text = entry.text?.trim() ?? "";
        if (!text) return [];

        const phonetics = phoneticsFor(entry);
        const speechTag = getLanguage(entry.language).speechTag;

        // A caller that already has the transcription wins; everyone else
        // gets the looked-up one.
        const ipa = entry.ipa?.trim() || phonetics?.ipa;

        /*
         * Every reading this language has, stacked, in the order a reader
         * uses them: zhuyin, then pinyin under it, then IPA. Traditional
         * Chinese has the first two and nothing else has either, so in
         * practice a language contributes one line or two.
         *
         * They used to be one button per line, which made the same word
         * two and three tap targets that all did the same thing. One
         * language is one button now, and the readings are what is printed
         * on it.
         */
        const readings = ([
          ["zhuyin", phonetics?.zhuyin],
          ["pinyin", phonetics?.pinyin],
          ["ipa", ipa],
        ] as const).flatMap(([script, label]) => label ? [{ script, label }] : []);

        return readings.length ? [{ readings, text, speechTag, language: entry.language }] : [];
      }),
    [entries, phoneticsFor],
  );

  if (groups.length === 0) return null;

  return (
    <div
      className={`space-y-1.5 break-words font-sans text-[0.6875rem] font-normal leading-[1.5] tracking-[-0.01em] text-ink-soft ${className}`}
    >
      {groups.map((group) => (
        <ReadingKey
          key={`${group.language}-${group.text}`}
          group={group}
          label={insertValues(t.vocabulary.detail.listenAriaLabel, {
            text: group.text,
          })}
        />
      ))}
    </div>
  );
}

type ReadingGroup = {
  readings: { script: "zhuyin" | "pinyin" | "ipa"; label: string }[];
  text: string;
  speechTag: SpeechLanguage;
  language: LanguageCode;
};

/**
 * One language's readings, which are also its play key. While it plays, the
 * reading is lit with the word: a Chinese word's zhuyin and pinyin a
 * syllable at a time, as each character is said (Chi, 2026-11-14).
 */
function ReadingKey({ group, label }: { group: ReadingGroup; label: string }) {
  const { playing, toggle } = useSpeakToggle({ text: group.text, lang: group.speechTag });

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggle();
      }}
      aria-label={label}
      aria-pressed={playing}
      lang={group.language}
      className="block min-w-0 max-w-full rounded-md text-left transition-colors hover:text-ink-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-amber)]/30 active:text-black"
    >
      {group.readings.map((reading) => (
        <span
          key={reading.script}
          data-script={reading.script}
          /*
           * Pinyin is Mandarin written in Latin letters, and saying so
           * is what stops a browser reaching for a CJK face to draw
           * "tú shū guǎn" and a screen reader from spelling it out
           * character by character in Chinese.
           */
          lang={reading.script === "pinyin" ? "zh-Latn" : group.language}
          className={`block break-words ${reading.script === "zhuyin" ? "font-zhuyin" : "font-phonetic"}`}
        >
          <SpokenReading reading={reading.label} text={group.text} lang={group.speechTag} />
        </span>
      ))}
    </button>
  );
}
