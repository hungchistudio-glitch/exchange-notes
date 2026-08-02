"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

import useTranslation from "@/hooks/i18n/useTranslation";

export type SortMode = "new" | "for-you" | "trending";

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

  const sortLabels: Record<SortMode, string> = {
    new: search.sortOptions.new,
    "for-you": search.sortOptions.forYou,
    trending: search.sortOptions.trending,
  };

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[300] flex items-end bg-black/20 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={search.sort}
        onClick={(event) => event.stopPropagation()}
        className="w-full rounded-t-[24px] bg-white px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-3 text-black shadow-2xl"
      >
        <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-black/15" />

        <div className="flex items-center justify-between border-b border-black/10 py-3">
          <p className="text-sm uppercase tracking-[0.08em]">{search.sort}</p>

          <button
            type="button"
            onClick={onClose}
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
              onClick={() => onChange(mode)}
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
