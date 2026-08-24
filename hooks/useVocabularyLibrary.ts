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

        /*
         * Every language the row is held in, matching the main search box.
         * This looked at the stored pair alone, so a word the reader could
         * see on the card in a third language could not be found by typing
         * what they were looking at.
         */
        return [
          item.word,
          item.translation,
          ...Object.values(item.texts ?? {}),
        ].some((text) =>
          text ? normalizeVocabularyText(text).includes(normalizedSearch) : false,
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
