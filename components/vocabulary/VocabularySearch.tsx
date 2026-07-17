"use client";

import { BookOpen, Search, SlidersHorizontal, X, Zap } from "lucide-react";

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
  onOpenAI: () => void;
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
  onOpenAI,
  onQuickFilterChange,
  onOpenSort,
  onOpenLibrary,
}: VocabularySearchProps) {
  return (
    <section className="mt-5">
      <div className="flex items-center gap-2">
        <label className="flex h-12 min-w-0 flex-1 items-center gap-3 rounded-full border border-black/[0.06] bg-white px-4 shadow-[0_3px_16px_rgba(0,0,0,0.035)]">
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
            className="h-full min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-black/30"
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

        <button
          type="button"
          onClick={onOpenAI}
          aria-label="Search any word with Gemini AI"
          title="AI Word Search"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-black text-white shadow-[0_8px_24px_rgba(0,0,0,0.14)] transition-transform active:scale-95"
        >
          <Zap size={17} strokeWidth={1.9} />
        </button>
      </div>

      <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {quickFilters.map((filter) => {
          const selected = quickFilter === filter.value;

          return (
            <button
              key={filter.value}
              type="button"
              onClick={() => onQuickFilterChange(filter.value)}
              className={`flex h-9 shrink-0 items-center gap-2 rounded-full px-4 text-[12px] font-semibold transition-all active:scale-[0.98] ${
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

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-[11px] text-black/35">
          {visibleCount} {visibleCount === 1 ? "word" : "words"}
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenSort}
            aria-label="Sort vocabulary"
            className="flex h-9 items-center gap-2 rounded-full border border-black/[0.06] bg-white px-3 text-[11px] font-semibold text-black/55 transition-transform active:scale-95"
          >
            <SlidersHorizontal size={14} strokeWidth={1.8} />
            {SORT_LABELS[sortMode]}
          </button>

          <button
            type="button"
            onClick={onOpenLibrary}
            aria-label="Open vocabulary library"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-black/[0.06] bg-white text-black/55 transition-transform active:scale-95"
          >
            <BookOpen size={15} strokeWidth={1.8} />
          </button>
        </div>
      </div>
    </section>
  );
}
