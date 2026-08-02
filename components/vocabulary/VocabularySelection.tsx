"use client";

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
  const [selection, setSelection] = useTextSelection(contentRef);
  const [addingWord, setAddingWord] = useState(false);
  const [addedWord, setAddedWord] = useState(false);

  const handleAddSelectionToVocabulary = useCallback(async () => {
    if (!selection || addingWord) return;

    const text = selection.text;
    setAddingWord(true);

    try {
      const data = await classifyText(text);
      const result = await saveClassifiedVocabulary(data, text);

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
  ]);

  const handleSelectionSendToPartner = useCallback(async () => {
    if (!selection || addingWord) return;

    const selectedText = selection.text.trim();
    if (!selectedText) return;

    setAddingWord(true);

    try {
      const data = await classifyText(selectedText);
      const now = new Date().toISOString();

      const selectedVocabulary: VocabularyItem = {
        ...item,
        id: `selection-${crypto.randomUUID()}`,
        word: (data.englishName ?? selectedText).trim(),
        translation: (data.chineseName ?? "").trim(),
        language: "english",
        part_of_speech: data.partOfSpeech?.trim() || null,
        example_sentence: data.englishExample?.trim() || null,
        translated_example: data.chineseExample?.trim() || null,
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
