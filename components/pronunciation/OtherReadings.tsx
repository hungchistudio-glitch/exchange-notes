"use client";

import { ChevronDown } from "lucide-react";
import { useId, useMemo, useState } from "react";

import AudioButton from "@/components/pronunciation/lab/AudioButton";
import useTranslation from "@/hooks/i18n/useTranslation";
import usePronunciationPlayback from "@/hooks/pronunciation/usePronunciationPlayback";
import usePhonetics from "@/hooks/usePhonetics";
import { fill } from "@/lib/i18n/format";
import type { LanguageCode } from "@/lib/languages";
import type { TermReading } from "@/lib/lexicon/types";
import { findHeteronyms, type HeteronymMatch } from "@/lib/pronunciation/heteronyms";
import type { AudioSource } from "@/lib/pronunciation/lab/audio";
import { localize } from "@/lib/pronunciation/localizedText";

/* =========================================================
   "This word reads more than one way"

   Under a headword in a search result or on a word card, one quiet line —
   「行」 has 3 readings — that opens onto every reading: how it is said,
   what it means said that way, a phrase that can only be read that way
   (tap to hear it), and which one the word on screen is (Chi, 2026-10-19:
   "提示列＋展開全部").

   The app's own lists first (lib/pronunciation/heteronyms); for a word they
   do not have, the readings the lookup's model gave, marked as Yumi's
   suggestion. Nothing at all for a word with one reading, which is most.

   Loaded lazily by both screens: the lists are five languages of data, and
   neither Home nor Vocabulary should carry them before a word needs them
   (tests/routeImportWeight.test.ts).
   ========================================================= */

type OtherReadingsProps = {
  text: string;
  language: LanguageCode;
  partOfSpeech?: string | null;
  /** The headword's IPA, when the screen has it. */
  ipa?: string | null;
  /** The lookup model's readings, for words the lists do not have. */
  suggested?: readonly TermReading[];
  tone?: "warm" | "cosmic";
  className?: string;
};

type Row = {
  phonetic: string;
  pinyin?: string;
  spelling?: string;
  meaning: string;
  example: string;
  examplePhonetic?: string;
};

type Group = { character?: string; rows: Row[]; used: number | null; suggested: boolean };

const bareIpa = (ipa: string) => ipa.replace(/[/[\]ˈˌ.‿ːˑ\s]/g, "");

