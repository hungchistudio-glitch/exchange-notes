"use client";

import { useEffect } from "react";

import type { VocabularyItem } from "@/lib/types/app";
import {
  normalizeVocabularyText,
  recordInteractions,
} from "@/lib/vocabulary/helpers";

export default function useVocabularySearchTracking(
  items: VocabularyItem[],
  query: string,
) {
  useEffect(() => {
    const normalizedQuery = normalizeVocabularyText(query);

    if (!normalizedQuery) return;

    const timer = window.setTimeout(() => {
      /*
       * Collected first, written once. One call per match meant one full
       * read-parse-stringify-write of the interaction map per match, so a
       * single common letter against a large library was hundreds of
       * synchronous rewrites every time the reader stopped typing.
       */
      const matched = items.filter(
        (item) =>
          normalizeVocabularyText(item.word).includes(normalizedQuery) ||
          normalizeVocabularyText(item.translation).includes(normalizedQuery),
      );

      recordInteractions(matched, "search");
    }, 500);

    return () => window.clearTimeout(timer);
  }, [items, query]);
}
