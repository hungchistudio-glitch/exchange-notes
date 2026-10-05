import type { VocabularyItem } from "@/lib/types/app";

export type LanguageFill = {
  id: string;
  texts: Record<string, string>;
  examples: Record<string, string>;
  basedOnTexts?: Record<string, string>;
  basedOnExamples?: Record<string, string>;
};

function sameValues(a: Record<string, string>, b: Record<string, string>) {
  return Object.keys(a).length === Object.keys(b).length &&
    Object.entries(a).every(([key, value]) => b[key] === value);
}

/** An answer to an older version of a word must never replace an edit. */
export function applyLanguageFill(item: VocabularyItem, patch: LanguageFill): VocabularyItem {
  if (patch.basedOnTexts && !sameValues(item.texts ?? {}, patch.basedOnTexts)) return item;
  if (patch.basedOnExamples && !sameValues(item.examples ?? {}, patch.basedOnExamples)) return item;
  const nonempty = (values: Record<string, string>) => Object.fromEntries(Object.entries(values).filter(([, value]) => value.trim()));
  const texts = { ...patch.texts, ...nonempty(item.texts ?? {}) };
  const examples = { ...patch.examples, ...nonempty(item.examples ?? {}) };
  return { ...item, texts, examples };
}
