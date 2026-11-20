"use client";

import { useState, type ReactNode } from "react";

import LabScreen from "@/components/pronunciation/lab/LabScreen";
import { LabEmpty } from "@/components/pronunciation/lab/StateViews";
import { SpokenMark, useSpeakToggle } from "@/components/speech/Spoken";
import { usePronunciationLab } from "@/contexts/PronunciationLabContext";
import useTranslation from "@/hooks/i18n/useTranslation";
import { getLanguage } from "@/lib/languages";
import {
  HANGUL_COMPOUND_VOWELS,
  HANGUL_CONSONANTS,
  HANGUL_TENSE,
  HANGUL_VOWELS,
  KANA_BASIC,
  KANA_COMBINED,
  KANA_VOICED,
  syllableOf,
  type HangulLetter,
  type KanaRow,
} from "@/lib/pronunciation/alphabets";
import type { SpeechLanguage } from "@/lib/speech";

/* =========================================================
   The kana chart and the Hangul chart (Chi, 2026-11-16)

   The Lab's alphabet module, for the two languages whose writing a
   beginner has to learn before anything else. Every cell is its own play
   key and lights while it sounds, like every other speaker in the app. The
   letters themselves are in lib/pronunciation/alphabets.ts.
   ========================================================= */

export default function AlphabetModule() {
  const { t } = useTranslation();
  const copy = t.pronunciation.lab;
  const { pack } = usePronunciationLab();

  const japanese = pack.language === "ja";
  const korean = pack.language === "ko";

  return (
    <LabScreen
      title={korean ? copy.alphabet.hangulTitle : copy.alphabet.kanaTitle}
      eyebrow={pack.displayName}
      subtitle={korean ? copy.alphabet.hangulDescription : copy.alphabet.kanaDescription}
      backHref="/pronunciation"
      backLabel={copy.backToLab}
    >
      {japanese ? <KanaChart /> : korean ? <HangulChart /> : <LabEmpty title={copy.sounds.empty} />}
    </LabScreen>
  );
}

/* ---------- Japanese ---------- */

type KanaTab = "basic" | "voiced" | "combined";

const KANA_ROWS: Record<KanaTab, readonly KanaRow[]> = {
  basic: KANA_BASIC,
  voiced: KANA_VOICED,
  combined: KANA_COMBINED,
};

export function KanaChart() {
  const { t } = useTranslation();
  const copy = t.pronunciation.lab.alphabet;
  const [tab, setTab] = useState<KanaTab>("basic");
  const [script, setScript] = useState<"hiragana" | "katakana">("hiragana");
  const lang = getLanguage("ja").speechTag;
  const rows = KANA_ROWS[tab];
  const columns = rows[0]?.cells.length ?? 5;

  return (
    <>
      <Chips
        label={copy.kanaTitle}
        options={[
          ["basic", copy.basic],
          ["voiced", copy.voiced],
          ["combined", copy.combined],
        ]}
        selected={tab}
        onSelect={setTab}
      />
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs text-ink-faint">{copy.hint}</p>
        <Chips
          label={copy.hiragana}
          options={[
            ["hiragana", copy.hiragana],
            ["katakana", copy.katakana],
          ]}
          selected={script}
          onSelect={setScript}
          small
        />
      </div>

      <div
        className="mt-3 grid gap-2 pb-6"
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        data-alphabet="kana"
      >
        {rows.flatMap((row) =>
          row.cells.map((cell, index) =>
            cell ? (
              <LetterKey
                key={`${row.id}-${index}`}
                say={cell.hiragana}
                lang={lang}
                glyph={script === "hiragana" ? cell.hiragana : cell.katakana}
                glyphLang="ja"
                below={cell.romaji}
              />
            ) : (
              <span key={`${row.id}-${index}`} aria-hidden="true" />
            ),
          ),
        )}
      </div>
    </>
  );
}

/* ---------- Korean ---------- */

type HangulTab = "consonants" | "vowels" | "syllables";

export function HangulChart() {
  const { t } = useTranslation();
  const copy = t.pronunciation.lab.alphabet;
  const [tab, setTab] = useState<HangulTab>("consonants");
  const lang = getLanguage("ko").speechTag;

  return (
    <>
      <Chips
        label={copy.hangulTitle}
        options={[
          ["consonants", copy.consonants],
          ["vowels", copy.vowels],
          ["syllables", copy.syllables],
        ]}
        selected={tab}
        onSelect={setTab}
      />
      <p className="mt-3 text-xs text-ink-faint">{copy.hint}</p>

      {tab === "consonants" ? (
        <>
          <LetterSection title={copy.basicConsonants} letters={HANGUL_CONSONANTS} lang={lang} />
          <LetterSection title={copy.tenseConsonants} letters={HANGUL_TENSE} lang={lang} />
        </>
      ) : tab === "vowels" ? (
        <>
          <LetterSection title={copy.basicVowels} letters={HANGUL_VOWELS} lang={lang} />
          <LetterSection title={copy.compoundVowels} letters={HANGUL_COMPOUND_VOWELS} lang={lang} />
        </>
      ) : (
        <SyllableGrid lang={lang} />
      )}
    </>
  );
}

