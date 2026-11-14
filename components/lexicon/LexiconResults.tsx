"use client";

import {
  ArrowRight,
  BookmarkCheck,
  BookmarkPlus,
  Gift,
  LoaderCircle,
  Play,
  Send,
  Share2,
  Sparkles,
  Square,
  WifiOff,
} from "lucide-react";

import Link from "next/link";
import { lazy, Suspense, useEffect, useState, useSyncExternalStore } from "react";

import LanguageOriginBadge from "@/components/language/LanguageOriginBadge";
import PronunciationBlock from "@/components/pronunciation/PronunciationBlock";
import VocabularyCopyButton from "@/components/vocabulary/ui/VocabularyCopyButton";
import ThemeWords from "@/components/lexicon/ThemeWords";
import YumiInsight from "@/components/lexicon/YumiInsight";
import useTranslation from "@/hooks/i18n/useTranslation";
import useDisplayLanguages from "@/hooks/useDisplayLanguages";
import type {
  LexiconLookupError,
  LexiconSearch,
} from "@/hooks/lexicon/useLexiconSearch";
import { knownFromLookup, saveHelloDraft } from "@/lib/hello/draft";
import { peekImageCapture } from "@/lib/lexicon/pendingImageCapture";
import type useLexiconSave from "@/hooks/lexicon/useLexiconSave";
import type { LexiconEntry, LexiconLanguages } from "@/lib/lexicon/types";

/*
 * A headword's other readings (破音字, "record" the noun and the verb),
 * fetched only when a result is drawn: five languages of lists that Home's
 * first paint should not carry (tests/routeImportWeight.test.ts).
 */
const OtherReadings = lazy(() => import("@/components/pronunciation/OtherReadings"));
import {
  INTERFACE_LANGUAGE_CODE,
  LANGUAGES,
  LANGUAGE_CODES,
  getInterfaceLanguageMeta,
  getLanguage,
  getLanguageName,
  type LanguageCode,
} from "@/lib/languages";
import {
  getServerSpoken,
  getServerWordByWord,
  getSpoken,
  getWordByWord,
  playSpoken,
  segmentWords,
  setWordByWord,
  stopSpoken,
  subscribeToSpoken,
  subscribeToWordByWord,
} from "@/lib/spokenWords";
import type { VocabularyItem } from "@/lib/types/app";
import { insertValues } from "@/lib/utils";
import { getVocabularyCardSides } from "@/lib/vocabulary/cardSides";
import { normalizePartOfSpeech } from "@/lib/vocabulary/partOfSpeech";
import { formatResetTime } from "@/lib/i18n/format";

/* =========================================================
   What the app knows, in two layers

   The dictionary, and under it the reader's own words. They are
   drawn as two labelled sections and never merged into one ranked list,
   because "you saved this in March" is a different kind of answer from "here
   is what it means" — the first one is about the reader and only they can
   have it.

   One component for both shells. The colours are tokens that app/cosmic.css
   already repoints, so the same markup is warm paper in Standard Mode and
   instrumentation on the deck; `tone` adds the deck's cyan and its
   monospaced labels and changes nothing else. Two components would have
   meant two places for the save button to disagree about whether a word was
   already saved.
   ========================================================= */

export type LexiconTone = "warm" | "cosmic";

type LexiconResultsProps = {
  tone?: LexiconTone;
  search: LexiconSearch;
  save: ReturnType<typeof useLexiconSave>;
  /** Opens one of the reader's own words. Absent hides the action. */
  onOpenSaved?: (item: VocabularyItem) => void;
  onShare?: () => void;
  onSend?: () => void;
  /** True while the system share button is showing its "copied" state. */
  shareCopied?: boolean;
};


function eyebrowClass(tone: LexiconTone) {
  return tone === "cosmic"
    ? "hud-label"
    : "text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-ink-faint";
}

function cardClass(tone: LexiconTone) {
  return tone === "cosmic"
    ? "rounded-[20px] border border-[var(--cosmic-cyan-dim)] bg-[color-mix(in_oklab,var(--color-white)_82%,transparent)]"
    : "rounded-[24px] border border-black/[0.07] bg-white shadow-[0_10px_34px_rgba(0,0,0,0.05)]";
}

/** Which text a key and its words share: the same words in the same language. */
function spokenKey(text: string, language: LanguageCode) {
  return `${language}:${text}`;
}

function useSpokenSegment(key: string) {
  const spoken = useSyncExternalStore(subscribeToSpoken, getSpoken, getServerSpoken);
  return spoken?.key === key ? spoken.segment : null;
}

