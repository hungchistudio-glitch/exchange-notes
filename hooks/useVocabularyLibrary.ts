"use client";

import { useMemo, useState } from "react";

import type { VocabularyItem } from "@/lib/types/app";
import { normalizeVocabularyText } from "@/lib/vocabulary/helpers";

export default function useVocabularyLibrary(items: VocabularyItem[]) {
  const [filterSearch, setFilterSearch] = useState("");

  const alphabetizedItems = useMemo(() => {
    const normalizedSearch = normalizeVocabularyText(filterSearch);

    return [...items]
      .filter((item) => {
        if (!normalizedSearch) return true;

        return (
          normalizeVocabularyText(item.word).includes(normalizedSearch) ||
          normalizeVocabularyText(item.translation).includes(normalizedSearch)
        );
      })
      .sort((a, b) =>
        a.word.localeCompare(b.word, "en", { sensitivity: "base" }),
      );
  }, [filterSearch, items]);

  function clearFilterSearch() {
    setFilterSearch("");
  }

  return {
    filterSearch,
    setFilterSearch,
    alphabetizedItems,
    clearFilterSearch,
  };
}
