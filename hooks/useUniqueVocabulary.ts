"use client";

import { useMemo } from "react";

import type { VocabularyItem } from "@/lib/types/app";
import { getVocabularyKey } from "@/lib/vocabulary/helpers";

export default function useUniqueVocabulary(items: VocabularyItem[]) {
  return useMemo(() => {
    const seen = new Set<string>();

    // Items are loaded newest first, so the newest copy is retained.
    return items.filter((item) => {
      const key = getVocabularyKey(item.word, item.translation);

      if (seen.has(key)) return false;

      seen.add(key);
      return true;
    });
  }, [items]);
}
