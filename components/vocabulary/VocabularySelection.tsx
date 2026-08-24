"use client";

import useDisplayLanguages from "@/hooks/useDisplayLanguages";
import {
  type ReactNode,
  useCallback,
  useRef,
  useState,
} from "react";

import SelectionToolbar from "@/components/vocabulary/SelectionToolbar";
import { useVocabulary } from "@/contexts/VocabularyContext";
import useTextSelection from "@/hooks/useTextSelection";
import type { VocabularyItem } from "@/lib/types/app";
import { classifyText } from "@/lib/vocabulary/classify";
import { saveClassifiedVocabulary } from "@/lib/vocabulary/service";

type VocabularySelectionProps = {
  item: VocabularyItem;
  children: ReactNode;
  onSendToPartner: (item: VocabularyItem) => void;
};

export default function VocabularySelection({
  item,
  children,
  onSendToPartner,
}: VocabularySelectionProps) {
  const { addItem } = useVocabulary();
  const contentRef = useRef<HTMLDivElement>(null);
  const { pair: languagePair } = useDisplayLanguages();

  const [selection, setSelection] = useTextSelection(contentRef);
  const [addingWord, setAddingWord] = useState(false);
  const [addedWord, setAddedWord] = useState(false);

  const handleAddSelectionToVocabulary = useCallback(async () => {
    if (!selection || addingWord) return;

    const text = selection.text;
    setAddingWord(true);

    try {
      const data = await classifyText(text);
      const result = await saveClassifiedVocabulary(data, text, languagePair);

      if (result.item) {
        addItem(result.item);
      }

      setAddedWord(true);
      window.getSelection()?.removeAllRanges();

      window.setTimeout(() => {
        setSelection(null);
        setAddedWord(false);
      }, 1100);
    } catch (error) {
      console.error("Failed to add word:", error);
      setSelection(null);
    } finally {
      setAddingWord(false);
    }
  }, [
    addItem,
    addingWord,
    selection,
    setSelection,
    languagePair,
  ]);

  const handleSelectionSendToPartner = useCallback(async () => {
    if (!selection || addingWord) return;

    const selectedText = selection.text.trim();
    if (!selectedText) return;

    setAddingWord(true);

    try {
      const data = await classifyText(selectedText);
      const now = new Date().toISOString();

      /*
       * The languages come off the answer, not off the reader's settings.
       *
       * A card sent to a friend carries its own two languages so they can
       * read it in one of theirs; filling those in from the sender's pair is
       * how a French word arrived labelled English on the other side.
       */
      const wordLanguage = data.termLanguage ?? languagePair[0];
      const translationLanguage =
        data.translationLanguage ??
        (wordLanguage === languagePair[1] ? languagePair[0] : languagePair[1]);

      const selectedVocabulary: VocabularyItem = {
        ...item,
        id: `selection-${crypto.randomUUID()}`,
        word: (data.term || selectedText).trim(),
        translation: data.translation.trim(),
        language: wordLanguage,
        word_language: wordLanguage,
        translation_language: translationLanguage,
        texts: {
          [wordLanguage]: (data.term || selectedText).trim(),
          [translationLanguage]: data.translation.trim(),
        },
        examples: {
          [wordLanguage]: data.termExample,
          [translationLanguage]: data.translationExample,
        },
        part_of_speech: data.partOfSpeech?.trim() || null,
        example_sentence: data.termExample?.trim() || null,
        translated_example: data.translationExample?.trim() || null,
        confidence: data.confidence ?? "medium",
        category: data.category ?? "other",
        status: "new",
        image_url: null,
        created_at: now,
        updated_at: now,
      };

      window.getSelection()?.removeAllRanges();
      setSelection(null);
      onSendToPartner(selectedVocabulary);
    } catch (error) {
      console.error(
        "Failed to prepare selected vocabulary:",
        error,
      );
    } finally {
      setAddingWord(false);
    }
  }, [
    addingWord,
    item,
    onSendToPartner,
    selection,
    setSelection,
    languagePair,
  ]);

  return (
    <div ref={contentRef} className="relative">
      <SelectionToolbar
        selection={selection}
        addingWord={addingWord}
        addedWord={addedWord}
        onAddWord={handleAddSelectionToVocabulary}
        onSendToPartner={handleSelectionSendToPartner}
      />

      {children}
    </div>
  );
}
