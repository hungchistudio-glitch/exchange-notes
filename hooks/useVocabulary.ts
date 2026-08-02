"use client";

import {
  useVocabulary as useVocabularyContext,
} from "@/contexts/VocabularyContext";

export default function useVocabulary() {
  return useVocabularyContext();
}
