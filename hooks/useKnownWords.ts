"use client";

import { useCallback, useMemo } from "react";

import { useOptionalLexiconSearchSheet } from "@/contexts/LexiconSearchContext";
import { useOptionalVocabulary } from "@/contexts/VocabularyContext";
import { buildKnownWords, knownRanges } from "@/lib/vocabulary/knownWords";
import type { VocabularyItem } from "@/lib/types/app";

const NO_ITEMS: VocabularyItem[] = [];

/**
 * The reader's kept words, for marking in what they read, and the lookup a
 * held-down word opens (Chi, 2026-11-15: 新聞裡學過的字發光, 長按查字).
 * Outside the signed-in app (no library, no lookup sheet) nothing is marked
 * and a held word does nothing.
 */
export default function useKnownWords() {
  const items = useOptionalVocabulary()?.items ?? NO_ITEMS;
  const sheet = useOptionalLexiconSearchSheet();
  const known = useMemo(() => buildKnownWords(items), [items]);

  const marksFor = useCallback(
    (text: string, speechTag: string) => knownRanges(text, speechTag, known),
    [known],
  );
  const openSearch = sheet?.openSearch;
  const lookUp = useMemo(
    () => (openSearch ? (word: string) => openSearch({ query: word.trim(), autoSubmit: true }) : undefined),
    [openSearch],
  );

  return { marksFor, lookUp };
}
