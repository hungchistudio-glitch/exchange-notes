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
    <>
      <VocabularySearchSection {...searchProps} />

      {error && (
        <p className="mt-5 rounded-[20px] bg-red-50 p-4 text-sm font-bold text-red-700">
          {error}
        </p>
      )}

      <VocabularyList {...listProps} />
    </>
  );
}
