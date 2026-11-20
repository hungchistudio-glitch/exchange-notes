"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { koreanPronounced } from "@/lib/korean/romanize";
import { getLanguage, type LanguageCode } from "@/lib/languages";
import { setReadingDisplay, useReadingDisplay } from "@/components/speech/Furigana";
import { SpokenReading, useSpeakToggle } from "@/components/speech/Spoken";
import type { SpeechLanguage } from "@/lib/speech";
import usePhonetics from "@/hooks/usePhonetics";
import type { Bridge, BridgeEntry } from "@/lib/kanjiBridge";
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
 *   ja                  romaji (the kana is furigana over the word itself)
 *   ko                  the pronounced Hangul ([한구거], when it differs from
 *                       the spelling), then Revised Romanization or IPA,
 *                       one line, swapped by ⇄
 *
 * Which of them show is the reader's choice (讀音顯示, Chi, 2026-11-16).
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
  const display = useReadingDisplay();
  /* The kanji bridge: a Korean word's hanja, a Japanese one in Traditional
     forms (Chi, 2026-11-16: 漢字橋樑). */
  const bridgeEntries = useMemo(
    () => entries.map((entry) => ({ text: entry.text?.trim() ?? "", language: entry.language })),
    [entries],
  );
  const bridges = useKanjiBridge(bridgeEntries);

  const groups = useMemo(
    () =>
      entries.flatMap((entry, index) => {
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
        const lines: [ReadingScript, string | undefined][] =
          entry.language === "ja"
            ? [["romaji", display.romaji ? phonetics?.romaji : undefined]]
            : entry.language === "ko"
              ? display.korean === "off"
                ? []
                : [
                    /* The word as it is said, in Hangul: 한국어 [한구거]. */
                    ["said", saidFor(text)],
                    display.korean === "ipa" ? ["ipa", ipa] : ["rr", phonetics?.rr],
                  ]
              : [
                  ["zhuyin", display.zhuyin ? phonetics?.zhuyin : undefined],
                  ["pinyin", display.pinyin ? phonetics?.pinyin : undefined],
                  ["ipa", ipa],
                ];
        const readings = lines.flatMap(([script, label]) => (label ? [{ script, label }] : []));
        const bridge = bridges[index] ?? null;

        return readings.length || bridge ? [{ readings, text, speechTag, language: entry.language, bridge }] : [];
      }),
    [entries, phoneticsFor, display, bridges],
  );

  if (groups.length === 0) return null;

  return (
    <div
      className={`space-y-1.5 break-words font-sans text-[0.6875rem] font-normal leading-[1.5] tracking-[-0.01em] text-ink-soft ${className}`}
    >
      {groups.map((group) => {
        const id = `${group.language}-${group.text}`;
        const key = group.readings.length ? (
          <ReadingKey
            group={group}
            label={insertValues(t.vocabulary.detail.listenAriaLabel, {
              text: group.text,
            })}
          />
        ) : null;
        /* Korean's one line swaps between romanization and IPA (Chi,
           2026-11-16: 同一行點一下互換), and the choice is remembered. */
        const ipaShown = display.korean === "ipa";
        const reading =
          group.language === "ko" && key ? (
            <span className="flex items-center gap-1.5">
              {key}
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setReadingDisplay({ korean: ipaShown ? "rr" : "ipa" });
                }}
                aria-label={ipaShown ? t.settings.readingDisplay.swapToRomanization : t.settings.readingDisplay.swapToIpa}
                title={ipaShown ? t.settings.readingDisplay.swapToRomanization : t.settings.readingDisplay.swapToIpa}
                className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[0.75rem] text-ink-faint transition-colors hover:text-ink-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-amber)]/30"
              >
                ⇄
              </button>
            </span>
          ) : (
            key
          );
        if (!group.bridge) return <Fragment key={id}>{reading}</Fragment>;
        return (
          <span key={id} className="block">
            {reading}
            <BridgeLine
              bridge={group.bridge}
              label={group.bridge.kind === "hanja" ? t.settings.readingDisplay.hanja : t.settings.readingDisplay.traditionalForms}
            />
          </span>
        );
      })}
    </div>
  );
}

/* =========================================================
   The kanji bridge for the words on a card (lib/kanjiBridge.ts)

   Kept in this file rather than a hook of its own: every word card reaches
   it, and tests/routeImportWeight.test.ts counts each file home and the
   library parse. Its tables are fetched the first time a Japanese or
   Korean word needs them, once for the whole session; a card in any other
   language never loads them.
   ========================================================= */

type BridgeModule = typeof import("@/lib/kanjiBridge");

let loaded: BridgeModule | null = null;
let loading: Promise<BridgeModule> | null = null;

function load(): Promise<BridgeModule> {
  loading ??= import("@/lib/kanjiBridge").then((module) => (loaded = module));
  return loading;
}

/** Whether a word could have a bridge at all, before the tables load. */
function mayHaveBridge(entry: BridgeEntry): boolean {
  if (entry.language === "ko") return /[가-힣]/.test(entry.text);
  if (entry.language === "ja") return /\p{Script=Han}/u.test(entry.text);
  return false;
}

/** Each entry's bridge, by position; null where there is none (yet). */
function useKanjiBridge(entries: readonly BridgeEntry[]): (Bridge | null)[] {
  const wanted = entries.some(mayHaveBridge);
  const [module, setModule] = useState<BridgeModule | null>(loaded);

  useEffect(() => {
    if (!wanted || module) return;
    let live = true;
    load().then(
      (found) => { if (live) setModule(found); },
      () => { /* No bridge is fine; the card is whole without it. */ },
    );
    return () => { live = false; };
  }, [wanted, module]);

  return useMemo(
    () =>
      entries.map((entry, index) =>
        module && mayHaveBridge(entry)
          ? module.bridgeFor(entry, entries.filter((_, other) => other !== index))
          : null,
      ),
    [entries, module],
  );
}

type ReadingScript = "zhuyin" | "pinyin" | "ipa" | "romaji" | "rr" | "said";

/** 한국어 → "[한구거]", or nothing when it is said as it is spelt. */
function saidFor(text: string): string | undefined {
  const said = koreanPronounced(text);
  return said ? `[${said}]` : undefined;
}

type ReadingGroup = {
  readings: { script: ReadingScript; label: string }[];
  text: string;
  speechTag: SpeechLanguage;
  language: LanguageCode;
  bridge: Bridge | null;
};

/** 漢字 圖書館 under 도서관; 繁體 經驗 under 経験. */
function BridgeLine({ bridge, label }: { bridge: Bridge; label: string }) {
  return (
    <span className="font-cjk mt-0.5 block text-ink-soft" data-kanji-bridge={bridge.kind}>
      <span className="text-ink-faint">{label}</span>{" "}
      <span lang="zh-TW">{bridge.text}</span>
    </span>
  );
}

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
          lang={
            reading.script === "pinyin"
              ? "zh-Latn"
              : reading.script === "romaji"
                ? "ja-Latn"
                : reading.script === "rr"
                  ? "ko-Latn"
                  : group.language
          }
          className={`block break-words ${reading.script === "zhuyin" ? "font-zhuyin" : reading.script === "said" ? "font-cjk" : "font-phonetic"}`}
        >
          <SpokenReading reading={reading.label} text={group.text} lang={group.speechTag} />
        </span>
      ))}
    </button>
  );
}
