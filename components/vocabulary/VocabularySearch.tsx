"use client";

import {
  FolderHeart,
  LayoutGrid,
  List,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";

import { Pill } from "@/components/foundation-legacy";

import type { SortMode } from "@/components/vocabulary/SortBottomSheet";
import type { VocabularyStatus } from "@/lib/types/app";
import useTranslation from "@/hooks/i18n/useTranslation";
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
  onToggleView: () => void;
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
  onToggleView,
}: VocabularySearchProps) {
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
      <div className="flex items-center">
        <label className="flex h-11 min-w-0 flex-1 items-center gap-3 rounded-full border border-[#c9962e]/[0.18] bg-white px-4 shadow-[0_8px_22px_rgba(0,0,0,0.04)] transition-colors focus-within:border-[#c9962e]/45">
          <Search
            size={17}
            strokeWidth={1.8}
            className="shrink-0 text-black/35"
          />

          <input
            type="text"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={search.searchPlaceholder}
            aria-label={search.searchAriaLabel}
            className="h-full min-w-0 flex-1 bg-transparent font-sans text-[14px] font-normal tracking-[-0.01em] text-black outline-none placeholder:text-black/30"
          />

          {query && (
            <button
              type="button"
              onClick={onClear}
              aria-label={search.clearSearch}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black/[0.05] text-black/50 transition-transform active:scale-95"
            >
              <X size={13} strokeWidth={2} />
            </button>
          )}
        </label>

      </div>

      <div className="-mx-1 mt-2.5 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {quickFilters.map((filter) => {
          const selected = quickFilter === filter.value;

          return (
            <Pill
              key={filter.value}
              selected={selected}
              onClick={() => onQuickFilterChange(filter.value)}
            >
              <span>{filter.label}</span>
              <span className={selected ? "text-[#2b2013]/50" : "text-black/25"}>
                {filter.count}
              </span>
            </Pill>
          );
        })}
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-3">
        <p className="font-sans text-[11px] font-medium tracking-[-0.01em] text-black/35">
          {visibleCount} {visibleCount === 1 ? search.word : search.words}
        </p>

        <div
          className="flex items-center gap-2"
          role="toolbar"
          aria-label={search.toolbarAriaLabel}
        >
          <button
            type="button"
            onClick={onOpenSort}
            aria-label={search.sort}
            title={sortLabels[sortMode]}
            className="relative flex h-11 w-11 items-center justify-center rounded-full border border-black/[0.07] bg-white text-black/55 transition duration-200 hover:border-[#c9962e]/30 hover:text-black active:scale-95"
          >
            <SlidersHorizontal size={16} strokeWidth={1.8} />
            <span
              className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-[#c9962e]"
              aria-hidden="true"
            />
          </button>

          <button
            type="button"
            onClick={onOpenCollections}
            aria-label={search.openCollections}
            title={search.openCollections}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-black/[0.07] bg-white text-black/55 transition duration-200 hover:border-[#c9962e]/30 hover:text-black active:scale-95"
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
            className="flex h-11 w-11 items-center justify-center rounded-full border border-black/[0.07] bg-white text-black/55 transition duration-200 hover:border-[#c9962e]/30 hover:text-black active:scale-95"
          >
            {viewMode === "cards" ? (
              <List size={16} strokeWidth={1.8} />
            ) : (
              <LayoutGrid size={16} strokeWidth={1.8} />
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
