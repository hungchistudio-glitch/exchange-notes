"use client";

import { BookOpen, Search, SlidersHorizontal, X } from "lucide-react";

import { Pill } from "@/components/foundation-legacy";

import type { SortMode } from "@/components/vocabulary/SortBottomSheet";
import type { VocabularyStatus } from "@/lib/types/app";
import useTranslation from "@/hooks/i18n/useTranslation";

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
  onQueryChange: (value: string) => void;
  onClear: () => void;
  onQuickFilterChange: (value: "all" | VocabularyStatus) => void;
  onOpenSort: () => void;
  onOpenLibrary: () => void;
};

export default function VocabularySearch({
  query,
  quickFilter,
  quickFilters,
  visibleCount,
  sortMode,
  onQueryChange,
  onClear,
  onQuickFilterChange,
  onOpenSort,
  onOpenLibrary,
}: VocabularySearchProps) {
  const { t } = useTranslation();
  const search = t.vocabulary.search;

  const sortLabels: Record<SortMode, string> = {
    new: search.sortOptions.new,
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

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenSort}
            aria-label={search.sort}
            className="flex h-8 items-center gap-2 rounded-full border border-black/[0.07] bg-white px-3 font-sans text-[11px] font-medium tracking-[-0.01em] text-black/55 transition-transform active:scale-95"
          >
            <SlidersHorizontal size={14} strokeWidth={1.8} />
            {sortLabels[sortMode]}
          </button>

          <button
            type="button"
            onClick={onOpenLibrary}
            aria-label={search.openLibrary}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-black/[0.07] bg-white text-black/55 transition-transform active:scale-95"
          >
            <BookOpen size={15} strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </section>
  );
}