/**
 * The play key, for one piece of text in one language.
 *
 * ▶, and ■ while it plays (Chi, 2026-11-13). It was a bare speaker
 * labelled "Listen", which a first reader did not take for a button at all;
 * the play triangle says what it does before it is pressed, and the square
 * says how to end it. Its word ("Play", "Stop") is its name for a screen
 * reader and its tooltip: on the card it was one word too many beside each
 * sentence (Chi, 2026-11-13, the same day).
 *
 * `onSurface` is not decoration. The tinted blocks on this card are painted
 * with --surface, and a --surface button on a --surface block is a button
 * with no edges — it reads as a stray icon rather than something to press.
 * Inside those blocks the button takes the card's own white instead.
 *
 * `wordByWord` says the text one word at a time (the example block's
 * switch). Either way the words are lit as they are said, by SpokenText.
 */
function SpeakButton({
  text,
  language,
  copy,
  tone,
  onSurface = false,
  wordByWord = false,
}: {
  text: string;
  language: LanguageCode;
  copy: Copy;
  tone: LexiconTone;
  onSurface?: boolean;
  wordByWord?: boolean;
}) {
  const key = spokenKey(text, language);
  const playing = useSpokenSegment(key) !== null;

  if (!text.trim()) return null;

  return (
    <button
      type="button"
      onClick={() =>
        playing
          ? stopSpoken()
          : playSpoken({ key, text, lang: getLanguage(language).speechTag, wordByWord })
      }
      aria-pressed={playing}
      aria-label={playing ? copy.stop : copy.play}
      title={playing ? copy.stop : copy.play}
      data-speak-key=""
      // 44px, the minimum comfortable target.
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95 ${
        tone === "cosmic"
          ? "cosmic-sonar border border-[var(--cosmic-cyan-dim)] text-[var(--cosmic-cyan)]"
          : onSurface
            ? "bg-white text-ink-strong shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
            : "bg-surface text-ink-strong"
      }`}
    >
      {playing ? (
        <Square size={12} fill="currentColor" strokeWidth={0} aria-hidden="true" />
      ) : (
        /* Nudged right: a triangle's weight sits left of its box's centre. */
        <Play size={15} fill="currentColor" strokeWidth={0} className="translate-x-px" aria-hidden="true" />
      )}
    </button>
  );
}

/**
 * Text that lights the word being said, while its play key is playing.
 *
 * Plain text the rest of the time: the split into words is only made while
 * this text is sounding, so a card full of sentences is not a card full of
 * spans for nothing.
 */
function SpokenText({ text, language }: { text: string; language: LanguageCode }) {
  const segment = useSpokenSegment(spokenKey(text, language));

  if (segment === null) return <>{text}</>;

  return (
    <>
      {segmentWords(text, getLanguage(language).speechTag).map((part, index) =>
        index === segment ? (
          <mark key={part.start} className="spoken-now" data-spoken-now="">
            {part.text}
          </mark>
        ) : (
          <span key={part.start}>{part.text}</span>
        ),
      )}
    </>
  );
}

/** The four stages of a wait, by how long it has gone on. */
const LOOKUP_STILL_MS = 4_000;
const LOOKUP_LONG_MS = 10_000;

/**
 * Yumi saying she is looking it up, right under the field, with a bar that
 * moves (Chi, 2026-11-13).
 *
 * A first reader typed a word, saw a small spinner in the send key and some
 * grey blocks, and thought the app had broken or that he had done something
 * wrong. This says what is happening, with the word in it, the moment the
 * lookup starts; after four seconds that it is still going and nearly done,
 * and after ten that it is slow but has not stopped. Keyed by the word, so a
 * new lookup starts its clock again.
 */
function LookupProgress({
  term,
  retrying,
  copy,
  tone,
}: {
  term: string;
  retrying: boolean;
  copy: Copy;
  tone: LexiconTone;
}) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const still = window.setTimeout(() => setStage(1), LOOKUP_STILL_MS);
    const long = window.setTimeout(() => setStage(2), LOOKUP_LONG_MS);
    return () => {
      window.clearTimeout(still);
      window.clearTimeout(long);
    };
  }, []);

  const line = retrying
    ? copy.retrying
    : stage === 0
      ? insertValues(copy.lookingUp, { term })
      : stage === 1
        ? copy.stillLooking
        : copy.takingLong;

  return (
    <div
      role="status"
      aria-live="polite"
      data-lookup-progress=""
      className={`px-4 py-3 ${cardClass(tone)}`}
    >
      <p className="flex items-center gap-2.5 text-[0.9375rem] font-semibold leading-6">
        <span
          aria-hidden="true"
          className={`lookup-yumi ${tone === "cosmic" ? "lookup-yumi-cosmic" : ""}`}
        />
        <span className="min-w-0 flex-1 break-words">{line}</span>
      </p>
      <div aria-hidden="true" className="lookup-bar mt-2.5">
        <span />
      </div>
    </div>
  );
}

/**
 * The example block's switch: say each sentence one word at a time, with a
 * pause between (Chi, 2026-11-13). Kept on this device.
 */
function WordByWordSwitch({ copy, tone }: { copy: Copy; tone: LexiconTone }) {
  const on = useSyncExternalStore(subscribeToWordByWord, getWordByWord, getServerWordByWord);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => {
        stopSpoken();
        setWordByWord(!on);
      }}
      className={`flex h-8 shrink-0 items-center gap-2 rounded-full border px-3 text-[0.6875rem] font-semibold transition-colors ${
        on
          ? tone === "cosmic"
            ? "border-[var(--cosmic-cyan)] text-[var(--cosmic-cyan)]"
            : "border-black bg-black text-white"
          : tone === "cosmic"
            ? "border-[var(--cosmic-cyan-dim)] text-[var(--cosmic-cyan)]"
            : "border-black/15 bg-white text-ink-soft"
      }`}
    >
      <span
        aria-hidden="true"
        className={`relative h-3.5 w-6 rounded-full transition-colors ${
          on ? "bg-white/35" : "bg-black/15"
        }`}
      >
        <span
          className={`absolute top-0.5 h-2.5 w-2.5 rounded-full transition-[left] ${
            on ? "left-3 bg-white" : "left-0.5 bg-white"
          }`}
        />
      </span>
      {copy.wordByWord}
    </button>
  );
}

export default function LexiconResults({
  tone = "warm",
  search,
  save,
  onOpenSaved,
  onShare,
  onSend,
  shareCopied = false,
}: LexiconResultsProps) {
  const { t, language: interfaceLanguage } = useTranslation();
  const copy = t.lexicon;
  const { pair } = useDisplayLanguages();

  const { status, result, preview, error, savedMatches, query } = search;
  const wordByWord = useSyncExternalStore(
    subscribeToWordByWord,
    getWordByWord,
    getServerWordByWord,
  );

  /*
   * Which query the language picker was opened for, or null.
   *
   * Storing the query rather than a boolean is what closes the picker by
   * itself when the reader looks up something else — no effect, no reset, and
   * no way for a picker to survive onto a word it was never opened for.
   */
  const [pickerFor, setPickerFor] = useState<string | null>(null);

  const dateFormatter = new Intl.DateTimeFormat(
    getInterfaceLanguageMeta(interfaceLanguage).htmlLang,
    { year: "numeric", month: "short", day: "numeric" },
  );

  function formatDate(value: string | null | undefined) {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : dateFormatter.format(date);
  }

  const eyebrow = eyebrowClass(tone);

  /* ---------- nothing asked yet ---------- */

  if (status === "idle" && savedMatches.length === 0) {
    return (
      <div className="px-1 py-14 text-center">
        <div
          className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${
            tone === "cosmic"
              ? "border border-[var(--cosmic-cyan-dim)] text-[var(--cosmic-cyan)]"
              : "bg-surface text-ink-soft"
          }`}
        >
          <Sparkles size={20} strokeWidth={1.6} aria-hidden="true" />
        </div>

        <p className="mt-4 text-[0.9375rem] font-semibold">{copy.emptyTitle}</p>
        <p className="mx-auto mt-1.5 max-w-xs text-[0.8125rem] leading-6 text-ink-soft">
          {copy.emptyDescription}
        </p>

        <ThemeWords
          className="mt-6"
          tone={tone}
          onPick={(word) => search.submit(word, "type")}
        />
      </div>
    );
  }

  const entry = result?.entry ?? null;

  /*
   * Read during render rather than held in state, and deliberately.
   *
   * The capture is put there by the lookup before the term reaches the
   * search, so by the time this card exists the picture is already waiting —
   * there is no moment where a re-render would be needed to reveal it. And
   * the save consumes it, so mirroring it into state would leave a stale
   * copy on screen after the word had been kept.
   */
  const capturedImage = entry ? peekImageCapture(entry.term) : null;
  const languages = result?.languages ?? null;
  const isSentence = result?.kind === "sentence";
  const helloKnown = knownFromLookup(entry);

  /*
   * The picker shows itself when the app is unsure, and on request when it is
   * sure and wrong. Tying "on request" to the query it was opened for means
   * looking up a different word closes it without anything having to remember
   * to.
   */
  const pickerOpen = Boolean(
    languages &&
      (languages.ambiguous ||
        (pickerFor !== null && pickerFor === result?.query)),
  );

  /*
   * Asked for by a reader who disagrees with a confident answer, the useful
   * set is everything the app teaches — they are looking for the language the
   * detector did *not* propose. The narrow candidate list is only right when
   * the app raised the question itself.
   */
  const pickerLanguages = languages?.ambiguous
    ? languages.candidates
    : LANGUAGE_CODES.filter((code) => LANGUAGES[code].availableAsLearning);

  /*
   * The offline dictionary's early answer, shown only while the real one is
   * still coming. It has a word and a meaning and no example sentences —
   * those are the parts it invents, so the card keeps a skeleton there rather
   * than flashing text the real result then overwrites.
   */
  const showPreview = status === "searching" && preview !== null;

  return (
    <div className="space-y-6">
      {/* ---------- still looking ---------- */}

      {status === "searching" && (
        <section aria-busy="true">
          <LookupProgress
            key={query.trim()}
            term={query.trim()}
            retrying={search.retrying}
            copy={copy}
            tone={tone}
          />

          <p className={`mt-5 ${eyebrow}`}>{copy.dictionary}</p>

          <div className={`mt-3 p-5 ${cardClass(tone)}`}>
            {showPreview ? (
              <>
                <p className="text-[1.5rem] font-bold tracking-[-0.02em]">
                  {preview.term}
                </p>

                {preview.translation ? (
                  <p className="mt-1 text-[0.9375rem] text-ink-soft">
                    {preview.translation}
                  </p>
                ) : (
                  <div className="mt-2 h-4 w-2/5 animate-pulse rounded-full bg-black/[0.06]" />
                )}
              </>
            ) : (
              <div className="h-7 w-1/2 animate-pulse rounded-full bg-black/[0.06]" />
            )}

            <div className="mt-5 space-y-2">
              <div className="h-4 w-4/5 animate-pulse rounded-full bg-black/[0.06]" />
              <div className="h-4 w-3/5 animate-pulse rounded-full bg-black/[0.06]" />
            </div>

          </div>
        </section>
      )}

      {/* ---------- nothing reachable ---------- */}

      {status === "error" && (
        <section
          role="status"
          className={`p-5 ${cardClass(tone)}`}
        >
          <p className="flex items-center gap-2 text-[0.875rem] font-semibold">
            {result?.offline && (
              <WifiOff size={15} strokeWidth={1.8} aria-hidden="true" />
            )}
            {result?.offline ? copy.offlineTitle : copy.errorTitle}
          </p>

          <p className="mt-1.5 text-[0.8125rem] leading-6 text-ink-soft">
            {result?.offline
              ? copy.offlineDescription
              : lookupErrorText(error, copy)}
          </p>

          <button
            type="button"
            onClick={search.retry}
            className="mt-3 text-[0.8125rem] font-semibold underline underline-offset-2"
          >
            {copy.retry}
          </button>
        </section>
      )}

      {/* ---------- layer two: the dictionary ---------- */}

      {status === "ready" && entry && languages && (
        <section aria-label={copy.dictionary}>
          <div className="flex items-center justify-between gap-3">
            <p className={eyebrow}>
              {isSentence
                ? copy.sentenceTitle
                : result?.kind === "phrase"
                  ? copy.phraseTitle
                  : copy.dictionary}
            </p>

            <div className="flex items-center gap-2">
              <LanguageOriginBadge
                language={languages.sourceLanguage}
                size="sm"
                showLabel
              />

              {/*
                Opens the picker below. It used to call chooseLanguage with the
                language the result was already in — which re-ran the identical
                lookup, returned the identical card, and looked to the reader
                like a button that did nothing. A control named "change
                language" has to offer a different language.

                Hidden while the picker is showing for either reason: the
                question is already on screen, and asking it twice reads as two
                separate questions.
              */}
              {!languages.ambiguous && !pickerOpen && (
                <button
                  type="button"
                  onClick={() => setPickerFor(result?.query ?? query)}
                  aria-expanded={false}
                  className="text-[0.6875rem] font-semibold text-ink-faint underline underline-offset-2"
                >
                  {copy.changeLanguage}
                </button>
              )}
            </div>
          </div>

          {/*
            Two ways to arrive here, and they offer different sets.

            Unprompted, because the spelling says one language and the
            dictionary says another: the two contenders are what the reader
            needs, and narrowing to them is the whole value of having noticed.

            Asked for, because the reader disagrees with a confident answer:
            they are looking for something that is *not* on the shortlist, so
            the shortlist would be exactly the wrong thing to show. Every
            language the app teaches, minus the one it already picked.
          */}
          {pickerOpen && (
            <div className={`mt-3 p-4 ${cardClass(tone)}`}>
              <p className="text-[0.8125rem] font-semibold">{copy.chooseLanguage}</p>
              <p className="mt-1 text-[0.75rem] leading-5 text-ink-soft">
                {languages.ambiguous
                  ? copy.chooseLanguageDescription
                  : copy.changeLanguage}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {pickerLanguages.map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => {
                      setPickerFor(null);
                      search.chooseLanguage(code);
                    }}
                    // The card's own language: this control changes what the
                    // card leads with, not what the reader typed.
                    aria-pressed={code === languages.sourceLanguage}
                    className={`flex h-11 items-center gap-2 rounded-full border px-3.5 text-[0.75rem] font-semibold transition-transform active:scale-95 ${
                      code === languages.sourceLanguage
                        ? tone === "cosmic"
                          ? "border-[var(--cosmic-cyan)] text-[var(--cosmic-cyan)]"
                          : "border-black bg-black text-white"
                        : "border-black/10 text-ink-soft"
                    }`}
                  >
                    <LanguageOriginBadge language={code} size="sm" />
                    {getLanguageName(code, interfaceLanguage)}
                  </button>
                ))}
              </div>

              {!languages.ambiguous && (
                <button
                  type="button"
                  onClick={() => setPickerFor(null)}
                  className="mt-3 text-[0.75rem] font-semibold text-ink-faint underline underline-offset-2"
                >
                  {copy.cancel}
                </button>
              )}
            </div>
          )}

          <article className={`mt-3 overflow-hidden ${cardClass(tone)}`}>
            {/*
              The photograph this word came from, above the word — the same
              place, and the same 16:9 container, that a saved card uses.

              Without it there was no way to tell a word that will arrive
              with a picture from one that will not: the photo was captured,
              cropped and held, and the reader had nothing to confirm it by
              until they saved and went looking. It was reported, reasonably,
              as the photo not being kept.

              Only ever present for a word a camera produced, and only until
              the save claims it.
            */}
            {capturedImage && (
              // An object URL for a blob already in memory on this device.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={capturedImage}
                alt=""
                className="aspect-[16/9] w-full object-cover"
              />
            )}

            <div className="p-5">
              {/* ---- headword ---- */}
              <div className="flex items-start gap-3">
                <p
                  className={`min-w-0 flex-1 break-words font-semibold tracking-[-0.03em] ${
                    isSentence ? "text-[1.1875rem] leading-7" : "text-[1.75rem]"
                  }`}
                >
                  <SpokenText text={entry.term} language={languages.sourceLanguage} />
                </p>

                <div className="flex shrink-0 items-center gap-2">
                  <VocabularyCopyButton
                    text={entry.term}
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95 ${
                      tone === "cosmic"
                        ? "border border-[var(--cosmic-cyan-dim)] text-[var(--cosmic-cyan)]"
                        : "bg-black text-white"
                    }`}
                  />
                  <SpeakButton
                    text={entry.term}
                    language={languages.sourceLanguage}
                    copy={copy}
                    tone={tone}
                  />
                </div>
              </div>

              {/*
                The headword's own annotation, and only its own.
                
                PronunciationBlock flattens every entry it is given into one
                column, so passing both sides put the Chinese pinyin of the
                *meaning* directly under an Italian headword — where it reads
                as how you say the Italian. Each side carries its own reading
                now, beside the words it belongs to.
              */}
              {!isSentence && (
                <div className="mt-3 rounded-[18px] bg-surface px-4 py-3">
                  <PronunciationBlock
                    entries={[
                      { text: entry.term, language: languages.sourceLanguage },
                    ]}
                  />

                  {entry.partOfSpeech && (
                    <p className="mt-2 text-[0.6875rem] tracking-[0.04em] text-ink-faint">
                      {
                        t.vocabulary.detail.partOfSpeech[
                          normalizePartOfSpeech(entry.partOfSpeech)
                        ]
                      }
                    </p>
                  )}

                  <Suspense fallback={null}>
                    <OtherReadings
                      className="mt-2.5"
                      text={entry.term}
                      language={languages.sourceLanguage}
                      partOfSpeech={entry.partOfSpeech}
                      ipa={entry.termIpa}
                      suggested={entry.termReadings}
                      tone={tone}
                    />
                  </Suspense>
                </div>
              )}

              {/* ---- meaning ---- */}
              {entry.translationUnavailable ? (
                <div className="mt-4 rounded-[18px] border border-[var(--accent-amber)]/20 bg-[var(--accent-amber)]/[0.07] p-4">
                  {/*
                    Out of quota is said differently from busy: a retry
                    cannot help before the reset, so there is no retry key —
                    only when it comes back, and what still works meanwhile.
                  */}
                  <p className="text-[0.8125rem] font-semibold text-[var(--accent-amber-deep)]">
                    {result?.dailyLimitReached ? copy.dailyLimitTitle : result?.quotaResetsAt ? copy.quotaTitle : copy.noTranslation}
                  </p>
                  <p className="mt-1 text-[0.8125rem] leading-5 text-[var(--accent-amber-deep)]/85">
                    {result?.dailyLimitReached ? copy.dailyLimitDetail : result?.quotaResetsAt
                      ? copy.quotaDetail.replace(
                          "{time}",
                          formatResetTime(
                            result.quotaResetsAt,
                            INTERFACE_LANGUAGE_CODE[interfaceLanguage],
                          ),
                        )
                      : copy.noTranslationDetail}
                  </p>
                  {result?.quotaResetsAt || result?.dailyLimitReached ? null : (
                    <button
                      type="button"
                      onClick={search.retry}
                      className="mt-2 text-[0.8125rem] font-semibold text-[var(--accent-amber-deep)] underline underline-offset-2"
                    >
                      {copy.retry}
                    </button>
                  )}
                </div>
              ) : (
                <div className="mt-4">
                  <p className={eyebrow}>{copy.translationTitle}</p>

                  <div className="mt-1.5 flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-[1.0625rem] leading-7 text-ink-soft">
                        <SpokenText text={entry.translation} language={languages.glossLanguage} />
                      </p>

                      {!isSentence && (
                        <PronunciationBlock
                          className="mt-1"
                          entries={[
                            {
                              text: entry.translation,
                              language: languages.glossLanguage,
                            },
                          ]}
                        />
                      )}
                    </div>

                    <SpeakButton
                      text={entry.translation}
                      language={languages.glossLanguage}
                      copy={copy}
                      tone={tone}
                    />
                  </div>
                </div>
              )}

              {/* ---- what it means beyond what it says ---- */}
              {isSentence && !entry.translationUnavailable && (
                <YumiInsight
                  insight={entry.insight}
                  phraseLanguage={languages.queryLanguage}
                  tone={tone}
                />
              )}

              {/* ---- examples ---- */}
              {/*
                Two sentences, two speakers.

                They are the same sentence in two different languages, and
                hearing one is not hearing the other — a learner reading a
                Spanish example glossed in Chinese needs the Spanish said
                aloud to learn it and the Chinese said aloud to check they
                understood it. One shared speaker could only ever read one of
                them, which made the other half of the block look like a
                caption rather than something to listen to.
              */}
              {!isSentence &&
                entry.termExample &&
                entry.translationExample && (
                  <div className="mt-5 rounded-[18px] bg-surface p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className={eyebrow}>{copy.example}</p>
                      <WordByWordSwitch copy={copy} tone={tone} />
                    </div>

                    <div className="mt-2.5 flex items-start gap-3">
                      <p className="min-w-0 flex-1 text-[0.875rem] leading-6">
                        <SpokenText text={entry.termExample} language={languages.sourceLanguage} />
                      </p>
                      <SpeakButton
                        text={entry.termExample}
                        language={languages.sourceLanguage}
                        copy={copy}
                        tone={tone}
                        onSurface
                        wordByWord={wordByWord}
                      />
                    </div>

                    <div className="mt-2 flex items-start gap-3">
                      <p className="min-w-0 flex-1 text-[0.8125rem] leading-6 text-ink-soft">
                        <SpokenText text={entry.translationExample} language={languages.glossLanguage} />
                      </p>
                      <SpeakButton
                        text={entry.translationExample}
                        language={languages.glossLanguage}
                        copy={copy}
                        tone={tone}
                        onSurface
                        wordByWord={wordByWord}
                      />
                    </div>
                  </div>
                )}

              {/* ---- notices ---- */}
              {entry.basicTranslation && (
                <p
                  role="status"
                  className="mt-4 rounded-[16px] border border-line bg-surface px-4 py-3 text-[0.75rem] leading-5 text-ink-soft"
                >
                  {copy.basicTranslation}
                </p>
              )}

              {result?.dailyLimitReached && !entry.translationUnavailable && (
                <p role="status" className="mt-4 rounded-[16px] border border-line bg-surface px-4 py-3 text-[0.75rem] leading-5 text-ink-soft">{copy.dailyLimitDetail}</p>
              )}

              {result?.degraded && !result.dailyLimitReached &&
                !entry.translationUnavailable &&
                !entry.basicTranslation && (
                <p
                  role="status"
                  className="mt-4 rounded-[16px] border border-[var(--accent-amber)]/20 bg-[var(--accent-amber)]/[0.07] px-4 py-3 text-[0.75rem] leading-5 text-[var(--accent-amber-deep)]"
                >
                  {copy.degradedNotice}
                </p>
              )}

              {result?.onDevice && (
                <p
                  role="status"
                  className="mt-4 rounded-[16px] border border-line bg-surface px-4 py-3 text-[0.75rem] leading-5 text-ink-soft"
                >
                  {result.onDevice === "pending"
                    ? copy.onDevicePending
                    : copy.onDeviceFinal}
                </p>
              )}

              {entry.confidence === "low" && !result?.degraded && (
                <p
                  role="status"
                  className="mt-4 rounded-[16px] border border-[var(--accent-amber)]/20 bg-[var(--accent-amber)]/[0.07] px-4 py-3 text-[0.75rem] leading-5 text-[var(--accent-amber-deep)]"
                >
                  {copy.lowConfidence}
                </p>
              )}

              {/* ---- keeping it ---- */}
              {isSentence ? (
                <SentenceKeep
                  copy={copy}
                  tone={tone}
                  entry={entry}
                  languages={languages}
                  save={save}
                />
              ) : (
                <SaveRow
                  copy={copy}
                  tone={tone}
                  variant="entry"
                  disabled={Boolean(entry.translationUnavailable)}
                  save={save}
                  onOpenSaved={onOpenSaved}
                />
              )}

              {(onShare || onSend) && !entry.translationUnavailable && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {onShare && (
                    <button
                      type="button"
                      onClick={onShare}
                      className="flex h-11 items-center justify-center gap-2 rounded-full bg-surface text-[0.75rem] font-semibold transition-transform active:scale-[0.98]"
                    >
                      <Share2 size={15} aria-hidden="true" />
                      {shareCopied ? copy.copied : copy.share}
                    </button>
                  )}

                  {onSend && (
                    <button
                      type="button"
                      onClick={onSend}
                      className="flex h-11 items-center justify-center gap-2 rounded-full bg-surface text-[0.75rem] font-semibold transition-transform active:scale-[0.98]"
                    >
                      <Send size={15} aria-hidden="true" />
                      {copy.send}
                    </button>
                  )}
                </div>
              )}

              {/* A public hello made from this word, without saving it (components/hello/HelloEditor.tsx). */}
              {helloKnown && (
                <Link
                  href="/invitations/new?from=lookup"
                  onClick={() => saveHelloDraft(helloKnown)}
                  className="mt-2 flex h-11 items-center justify-center gap-2 rounded-full bg-surface text-[0.75rem] font-semibold transition-transform active:scale-[0.98]"
                >
                  <Gift size={15} aria-hidden="true" />
                  {t.hello.sendWithYumi}
                </Link>
              )}
            </div>
          </article>
        </section>
      )}

      {/* ---------- the reader's own words ----------

        Below the dictionary, not above it (Chi, 2026-11-13). Above, a match
        from the library pushed the answer to what was just asked down the
        screen, and a first reader saw "your vocabulary" sitting where he
        expected the dictionary. While nothing has been asked yet — the
        reader still typing — it is the only thing here, so the order changes
        nothing then. */}

      {savedMatches.length > 0 && (
        <section aria-label={copy.yourVocabulary}>
          <p className={eyebrow}>{copy.yourVocabulary}</p>

          <ul className="mt-3 space-y-2">
            {savedMatches.map((item) => {
              const saved = formatDate(item.created_at);

              /*
               * The app's own answer to "which side of a saved card leads",
               * not a second one invented here. A saved word leads in the
               * language it was saved in — deliberately, and not in the
               * language being studied today, because the background fill
               * eventually gives every row a text in that language and a
               * library where everything leads in Italian is not a library
               * that remembers you once studied French. See
               * lib/vocabulary/cardSides.ts.
               */
              const sides = getVocabularyCardSides(item, pair[0], pair[1]);

              return (
                <li key={item.id}>
                  <div
                    className={`flex items-center gap-3 px-4 py-3 ${cardClass(tone)}`}
                  >
                    <LanguageOriginBadge language={sides.primary.language} size="sm" />

                    <div className="min-w-0 flex-1">
                      <p className="tactile-serif truncate text-[0.9375rem] font-semibold">
                        <SpokenText text={sides.primary.text} language={sides.primary.language} />
                      </p>
                      <p className="truncate text-[0.8125rem] text-ink-soft">
                        {sides.secondary.text}
                      </p>
                      {saved && (
                        <p className="mt-0.5 text-[0.6875rem] text-ink-faint">
                          {insertValues(copy.savedOn, { date: saved })}
                        </p>
                      )}
                    </div>

                    <SpeakButton
                      text={sides.primary.text}
                      language={sides.primary.language}
                      copy={copy}
                      tone={tone}
                    />

                    {onOpenSaved && (
                      <button
                        type="button"
                        onClick={() => onOpenSaved(item)}
                        className={`h-9 shrink-0 rounded-full px-4 text-[0.75rem] font-semibold transition-transform active:scale-95 ${
                          tone === "cosmic"
                            ? "border border-[var(--cosmic-cyan-dim)] text-[var(--cosmic-cyan)]"
                            : "bg-black text-white"
                        }`}
                      >
                        {copy.openWord}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Offline, with the word found on the device and no dictionary behind
          it. A complete answer rather than an empty state, and said plainly
          instead of left as silence under the list. */}
      {status === "ready" && !entry && result?.offline && (
        <p className="px-1 text-[0.8125rem] leading-6 text-ink-soft" role="status">
          {savedMatches.length > 0
            ? copy.offlineDescription
            : copy.errorDescription}
        </p>
      )}

      {status === "typing" && savedMatches.length === 0 && query.trim() && (
        <p className="px-1 py-6 text-center text-[0.8125rem] leading-6 text-ink-soft">
          {copy.emptyDescription}
        </p>
      )}
    </div>
  );
}

/* ---------- pieces ---------- */

type Copy = ReturnType<typeof useTranslation>["t"]["lexicon"];

function lookupErrorText(error: LexiconLookupError, copy: Copy) {
  if (error === "sign-in") return copy.signInError;
  if (error === "too-long") return copy.tooLongError;
  return copy.lookupFailedError;
}

/**
 * The save control, in whichever of its four states applies.
 *
 * "Already in your vocabulary" is a state of this button rather than an
 * error shown after tapping it, because the reader can see the word is
 * already theirs before they reach for it — and because tapping a button
 * whose only possible outcome is a refusal is a small insult.
 */
function SaveRow({
  copy,
  tone,
  variant,
  disabled,
  save,
  onOpenSaved,
  label,
}: {
  copy: Copy;
  tone: LexiconTone;
  variant: "entry" | "highlight";
  disabled: boolean;
  save: ReturnType<typeof useLexiconSave>;
  onOpenSaved?: (item: VocabularyItem) => void;
  label?: string;
}) {
  const state = save.stateFor(variant);
  const duplicate = save.duplicateFor(variant);

  if (state === "duplicate" && duplicate) {
    return (
      <div className="mt-5 rounded-[18px] bg-surface p-4">
        <p className="text-[0.8125rem] font-semibold">{copy.alreadySaved}</p>

        {onOpenSaved && (
          <button
            type="button"
            onClick={() => onOpenSaved(duplicate)}
            className="mt-2 text-[0.8125rem] font-semibold underline underline-offset-2"
          >
            {copy.openSavedWord}
          </button>
        )}
      </div>
    );
  }

  const key = (
    <button
      type="button"
      data-coach-target="save-word"
      onClick={() => void save.save(variant)}
      disabled={disabled || state === "saving" || state === "saved"}
      className={`mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full text-[0.8125rem] font-semibold transition-transform active:scale-[0.99] disabled:opacity-40 ${
        tone === "cosmic"
          ? "cosmic-lock border border-[var(--cosmic-cyan-dim)] text-[var(--cosmic-cyan)]"
          : "bg-black text-white"
      }`}
    >
      {state === "saving" ? (
        <>
          <LoaderCircle size={15} className="animate-spin" aria-hidden="true" />
          {copy.saving}
        </>
      ) : state === "saved" ? (
        <>
          <BookmarkCheck size={16} aria-hidden="true" />
          {copy.saved}
        </>
      ) : (
        <>
          <BookmarkPlus size={16} aria-hidden="true" />
          {label ?? copy.save}
        </>
      )}
    </button>
  );

  if (state !== "saved") return key;

  /*
   * Where it went (Chi, 2026-11-13). A first reader kept a few words, looked
   * up the next, and lost sight of the ones he had kept: the list he wanted
   * is the vocabulary page, and nothing on this card said so.
   */
  return (
    <>
      {key}
      <Link
        href="/vocabulary"
        data-view-my-words=""
        className={`mt-2 flex h-11 items-center justify-center gap-2 rounded-full text-[0.8125rem] font-semibold transition-transform active:scale-[0.99] ${
          tone === "cosmic"
            ? "border border-[var(--cosmic-cyan-dim)] text-[var(--cosmic-cyan)]"
            : "border border-black/15 bg-white text-ink-strong"
        }`}
      >
        {copy.viewMyWords}
        <ArrowRight size={15} aria-hidden="true" />
      </Link>
    </>
  );
}

/**
 * What to keep out of a sentence.
 *
 * The sentence itself is never offered: a card whose front is a paragraph is
 * not a thing anyone can be tested on, and a deck full of them is how
 * spaced repetition quietly stops working. What is offered is the span the
 * model singled out — and if it found nothing worth keeping, the honest
 * answer is that this was a translation, not a word to learn.
 */
function SentenceKeep({
  copy,
  tone,
  entry,
  languages,
  save,
}: {
  copy: Copy;
  tone: LexiconTone;
  entry: LexiconEntry;
  languages: LexiconLanguages;
  save: ReturnType<typeof useLexiconSave>;
}) {
  if (!entry.highlight) {
    return (
      <p className="mt-5 rounded-[18px] bg-surface px-4 py-3 text-[0.75rem] leading-5 text-ink-soft">
        {copy.sentenceNotSavable}
      </p>
    );
  }

  return (
    <div className="mt-5 rounded-[18px] bg-surface p-4">
      <p className={eyebrowClass(tone)}>{copy.worthKeeping}</p>

      {/* Same rule as the example block: each language says itself. */}
      <div className="mt-2 flex items-start gap-3">
        <p className="min-w-0 flex-1 text-[1.0625rem] font-semibold">
          <SpokenText text={entry.highlight.term} language={languages.sourceLanguage} />
        </p>
        <SpeakButton
          text={entry.highlight.term}
          language={languages.sourceLanguage}
          copy={copy}
          tone={tone}
          onSurface
        />
      </div>

      <div className="mt-0.5 flex items-start gap-3">
        <p className="min-w-0 flex-1 text-[0.8125rem] leading-6 text-ink-soft">
          <SpokenText text={entry.highlight.translation} language={languages.glossLanguage} />
        </p>
        <SpeakButton
          text={entry.highlight.translation}
          language={languages.glossLanguage}
          copy={copy}
          tone={tone}
          onSurface
        />
      </div>

      <p className="mt-3 text-[0.75rem] leading-5 text-ink-soft">
        {copy.sentenceNotSavable}
      </p>

      <SaveRow
        copy={copy}
        tone={tone}
        variant="highlight"
        disabled={false}
        save={save}
        label={insertValues(copy.savePhrase, { term: entry.highlight.term })}
      />
    </div>
  );
}
