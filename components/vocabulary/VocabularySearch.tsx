"use client";

import {
  ArrowRight,
  ChevronDown,
  FolderHeart,
  Languages,
  LayoutGrid,
  List,
  LoaderCircle,
  Mic,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

import { Pill } from "@/components/foundation-legacy";
import LanguageOriginBadge from "@/components/language/LanguageOriginBadge";
import LexiconImageMenu from "@/components/lexicon/LexiconImageMenu";

import type { SortMode } from "@/components/vocabulary/SortBottomSheet";
import { DEFAULT_SORT_MODE } from "@/components/vocabulary/SortBottomSheet";
import { useLexiconSearchSheet } from "@/contexts/LexiconSearchContext";
import type { VocabularyStatus } from "@/lib/types/app";
import useTranslation from "@/hooks/i18n/useTranslation";
import useLexiconImageLookup from "@/hooks/lexicon/useLexiconImageLookup";
import { useLearningLanguageContext } from "@/contexts/LearningLanguageContext";
import { getLanguage, type LanguageCode } from "@/lib/languages";
import useVoiceInput from "@/hooks/useVoiceInput";
import type { VocabularyViewMode } from "@/lib/vocabulary/viewMode";

type QuickFilter = {
  value: "all" | VocabularyStatus;
  label: string;
  count: number;
};

type VocabularySearchProps = {
  query: string;
  quickFilter: "all" | VocabularyStatus;
  quickFilters: QuickFilter[];
  visibleCount: number;
  sortMode: SortMode;
  viewMode: VocabularyViewMode;
  onQueryChange: (value: string) => void;
  onClear: () => void;
  onQuickFilterChange: (value: "all" | VocabularyStatus) => void;
  onOpenSort: () => void;
  onOpenCollections: () => void;
  onOpenLanguageFilter: () => void;
  onToggleView: () => void;
  /** Empty means every language. */
  languageFilter: readonly LanguageCode[];
  /** How many languages the library actually holds, for hiding the control. */
  languageCount: number;
};

export default function VocabularySearch({
  query,
  quickFilter,
  quickFilters,
  visibleCount,
  sortMode,
  viewMode,
  onQueryChange,
  onClear,
  onQuickFilterChange,
  onOpenSort,
  onOpenCollections,
  onOpenLanguageFilter,
  onToggleView,
  languageFilter,
  languageCount,
}: VocabularySearchProps) {
  const { t } = useTranslation();
  const { learningLanguage } = useLearningLanguageContext();
  const { openSearch } = useLexiconSearchSheet();
  const search = t.vocabulary.search;
  const language = t.vocabulary.language;

  const imageLookup = useLexiconImageLookup({
    onTerm: (term) => openSearch({ query: term, autoSubmit: true }),
  });

  // Dictate in the language being learned — that's what the user is
  // searching their vocabulary for.
  const { supported: voiceSupported, listening, toggle: toggleVoice } =
    useVoiceInput({
      // Dictation listens in the language being learned, whichever it is.
      lang: getLanguage(learningLanguage).speechTag,
      onResult: onQueryChange,
    });

  /*
   * 36px, and deliberately not the 44pt a standalone control would get.
   *
   * These two live *inside* the search field, which is 44 tall — so the
   * vertical dimension is at guidance and only the horizontal is short. Widen
   * them and the placeholder stops fitting: two 44px discs plus the field's
   * own padding and the search icon leave under 90px for the input on a 375px
   * phone, which is not enough to read the word you are typing. A control you
   * can hit but cannot see the result of is the worse trade, so the width
   * stays and the row's full height carries the target.
   */
  /*
   * What the field does when you press Enter, or the key beside the clear
   * button.
   *
   * Typing here filters the words you already have, live — which is right, and
   * is also why there was nothing to submit and no key to press. But the most
   * common thing to type is a word you have just met and do not have yet, and
   * that search ends at "0 words" with the answer one screen away and no way
   * to ask for it. This carries the term straight into the lexicon, which is
   * the same hand-off the camera key already makes.
   */
  function lookUpQuery() {
    const term = query.trim();
    if (!term) return;

    openSearch({ query: term, autoSubmit: true });
  }

  const lookupButtonClass =
    "cosmic-instrument flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-soft transition duration-200 hover:bg-black/[0.04] hover:text-black active:scale-90";

  const sortLabels: Record<SortMode, string> = {
    new: search.sortOptions.new,
    old: search.sortOptions.old,
    alphabetical: search.sortOptions.alphabetical,
    "reverse-alphabetical": search.sortOptions.reverseAlphabetical,
    "recently-reviewed": search.sortOptions.recentlyReviewed,
    "least-reviewed": search.sortOptions.leastReviewed,
    "for-you": search.sortOptions.forYou,
    trending: search.sortOptions.trending,
  };

  return (
    <section className="mt-4">
      <form
        className="flex items-center"
        onSubmit={(event) => {
          event.preventDefault();
          lookUpQuery();
        }}
      >
        {/* cosmic-console turns the field into the brief's glass-tech control
            — cyan hairline, internal gradient, a glow that arrives on focus —
            and does nothing at all in Standard Mode. See app/cosmic.css. */}
        <label className="cosmic-console flex h-11 min-w-0 flex-1 items-center gap-3 rounded-full border border-[var(--accent-amber)]/[0.18] bg-white px-4 shadow-[0_8px_22px_rgba(0,0,0,0.04)] transition-colors focus-within:border-[var(--accent-amber)]/45">
          <Search
            size={17}
            strokeWidth={1.8}
            className="shrink-0 text-ink-faint"
          />

          <input
            data-vocabulary-search-input
            type="text"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={search.searchPlaceholder}
            aria-label={search.searchAriaLabel}
            enterKeyHint="search"
            className="h-full min-w-0 flex-1 bg-transparent font-sans text-[14px] font-normal tracking-[-0.01em] text-black outline-none placeholder:text-ink-faint"
          />

          {query && (
            <button
              type="button"
              onClick={onClear}
              aria-label={search.clearSearch}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/[0.05] text-ink-soft transition-transform active:scale-95"
            >
              <X size={13} strokeWidth={2} />
            </button>
          )}

          {/* Same shape, same icon and the same label as the lexicon sheet's
              own submit, because it is the same action arriving from a
              different field. Present only with something to look up.

              No cosmic variant is needed: app/cosmic.css remaps --color-black
              and --color-white, so `bg-black text-white` becomes a pale key
              with deep navy on it and keeps its contrast in both modes. */}
          {query.trim() && (
            <button
              type="submit"
              aria-label={t.lexicon.search}
              title={t.lexicon.search}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black text-white transition-transform active:scale-95"
            >
              <ArrowRight size={15} strokeWidth={2} aria-hidden="true" />
            </button>
          )}

          {/* Recognition shortcuts live inside the field because they are
              alternative ways of asking about a word. The one camera key
              delegates source choice to iOS, then uses the same direct image
              recognition and lexicon result as every other search surface.
              There is deliberately no second photo key and no capture-page
              detour. Voice remains on-device through the Web Speech API. */}
          <span
            className="flex shrink-0 items-center gap-0.5 border-l border-black/[0.07] pl-1.5"
            role="toolbar"
            aria-label={search.lookupToolbarAriaLabel}
          >
            <LexiconImageMenu
              onFile={imageLookup.handleFile}
              onCapture={({ raster, targetRect }) =>
                imageLookup.handleCapture(raster, targetRect)
              }
              busy={imageLookup.reading}
              disabled={imageLookup.reading}
              buttonClassName={`${lookupButtonClass} disabled:opacity-50`}
            />

            {voiceSupported && (
              <button
                type="button"
                onClick={toggleVoice}
                aria-label={
                  listening ? search.voiceListening : search.voiceSearch
                }
                title={listening ? search.voiceListening : search.voiceSearch}
                aria-pressed={listening}
                className={
                  listening
                    ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--accent-amber)] text-white transition duration-200 active:scale-90"
                    : lookupButtonClass
                }
              >
                <Mic
                  size={16}
                  strokeWidth={1.8}
                  className={listening ? "animate-pulse" : undefined}
                />
              </button>
            )}
          </span>
        </label>
      </form>

      {imageLookup.reading ? (
        <p
          role="status"
          className="mt-2 flex items-center gap-2 px-2 text-[11px] text-ink-soft"
        >
          <LoaderCircle size={12} className="animate-spin" aria-hidden="true" />
          {t.capture.analysis.description}
        </p>
      ) : null}

      {imageLookup.error ? (
        <p role="alert" className="mt-2 px-2 text-[11px] text-red-600">
          {imageLookup.error}
        </p>
      ) : null}

      <div className="-mx-1 mt-2.5 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {quickFilters.map((filter) => {
          const selected = quickFilter === filter.value;

          return (
            <Pill
              key={filter.value}
              selected={selected}
              className="cosmic-chip"
              onClick={() => onQuickFilterChange(filter.value)}
            >
              <span>{filter.label}</span>
              {/* The selected count keeps the full --accent-amber-ink: at /50
                  it composited to 2.36:1 on the gold fill. Undimmed it is
                  5.98:1, and the fill alone already separates it from the
                  unselected pills. Cosmic Mode has no gold fill to sit on, so
                  it takes the chip's own cyan instead — see .cosmic-chip. */}
              <span
                className={`cosmic-chip-count ${
                  selected ? "text-[var(--accent-amber-ink)]" : "text-ink-faint"
                }`}
              >
                {filter.count}
              </span>
            </Pill>
          );
        })}
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-3">
        {/*
          The language filter, and only when there is a choice to make.

          A library in one language has nothing to filter, and a control that
          can only be set to the value it already has is furniture. It
          appears the first time a second language is saved.

          It leads the row rather than joining the icon cluster on the right
          because it is the only one of these controls whose current value is
          worth reading at a glance — the others say what they do, this one
          says what you are looking at.
        */}
        {languageCount > 1 ? (
          <button
            type="button"
            onClick={onOpenLanguageFilter}
            aria-label={language.filterAriaLabel}
            className="cosmic-instrument flex h-11 min-w-0 shrink items-center gap-2 rounded-full border border-black/[0.07] bg-white px-3 text-ink-soft transition duration-200 hover:border-[var(--accent-amber)]/30 hover:text-black active:scale-95"
          >
            {languageFilter.length === 1 ? (
              <>
                <LanguageOriginBadge
                  language={languageFilter[0]}
                  size="sm"
                  className="!border-0 !bg-transparent !px-0 !py-0"
                />
                <span className="min-w-0 truncate text-[12px] font-semibold tracking-[-0.01em] text-black">
                  {getLanguage(languageFilter[0]).endonym}
                </span>
              </>
            ) : (
              <>
                <Languages size={16} strokeWidth={1.8} />
                <span className="min-w-0 truncate text-[12px] font-medium tracking-[-0.01em]">
                  {languageFilter.length > 1
                    ? languageFilter
                        .map((code) => getLanguage(code).badge)
                        .join(" · ")
                    : language.allLanguages}
                </span>
              </>
            )}

            <ChevronDown size={14} strokeWidth={2} className="shrink-0" />
          </button>
        ) : (
          <span aria-hidden="true" />
        )}

        <div
          className="flex shrink-0 items-center gap-2"
          role="toolbar"
          aria-label={search.toolbarAriaLabel}
        >
          <button
            type="button"
            onClick={onOpenSort}
            aria-label={`${search.sort}: ${sortLabels[sortMode]}`}
            title={sortLabels[sortMode]}
            className="cosmic-instrument relative flex h-11 w-11 items-center justify-center rounded-full border border-black/[0.07] bg-white text-ink-soft transition duration-200 hover:border-[var(--accent-amber)]/30 hover:text-black active:scale-95"
          >
            <SlidersHorizontal size={16} strokeWidth={1.8} />
            {sortMode !== DEFAULT_SORT_MODE && (
              <span
                className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[var(--accent-amber)]"
                aria-hidden="true"
              />
            )}
          </button>

          <button
            type="button"
            onClick={onOpenCollections}
            aria-label={search.openCollections}
            title={search.openCollections}
            className="cosmic-instrument flex h-11 w-11 items-center justify-center rounded-full border border-black/[0.07] bg-white text-ink-soft transition duration-200 hover:border-[var(--accent-amber)]/30 hover:text-black active:scale-95"
          >
            <FolderHeart size={16} strokeWidth={1.8} />
          </button>

          <button
            type="button"
            onClick={onToggleView}
            aria-label={
              viewMode === "cards" ? search.compactView : search.cardsView
            }
            title={
              viewMode === "cards" ? search.compactView : search.cardsView
            }
            aria-pressed={viewMode === "compact"}
            className="cosmic-instrument flex h-11 w-11 items-center justify-center rounded-full border border-black/[0.07] bg-white text-ink-soft transition duration-200 hover:border-[var(--accent-amber)]/30 hover:text-black active:scale-95"
          >
            {viewMode === "cards" ? (
              <List size={16} strokeWidth={1.8} />
            ) : (
              <LayoutGrid size={16} strokeWidth={1.8} />
            )}
          </button>
        </div>
      </div>

      {/* The sort mode belongs on screen rather than only on the button, whose
          icon-only form left `title` as the sole indication — and a title
          tooltip never fires on touch, so on a phone there was no way to see
          which sort was active without opening the sheet. It sits on its own
          line now that the language control shares the row above: three
          44pt controls and a language pill leave no room to read a sentence
          beside them on a narrow phone. */}
      <p className="mt-2 min-w-0 truncate font-sans text-[11px] font-medium tracking-[-0.01em] text-ink-faint">
        {visibleCount} {visibleCount === 1 ? search.word : search.words}
        <span aria-hidden="true"> · </span>
        <span className="text-ink-soft">{sortLabels[sortMode]}</span>
      </p>
    </section>
  );
}