function LetterSection({ title, letters, lang }: { title: string; letters: readonly HangulLetter[]; lang: SpeechLanguage }) {
  return (
    <section className="mt-5">
      <h2 className="text-[0.8125rem] font-semibold text-ink-soft">{title}</h2>
      <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-5" data-alphabet="hangul">
        {letters.map((letter) => (
          <LetterKey
            key={letter.letter}
            say={letter.name}
            lang={lang}
            glyph={letter.letter}
            glyphLang="ko"
            above={letter.name === syllableOf("ㅇ", letter.letter) ? undefined : letter.name}
            below={letter.romanization}
          />
        ))}
      </div>
    </section>
  );
}

/** Every basic consonant with every basic vowel: 가 갸 거 겨 … 히. */
function SyllableGrid({ lang }: { lang: SpeechLanguage }) {
  return (
    <div className="-mx-4 mt-4 overflow-x-auto px-4 pb-6 sm:-mx-6 sm:px-6">
      <table className="border-separate border-spacing-1" data-alphabet="syllables">
        <thead>
          <tr>
            <th aria-hidden="true" />
            {HANGUL_VOWELS.map((vowel) => (
              <th key={vowel.letter} scope="col" lang="ko" className="font-cjk px-1 text-[0.875rem] font-semibold text-ink-soft">
                {vowel.letter}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {HANGUL_CONSONANTS.map((consonant) => (
            <tr key={consonant.letter}>
              <th scope="row" lang="ko" className="font-cjk pr-1 text-[0.875rem] font-semibold text-ink-soft">
                {consonant.letter}
              </th>
              {HANGUL_VOWELS.map((vowel) => {
                const syllable = syllableOf(consonant.letter, vowel.letter);
                return (
                  <td key={vowel.letter}>
                    <LetterKey say={syllable} lang={lang} glyph={syllable} glyphLang="ko" compact />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- the pieces ---------- */

/** One letter: its own play key, lit while it sounds. */
function LetterKey({
  say,
  lang,
  glyph,
  glyphLang,
  above,
  below,
  compact = false,
}: {
  say: string;
  lang: SpeechLanguage;
  glyph: string;
  glyphLang: string;
  above?: string;
  below?: string;
  compact?: boolean;
}) {
  const { playing, toggle } = useSpeakToggle({ text: say, lang });

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={playing}
      aria-label={below ? `${glyph} ${below}` : glyph}
      className={`flex w-full flex-col items-center justify-center rounded-2xl border border-black/[0.06] bg-white transition-colors hover:bg-black/[0.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${
        compact ? "h-11 min-w-[2.75rem] px-1" : "min-h-[76px] px-1 py-2"
      }`}
    >
      {above ? (
        <span lang={glyphLang} className="font-cjk text-[0.6875rem] text-ink-faint">
          {above}
        </span>
      ) : null}
      <span lang={glyphLang} className={`font-cjk font-semibold leading-none ${compact ? "text-[1.125rem]" : "text-[1.625rem]"}`}>
        <SpokenMark text={say} lang={lang}>
          {glyph}
        </SpokenMark>
      </span>
      {below ? <span className="font-phonetic mt-1 text-[0.6875rem] text-ink-faint">{below}</span> : null}
    </button>
  );
}

function Chips<Value extends string>({
  label,
  options,
  selected,
  onSelect,
  small = false,
}: {
  label: string;
  options: ReadonlyArray<readonly [Value, string]>;
  selected: Value;
  onSelect: (value: Value) => void;
  small?: boolean;
}): ReactNode {
  return (
    <div className={`flex gap-2 overflow-x-auto ${small ? "" : "-mx-4 px-4 pb-1 sm:-mx-6 sm:px-6"}`} role="tablist" aria-label={label}>
      {options.map(([value, text]) => (
        <button
          key={value}
          type="button"
          role="tab"
          aria-selected={selected === value}
          onClick={() => onSelect(value)}
          className={`font-cjk inline-flex shrink-0 items-center rounded-full border font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${
            small ? "min-h-[36px] px-3 text-[0.75rem]" : "min-h-[44px] px-4 text-[0.8125rem]"
          } ${selected === value ? "border-black bg-black text-white" : "border-line bg-white text-ink-soft hover:text-black"}`}
        >
          {text}
        </button>
      ))}
    </div>
  );
}
