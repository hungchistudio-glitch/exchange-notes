"use client";

import { BookOpen, Search, SlidersHorizontal, X } from "lucide-react";

import {
  SORT_LABELS,
  type SortMode,
} from "@/components/vocabulary/SortBottomSheet";
import type { VocabularyStatus } from "@/lib/types/app";

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
  return (
    <section className="mt-4">
      <div className="flex items-center">
        <label className="flex h-11 min-w-0 flex-1 items-center gap-3 rounded-full border border-black/[0.07] bg-white px-4 shadow-[0_8px_22px_rgba(0,0,0,0.04)]">
          <Search
            size={17}
            strokeWidth={1.8}
            className="shrink-0 text-black/35"
          />

          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search saved vocabulary"
            aria-label="Search saved vocabulary"
            className="h-full min-w-0 flex-1 bg-transparent font-sans text-[14px] font-normal tracking-[-0.01em] text-black outline-none placeholder:text-black/30"
          />

          {query && (
            <button
              type="button"
              onClick={onClear}
              aria-label="Clear vocabulary search"
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
            <button
              key={filter.value}
              type="button"
              onClick={() => onQuickFilterChange(filter.value)}
              className={`flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3.5 font-sans text-[12px] font-medium tracking-[-0.01em] transition-all active:scale-[0.98] ${
                selected
                  ? "bg-black text-white"
                  : "border border-black/[0.06] bg-white text-black/50"
              }`}
            >
              <span>{filter.label}</span>
              <span className={selected ? "text-white/50" : "text-black/25"}>
                {filter.count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-3">
        <p className="font-sans text-[11px] font-medium tracking-[-0.01em] text-black/35">
          {visibleCount} {visibleCount === 1 ? "word" : "words"}
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenSort}
            aria-label="Sort vocabulary"
            className="flex h-8 items-center gap-2 rounded-full border border-black/[0.07] bg-white px-3 font-sans text-[11px] font-medium tracking-[-0.01em] text-black/55 transition-transform active:scale-95"
          >
            <SlidersHorizontal size={14} strokeWidth={1.8} />
            {SORT_LABELS[sortMode]}
          </button>

          <button
            type="button"
            onClick={onOpenLibrary}
            aria-label="Open vocabulary library"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-black/[0.07] bg-white text-black/55 transition-transform active:scale-95"
          >
            <BookOpen size={15} strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </section>
  );
}
