import { LoaderCircle } from "lucide-react";

import useTranslation from "@/hooks/i18n/useTranslation";
import type { VocabularyStatus } from "@/lib/types/app";
import type { VocabularyViewMode } from "@/lib/vocabulary/viewMode";

import type { SortMode } from "../SortBottomSheet";
import VocabularySearch from "../VocabularySearch";

type QuickFilter = {
  value: "all" | VocabularyStatus;
  label: string;
  count: number;
};

type Props = {
  totalWords: number;
  learningWords: number;
  masteredWords: number;

  query: string;
  quickFilter: "all" | VocabularyStatus;
  quickFilters: QuickFilter[];
  visibleCount: number;
  sortMode: SortMode;
  viewMode: VocabularyViewMode;

  rankingLoading: boolean;
  rankingError: string;

  onQueryChange: (value: string) => void;
  onClear: () => void;
  onQuickFilterChange: (
    value: "all" | VocabularyStatus,
  ) => void;
  onOpenSort: () => void;
  onOpenCollections: () => void;
  onToggleView: () => void;
};

export default function VocabularySearchSection({
  totalWords,
  learningWords,
  masteredWords,
  query,
  quickFilter,
  quickFilters,
  visibleCount,
  sortMode,
  viewMode,
  rankingLoading,
  rankingError,
  onQueryChange,
  onClear,
  onQuickFilterChange,
  onOpenSort,
  onOpenCollections,
  onToggleView,
}: Props) {
  const { t } = useTranslation();
  const search = t.vocabulary.search;

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
      <div className="mb-4 flex items-end justify-between gap-4">
        <div className="min-w-0">
          {/* hud-label is the app's shared Cosmic micro-label (app/cosmic.css)
              and is inert in every other shell, so the eyebrow becomes an
              instrument readout in deep space and stays a plain caption
              everywhere else — no branch, no second component. */}
          <p className="hud-label text-[11px] font-semibold uppercase tracking-[0.15em] text-ink-faint">
            {search.vocabulary}
          </p>

          <h2 className="mt-1 text-[26px] font-semibold tracking-[-0.04em] text-black">
            {search.yourWords}
          </h2>

          {/* The three figures are lit in Cosmic Mode and left alone in
              Standard — see .cosmic-metric in app/cosmic.css. They were
              already separate expressions, so this costs a span each and no
              change to the sentence a translator sees. */}
          <p className="mt-1 text-[13px] text-ink-soft">
            <span className="cosmic-metric">{totalWords}</span> {search.saved} ·{" "}
            <span className="cosmic-metric">{learningWords}</span>{" "}
            {search.learning} ·{" "}
            <span className="cosmic-metric">{masteredWords}</span>{" "}
            {search.mastered}
          </p>
        </div>

        {/*
          The panel's own instrument mark: a small orbit diagram that pairs
          Mission Control below with the field above it. Hidden by default and
          revealed only by the Cosmic rule, which is one class rather than a
          mode check — see .cosmic-orbit-mark in app/cosmic.css.
        */}
        <span aria-hidden="true" className="hidden cosmic-orbit-mark" />
      </div>

      <div className="cosmic-panel rounded-[24px] bg-white p-3 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
        <VocabularySearch
          query={query}
          quickFilter={quickFilter}
          quickFilters={quickFilters}
          visibleCount={visibleCount}
          sortMode={sortMode}
          viewMode={viewMode}
          onQueryChange={onQueryChange}
          onClear={onClear}
          onQuickFilterChange={onQuickFilterChange}
          onOpenSort={onOpenSort}
          onOpenCollections={onOpenCollections}
          onToggleView={onToggleView}
        />
      </div>

      {(sortMode === "for-you" || sortMode === "trending") &&
        (rankingLoading || rankingError) && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-[16px] bg-black/[0.035] px-3.5 py-3 text-[11px] font-medium text-ink-soft">
            <span className="min-w-0">
              {rankingLoading
                ? search.personalizing.replace(
                    "{sort}",
                    sortLabels[sortMode],
                  )
                : rankingError}
            </span>

            {rankingLoading ? (
              <LoaderCircle
                size={14}
                className="shrink-0 animate-spin"
              />
            ) : null}
          </div>
        )}
    </section>
  );
}
