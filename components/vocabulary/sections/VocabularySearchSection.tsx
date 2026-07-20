import { LoaderCircle, Sparkles } from "lucide-react";

import VocabularySearch from "../VocabularySearch";
import {
  SORT_LABELS,
  type SortMode,
} from "../SortBottomSheet";
import type { VocabularyStatus } from "@/lib/types/app";

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

  rankingLoading: boolean;
  rankingError: string;

  onQueryChange: (value: string) => void;
  onClear: () => void;
  onOpenAI: () => void;
  onQuickFilterChange: (
    value: "all" | VocabularyStatus,
  ) => void;
  onOpenSort: () => void;
  onOpenLibrary: () => void;
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
  rankingLoading,
  rankingError,
  onQueryChange,
  onClear,
  onOpenAI,
  onQuickFilterChange,
  onOpenSort,
  onOpenLibrary,
}: Props) {
  return (
    <section className="mt-7">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-black/35">
            Vocabulary
          </p>

          <h2 className="mt-1 text-[26px] font-semibold tracking-[-0.04em] text-black">
            Your words
          </h2>

          <p className="mt-1 text-[13px] text-black/45">
            {totalWords} saved · {learningWords} learning ·{" "}
            {masteredWords} mastered
          </p>
        </div>

        <button
          type="button"
          onClick={onOpenAI}
          className="flex h-10 shrink-0 items-center gap-2 rounded-full bg-black px-4 text-[12px] font-semibold text-white transition active:scale-[0.98]"
        >
          <Sparkles size={14} strokeWidth={1.8} />
          Add word
        </button>
      </div>

      <div className="rounded-[24px] bg-white p-3 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
        <VocabularySearch
          query={query}
          quickFilter={quickFilter}
          quickFilters={quickFilters}
          visibleCount={visibleCount}
          sortMode={sortMode}
          onQueryChange={onQueryChange}
          onClear={onClear}
          onQuickFilterChange={onQuickFilterChange}
          onOpenSort={onOpenSort}
          onOpenLibrary={onOpenLibrary}
        />
      </div>

      {sortMode !== "new" &&
        (rankingLoading || rankingError) && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-[16px] bg-black/[0.035] px-3.5 py-3 text-[11px] font-medium text-black/45">
            <span className="min-w-0">
              {rankingLoading
                ? `Personalizing ${SORT_LABELS[sortMode]}…`
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
