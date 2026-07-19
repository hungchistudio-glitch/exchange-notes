import { LoaderCircle } from "lucide-react";

import SectionHeader from "@/components/ui/SectionHeader";
import VocabularyQuickActions from "../VocabularyQuickActions";
import VocabularySearch from "../VocabularySearch";
import {
  SORT_LABELS,
  type SortMode,
} from "../SortBottomSheet";
import type {
  VocabularyStatus,
} from "@/lib/types/app";

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
    <>
      <div className="mt-7">
        <SectionHeader
          title="Your words"
          description={`${totalWords} saved · ${learningWords} learning · ${masteredWords} mastered`}
        />
      </div>

      <VocabularyQuickActions onAddWord={onOpenAI} />

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

      {sortMode !== "new" &&
        (rankingLoading || rankingError) && (
          <div className="mt-3 flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.12em] text-neutral-400">
            <span>
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
    </>
  );
}
