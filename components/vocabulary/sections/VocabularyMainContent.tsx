"use client";

import type { ComponentProps } from "react";

import VocabularyList from "@/components/vocabulary/VocabularyList";
import VocabularySearchSection from "@/components/vocabulary/sections/VocabularySearchSection";

type VocabularyMainContentProps = {
  error: string;
  searchProps: ComponentProps<typeof VocabularySearchSection>;
  listProps: ComponentProps<typeof VocabularyList>;
};

export default function VocabularyMainContent({
  error,
  searchProps,
  listProps,
}: VocabularyMainContentProps) {
  return (
    // AppPage itself has no horizontal padding by design (each page manages
    // its own insets), and neither VocabularySearchSection nor
    // VocabularyList add any — so this is the one place that gives the
    // search bar, filter chips, and word list some breathing room from the
    // screen edge. 21px matches MurphCompanion's own section padding above,
    // so the page reads as one consistent column, not two different insets.
    <div className="px-[21px]">
      <VocabularySearchSection {...searchProps} />

      {error && !listProps.loading && (
        <p
          role="alert"
          className="mt-5 rounded-[20px] bg-red-50 p-4 text-sm font-bold text-red-700"
        >
          {error}
        </p>
      )}

      <VocabularyList {...listProps} />
    </div>
  );
}
