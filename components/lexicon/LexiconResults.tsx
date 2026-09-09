"use client";

import {
  BookmarkCheck,
  BookmarkPlus,
  LoaderCircle,
  Send,
  Share2,
  Sparkles,
  Volume2,
  WifiOff,
} from "lucide-react";

import { useState } from "react";

import LanguageOriginBadge from "@/components/language/LanguageOriginBadge";
import PronunciationBlock from "@/components/pronunciation/PronunciationBlock";
import VocabularyCopyButton from "@/components/vocabulary/ui/VocabularyCopyButton";
import useTranslation from "@/hooks/i18n/useTranslation";
import useDisplayLanguages from "@/hooks/useDisplayLanguages";
import type { LexiconSearch } from "@/hooks/lexicon/useLexiconSearch";
import { peekImageCapture } from "@/lib/lexicon/pendingImageCapture";
import type useLexiconSave from "@/hooks/lexicon/useLexiconSave";
import type { LexiconEntry, LexiconLanguages } from "@/lib/lexicon/types";
import {
  LANGUAGES,
  LANGUAGE_CODES,
  getInterfaceLanguageMeta,
  getLanguage,
  getLanguageName,
  type LanguageCode,
} from "@/lib/languages";
import { speak } from "@/lib/speech";
import type { VocabularyItem } from "@/lib/types/app";
import { insertValues } from "@/lib/utils";
import { getVocabularyCardSides } from "@/lib/vocabulary/cardSides";
import { normalizePartOfSpeech } from "@/lib/vocabulary/partOfSpeech";

/* =========================================================
   What the app knows, in two layers

   Layer one is the reader's own words. Layer two is the dictionary. They are
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
    : "text-[0.625rem] font-semibold uppercase tracking-[0.18em] text-ink-faint";
}

function cardClass(tone: LexiconTone) {
  return tone === "cosmic"
    ? "rounded-[20px] border border-[var(--cosmic-cyan-dim)] bg-[color-mix(in_oklab,var(--color-white)_82%,transparent)]"
    : "rounded-[24px] border border-black/[0.07] bg-white shadow-[0_10px_34px_rgba(0,0,0,0.05)]";
}

/**
 * A speaker button, for one piece of text in one language.
 *
 * Always labelled with the text it will read: a row of unlabelled speakers is
 * unusable with a screen reader, and ambiguous to the eye when two languages
 * sit one above the other.
 *
 * `onSurface` is not decoration. The tinted blocks on this card are painted
 * with --surface, and a --surface button on a --surface block is a button
 * with no edges — it reads as a stray icon rather than something to press.
 * Inside those blocks the button takes the card's own white instead.
 */
