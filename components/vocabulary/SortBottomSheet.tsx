"use client";

import { X } from "lucide-react";
import { useCallback, useRef } from "react";

import useSheetMotion from "@/components/foundation/overlays/useSheetMotion";
import useTranslation from "@/hooks/i18n/useTranslation";

export type SortMode =
  | "new"
  | "old"
  | "alphabetical"
  | "reverse-alphabetical"
  | "recently-reviewed"
  | "least-reviewed"
  | "for-you"
  | "trending";

/** The sort applied when the user has not chosen one. */
export const DEFAULT_SORT_MODE: SortMode = "new";

type SortBottomSheetProps = {
  value: SortMode;
  onChange: (mode: SortMode) => void;
  onClose: () => void;
};

export default function SortBottomSheet({
  value,
  onChange,
  onClose,
}: SortBottomSheetProps) {
  const { t } = useTranslation();
  const search = t.vocabulary.search;
  const pendingModeRef = useRef<SortMode | null>(null);

  const handleClosed = useCallback(() => {
    const pendingMode = pendingModeRef.current;
    pendingModeRef.current = null;
    if (pendingMode) {
      onChange(pendingMode);
      return;
    }
    onClose();
  }, [onChange, onClose]);

  const motion = useSheetMotion({ onClose: handleClosed });

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
    <div
      className="fixed inset-0 z-[300] flex items-end"
    >
      <button
        type="button"
        aria-label={search.closeSortMenu}
        onClick={motion.requestClose}
        className={`absolute inset-0 bg-black/20 backdrop-blur-[2px] ${motion.backdropClassName}`}
        {...motion.backdropProps}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-label={search.sort}
        {...motion.panelProps}
        className={`${motion.panelClassName} relative z-10 w-full rounded-t-[24px] bg-white px-5 pb-[max(2rem,env(safe-area-inset-bottom))] text-black shadow-2xl`}
      >
        <div
          className={`${motion.handleClassName} -mx-5 flex h-8 items-center justify-center`}
          {...motion.handleProps}
        >
          <span className="h-1 w-9 rounded-full bg-black/15" />
        </div>

        <div className="flex items-center justify-between border-b border-black/10 py-3">
          <p className="text-sm uppercase tracking-[0.08em]">{search.sort}</p>

          <button
            type="button"
            onClick={motion.requestClose}
            aria-label={search.closeSortMenu}
            className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-black/5"
          >
            <X size={16} />
          </button>
        </div>

        <div className="py-2">
          {(Object.keys(sortLabels) as SortMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => {
                pendingModeRef.current = mode;
                motion.requestClose();
              }}
              className="flex w-full items-center border-b border-black/10 py-4 text-left last:border-b-0"
            >
              <span className="w-8 text-lg">{value === mode ? "—" : ""}</span>

              <span className="text-xl uppercase tracking-[-0.02em]">
                {sortLabels[mode]}
              </span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
