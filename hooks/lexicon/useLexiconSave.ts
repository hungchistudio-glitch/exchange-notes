"use client";

import { useCallback, useMemo, useState } from "react";

import useDisplayLanguages from "@/hooks/useDisplayLanguages";
import { canonicalTerm, identityKey } from "@/lib/lexicon/normalize";
import { findDuplicate } from "@/lib/lexicon/personal";
import type { LexiconResult } from "@/lib/lexicon/types";
import { announceWordSaved } from "@/lib/pet/wordSaved";
import type { VocabularyItem } from "@/lib/types/app";
import {
  DuplicateVocabularyError,
  createVocabularyEntry,
} from "@/lib/vocabulary/createEntry";
import { getCurrentUser } from "@/lib/vocabulary/repository";

/* =========================================================
   Keeping a word, once

   Both shells save through here, so "already in your vocabulary" means the
   same thing on the deck as it does on the home screen, and a word saved in
   one is a duplicate in the other. The write itself goes through
   createVocabularyEntry — the one door into the table — which resolves the
   languages and refuses a duplicate on its own; this hook is what turns that
   refusal into something a screen can show.
   ========================================================= */

/** Which part of a result is being kept. */
export type LexiconSaveVariant = "entry" | "highlight";

export type LexiconSaveState =
  | "idle"
  | "saving"
  | "saved"
  /** The word is already in the library, and `duplicate` says which row. */
  | "duplicate"
  | "error";

type UseLexiconSaveOptions = {
  result: LexiconResult | null;
  /** The reader's library, live — used for the pre-check and passed through. */
  items: readonly VocabularyItem[];
  /** Lets the caller put the new row into its own list without a refetch. */
  onSaved?: (item: VocabularyItem) => void;
};

type SaveRecord = {
  state: Exclude<LexiconSaveState, "idle">;
  duplicate: VocabularyItem | null;
};

export default function useLexiconSave({
  result,
  items,
  onSaved,
}: UseLexiconSaveOptions) {
  const { pair } = useDisplayLanguages();

  /*
   * Keyed by word rather than reset when the result changes.
   *
   * An effect that cleared the button on every new result was both a
   * synchronous setState inside an effect and slightly wrong: looking up a
   * word you saved a moment ago should still read as saved, not offer to
   * save it twice.
   */
  const [records, setRecords] = useState<Record<string, SaveRecord>>({});

  const targets = useMemo(() => {
    if (!result?.entry) return null;

    const { entry, languages } = result;

    const main = {
      term: canonicalTerm(result.query, entry.term),
      translation: entry.translation,
      partOfSpeech: entry.partOfSpeech,
      termExample: entry.termExample,
      translationExample: entry.translationExample,
    };

    return {
      entry: main,
      highlight: entry.highlight
        ? {
            term: entry.highlight.term,
            translation: entry.highlight.translation,
            partOfSpeech: entry.highlight.partOfSpeech,
            /*
             * The sentence the phrase was met in, which is the best example
             * sentence there could be — it is the one the reader actually
             * read.
             */
            termExample: entry.term,
            translationExample: entry.translation,
          }
        : null,
      languages,
    };
  }, [result]);

  const keyFor = useCallback(
    (variant: LexiconSaveVariant) => {
      if (!targets) return null;

      const target = variant === "highlight" ? targets.highlight : targets.entry;
      if (!target) return null;

      return identityKey(target.term, targets.languages.sourceLanguage);
    },
    [targets],
  );

  /**
   * What the button should say, right now.
   *
   * A word already in the library reads as saved even if this session never
   * saved it — which is the honest answer, and stops the reader from tapping
   * a button whose only possible outcome is a refusal.
   */
  const stateFor = useCallback(
    (variant: LexiconSaveVariant = "entry"): LexiconSaveState => {
      const key = keyFor(variant);
      if (!key || !targets) return "idle";

      const record = records[key];
      if (record) return record.state;

      const existing = findDuplicate(
        items,
        variant === "highlight"
          ? (targets.highlight?.term ?? "")
          : targets.entry.term,
        targets.languages.sourceLanguage,
      );

      return existing ? "duplicate" : "idle";
    },
    [items, keyFor, records, targets],
  );

  const duplicateFor = useCallback(
    (variant: LexiconSaveVariant = "entry"): VocabularyItem | null => {
      const key = keyFor(variant);
      if (!key || !targets) return null;

      const recorded = records[key]?.duplicate;
      if (recorded) return recorded;

      return findDuplicate(
        items,
        variant === "highlight"
          ? (targets.highlight?.term ?? "")
          : targets.entry.term,
        targets.languages.sourceLanguage,
      );
    },
    [items, keyFor, records, targets],
  );

  const save = useCallback(
    async (variant: LexiconSaveVariant = "entry") => {
      if (!targets) return;

      const target = variant === "highlight" ? targets.highlight : targets.entry;
      const key = keyFor(variant);

      if (!target || !key) return;
      if (records[key]?.state === "saving") return;

      /*
       * A word with no meaning attached is worse in the vocabulary than not
       * saved at all: it comes back in review with nothing to review against.
       */
      if (!target.translation.trim()) return;

      setRecords((current) => ({
        ...current,
        [key]: { state: "saving", duplicate: null },
      }));

      try {
        const { user } = await getCurrentUser();

        if (!user) {
          setRecords((current) => ({
            ...current,
            [key]: { state: "error", duplicate: null },
          }));
          return;
        }

        const { languages } = targets;

        const { item } = await createVocabularyEntry({
          userId: user.id,
          term: target.term,
          translation: target.translation,
          partOfSpeech: target.partOfSpeech,
          termExample: target.termExample,
          translationExample: target.translationExample,
          confidence: result?.entry?.confidence ?? "medium",
          category: result?.entry?.category ?? "other",
          status: "new",
          knownItems: items,
          language: {
            pair,
            /*
             * A language the reader picked is a statement; one the model
             * produced is evidence with a number on it. Recording which is
             * which is what lets a card offer to be corrected later instead
             * of carrying a guess that looks like a fact.
             */
            ...(languages.chosen
              ? {
                  stated: {
                    term: languages.sourceLanguage,
                    translation: languages.glossLanguage,
                    source: "explicit-selection" as const,
                  },
                }
              : {
                  ai: {
                    termLanguage: languages.sourceLanguage,
                    translationLanguage: languages.glossLanguage,
                    confidence: languages.confidence,
                  },
                }),
          },
        });

        setRecords((current) => ({
          ...current,
          [key]: { state: "saved", duplicate: null },
        }));

        onSaved?.(item);
        announceWordSaved({ term: target.term, duplicate: false });
      } catch (saveError) {
        if (saveError instanceof DuplicateVocabularyError) {
          setRecords((current) => ({
            ...current,
            [key]: { state: "duplicate", duplicate: saveError.existing },
          }));
          return;
        }

        console.error("Unable to save the looked-up word:", saveError);

        setRecords((current) => ({
          ...current,
          [key]: { state: "error", duplicate: null },
        }));
      }
    },
    [items, keyFor, onSaved, pair, records, result, targets],
  );

  return { save, stateFor, duplicateFor };
}