function SpeakButton({
  text,
  language,
  label,
  tone,
  onSurface = false,
}: {
  text: string;
  language: LanguageCode;
  label: string;
  tone: LexiconTone;
  onSurface?: boolean;
}) {
  if (!text.trim()) return null;

  return (
    <button
      type="button"
      onClick={() => speak(text, getLanguage(language).speechTag)}
      aria-label={label}
      title={label}
      // 44px, the minimum comfortable target, rather than the 40px the older
      // sheets used — this is a new surface and has no rhythm to preserve.
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95 ${
        tone === "cosmic"
          ? "cosmic-sonar border border-[var(--cosmic-cyan-dim)] text-[var(--cosmic-cyan)]"
          : onSurface
            ? "bg-white text-ink-soft shadow-[0_1px_3px_rgba(0,0,0,0.05)]"
            : "bg-surface text-ink-strong"
      }`}
    >
      <Volume2 size={16} strokeWidth={1.8} aria-hidden="true" />
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
      {/* ---------- layer one: the reader's own words ---------- */}

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
                      <p className="truncate text-[0.9375rem] font-semibold">
                        {sides.primary.text}
                      </p>
                      <p className="truncate text-[0.8125rem] text-ink-soft">
                        {sides.secondary.text}
                      </p>
                      {saved && (
                        <p className="mt-0.5 text-[0.625rem] text-ink-faint">
                          {insertValues(copy.savedOn, { date: saved })}
                        </p>
                      )}
                    </div>

                    <SpeakButton
                      text={sides.primary.text}
                      language={sides.primary.language}
                      label={copy.listen}
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

      {/* ---------- still looking ---------- */}

      {status === "searching" && (
        <section aria-busy="true">
          <p className={eyebrow}>{copy.dictionary}</p>

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

            <p className="mt-4 flex items-center gap-2 text-[0.75rem] text-ink-faint">
              <LoaderCircle size={13} className="animate-spin" aria-hidden="true" />
              {copy.searching}
            </p>
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
              : error || copy.errorDescription}
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
                  {entry.term}
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
                    label={copy.listen}
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
                </div>
              )}

              {/* ---- meaning ---- */}
              {entry.translationUnavailable ? (
                <div className="mt-4 rounded-[18px] border border-[var(--accent-amber)]/20 bg-[var(--accent-amber)]/[0.07] p-4">
                  <p className="text-[0.8125rem] font-semibold text-[var(--accent-amber-deep)]">
                    {copy.noTranslation}
                  </p>
                  <p className="mt-1 text-[0.8125rem] leading-5 text-[var(--accent-amber-deep)]/85">
                    {copy.noTranslationDetail}
                  </p>
                  <button
                    type="button"
                    onClick={search.retry}
                    className="mt-2 text-[0.8125rem] font-semibold text-[var(--accent-amber-deep)] underline underline-offset-2"
                  >
                    {copy.retry}
                  </button>
                </div>
              ) : (
                <div className="mt-4">
                  <p className={eyebrow}>{copy.translationTitle}</p>

                  <div className="mt-1.5 flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-[1.0625rem] leading-7 text-ink-soft">
                        {entry.translation}
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
                      label={copy.listen}
                      tone={tone}
                    />
                  </div>
                </div>
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
                    <p className={eyebrow}>{copy.example}</p>

                    <div className="mt-2.5 flex items-start gap-3">
                      <p className="min-w-0 flex-1 text-[0.875rem] leading-6">
                        {entry.termExample}
                      </p>
                      <SpeakButton
                        text={entry.termExample}
                        language={languages.sourceLanguage}
                        label={copy.listen}
                        tone={tone}
                        onSurface
                      />
                    </div>

                    <div className="mt-2 flex items-start gap-3">
                      <p className="min-w-0 flex-1 text-[0.8125rem] leading-6 text-ink-soft">
                        {entry.translationExample}
                      </p>
                      <SpeakButton
                        text={entry.translationExample}
                        language={languages.glossLanguage}
                        label={copy.listen}
                        tone={tone}
                        onSurface
                      />
                    </div>
                  </div>
                )}

              {/* ---- notices ---- */}
              {result?.degraded && !entry.translationUnavailable && (
                <p
                  role="status"
                  className="mt-4 rounded-[16px] border border-[var(--accent-amber)]/20 bg-[var(--accent-amber)]/[0.07] px-4 py-3 text-[0.75rem] leading-5 text-[var(--accent-amber-deep)]"
                >
                  {copy.degradedNotice}
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
            </div>
          </article>
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

  return (
    <button
      type="button"
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
          {entry.highlight.term}
        </p>
        <SpeakButton
          text={entry.highlight.term}
          language={languages.sourceLanguage}
          label={copy.listen}
          tone={tone}
          onSurface
        />
      </div>

      <div className="mt-0.5 flex items-start gap-3">
        <p className="min-w-0 flex-1 text-[0.8125rem] leading-6 text-ink-soft">
          {entry.highlight.translation}
        </p>
        <SpeakButton
          text={entry.highlight.translation}
          language={languages.glossLanguage}
          label={copy.listen}
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
