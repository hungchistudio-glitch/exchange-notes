import type { ByLanguage } from "@/lib/languages";

/** Every content field changed by the vocabulary editor, legacy and current. */
export type VocabularyEditFields = {
  word: string;
  translation: string;
  example_sentence: string | null;
  translated_example: string | null;
  texts: ByLanguage;
  examples: ByLanguage;
};