export default function OtherReadings({
  text,
  language,
  partOfSpeech,
  ipa,
  suggested,
  tone = "warm",
  className = "",
}: OtherReadingsProps) {
  const { t, language: interfaceLanguage } = useTranslation();
  const copy = t.pronunciation.heteronyms;
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const playback = usePronunciationPlayback();

  /* The word's own reading, to tell which listed reading it is — the same
     one its pronunciation row shows, from the same cache. */
  const phonetics = usePhonetics(useMemo(() => [{ text, language }], [text, language]));
  const known = phonetics({ text, language });

  const groups = useMemo<Group[]>(() => {
    const matches: HeteronymMatch[] = findHeteronyms(text, language, {
      partOfSpeech,
      ipa: ipa ?? known?.ipa,
      zhuyin: known?.zhuyin,
    });
    if (matches.length) {
      return matches.map((match) => ({
        character: match.character,
        used: match.used,
        suggested: false,
        rows: match.heteronym.readings.map((reading) => ({
          phonetic: reading.phonetic,
          pinyin: reading.pinyin,
          spelling: reading.spelling,
          meaning: localize(reading.meaning, interfaceLanguage),
          example: reading.example,
          examplePhonetic: reading.examplePhonetic,
        })),
      }));
    }

    if (suggested && suggested.length >= 2) {
      const said = ipa ?? known?.ipa;
      const used = said
        ? suggested.findIndex((reading) => bareIpa(reading.pronunciation) === bareIpa(said))
        : -1;
      return [
        {
          used: used >= 0 ? used : null,
          suggested: true,
          rows: suggested.map((reading) => ({
            phonetic: reading.zhuyin ?? reading.pronunciation,
            pinyin: reading.zhuyin ? reading.pronunciation : undefined,
            meaning: reading.meaning,
            example: reading.example,
          })),
        },
      ];
    }
    return [];
  }, [interfaceLanguage, ipa, known?.ipa, known?.zhuyin, language, partOfSpeech, suggested, text]);

  if (!groups.length) return null;

  const summary = groups
    .map((group) =>
      group.character
        ? fill(copy.summaryCharacter, { character: group.character, count: group.rows.length })
        : fill(copy.summary, { count: group.rows.length }),
    )
    .join(" · ");

  const cosmic = tone === "cosmic";
  const play = (key: string, row: Row) => {
    const source: AudioSource = {
      kind: "speech",
      text: row.example,
      language,
      hint: row.examplePhonetic ? { phonetic: row.examplePhonetic } : undefined,
    };
    playback.play(key, source);
  };

  return (
    <div className={className} data-other-readings="">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        className={`inline-flex min-h-[36px] max-w-full items-center gap-1.5 rounded-full px-3 text-left text-[0.75rem] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
          cosmic
            ? "border border-[var(--cosmic-cyan-dim)] text-[var(--cosmic-cyan)] focus-visible:outline-[var(--cosmic-cyan)]"
            : "bg-[#c9962e]/[0.12] text-ink-strong hover:bg-[#c9962e]/[0.18] focus-visible:outline-black"
        }`}
      >
        <span className="font-cjk min-w-0 truncate">{summary}</span>
        <ChevronDown
          size={14}
          aria-hidden="true"
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
        <span className="sr-only">{open ? copy.hide : copy.show}</span>
      </button>

      {open ? (
        <div id={panelId} className="mt-2 space-y-3">
          {groups.map((group, groupIndex) => (
            <section key={group.character ?? groupIndex} aria-label={group.character ?? text}>
              {group.character ? (
                <p className="font-cjk text-[0.8125rem] font-semibold text-ink-strong" lang="zh-TW">
                  「{group.character}」
                </p>
              ) : null}
              <ul className="mt-1 space-y-1.5">
                {group.rows.map((row, index) => {
                  const key = `reading-${groupIndex}-${index}`;
                  const used = group.used === index;
                  return (
                    <li
                      key={key}
                      className={`flex items-start gap-3 rounded-2xl px-3 py-2.5 ${
                        used
                          ? cosmic
                            ? "border border-[var(--cosmic-cyan-dim)]"
                            : "bg-white ring-1 ring-[#c9962e]/50"
                          : cosmic
                            ? "border border-[var(--cosmic-hairline)]"
                            : "bg-white/70 ring-1 ring-black/[0.05]"
                      }`}
                      data-used={used ? "true" : undefined}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-baseline gap-x-2">
                          {row.spelling ? (
                            <span className="text-[0.9375rem] font-semibold text-ink-strong" lang={language}>
                              {row.spelling}
                            </span>
                          ) : null}
                          <span
                            className={`text-[0.9375rem] text-ink-strong ${language === "zh-TW" ? "font-zhuyin" : "font-phonetic"}`}
                          >
                            {row.phonetic}
                          </span>
                          {row.pinyin ? (
                            <span className="font-phonetic text-[0.75rem] text-ink-soft" lang="zh-Latn">
                              {row.pinyin}
                            </span>
                          ) : null}
                          {used ? (
                            <span className="font-cjk rounded-full bg-[#c9962e]/[0.18] px-2 py-0.5 text-[0.625rem] font-semibold text-ink-strong">
                              {copy.usedHere}
                            </span>
                          ) : null}
                        </p>
                        <p className="font-cjk mt-0.5 text-[0.8125rem] leading-5 text-ink-soft">{row.meaning}</p>
                        <p className="mt-0.5 text-[0.8125rem] text-ink-faint" lang={language}>
                          {row.example}
                        </p>
                      </div>
                      <AudioButton
                        label={fill(copy.play, { example: row.example })}
                        failedLabel={t.pronunciation.cards.playbackFailed}
                        phase={playback.phaseFor(key)}
                        onClick={() => play(key, row)}
                        size="sm"
                      />
                    </li>
                  );
                })}
              </ul>
              {group.suggested ? (
                <p className="font-cjk mt-1.5 text-[0.6875rem] text-ink-faint">{copy.suggested}</p>
              ) : null}
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
}
