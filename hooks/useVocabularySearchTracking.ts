"use client";

import { useEffect } from "react";

import type { VocabularyItem } from "@/lib/types/app";
import {
  normalizeVocabularyText,
  recordInteraction,
} from "@/lib/vocabulary/helpers";

export default function useVocabularySearchTracking(
  items: VocabularyItem[],
  query: string,
) {
  useEffect(() => {
    const normalizedQuery = normalizeVocabularyText(query);

    if (!normalizedQuery) return;

    const timer = window.setTimeout(() => {
      items.forEach((item) => {
        const matches =
          normalizeVocabularyText(item.word).includes(normalizedQuery) ||
          normalizeVocabularyText(item.translation).includes(normalizedQuery);

        if (matches) {
          recordInteraction(item, "search");
        }
      });
    }, 500);

    return () => window.clearTimeout(timer);
  }, [items, query]);
}
