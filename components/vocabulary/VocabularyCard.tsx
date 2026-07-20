"use client";

import { memo, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import SelectionToolbar from "@/components/vocabulary/SelectionToolbar";
import VocabularyCardHeader from "@/components/vocabulary/card/VocabularyCardHeader";
import VocabularyCardActions from "@/components/vocabulary/card/VocabularyCardActions";
import VocabularyExampleBlock from "@/components/vocabulary/ui/VocabularyExampleBlock";
import useTextSelection from "@/hooks/useTextSelection";
import { classifyText } from "@/lib/vocabulary/classify";
import { saveClassifiedVocabulary } from "@/lib/vocabulary/service";
import { useVocabulary } from "@/contexts/VocabularyContext";

import type { InteractionType } from "@/lib/vocabulary/helpers";
import type {
  AppLanguage,
  VocabularyItem,
  VocabularyStatus,
} from "@/lib/types/app";

function VocabularyCard({
  item,
  updating,
  onChangeStatus,
  onSendToPartner,
  onDelete,
  onInteract,
}: {
  item: VocabularyItem;
  learningLanguage: AppLanguage | null;
  updating: boolean;
  onChangeStatus: (
    item: VocabularyItem,
    status: VocabularyStatus,
  ) => void | Promise<void>;
  onSendToPartner: (item: VocabularyItem) => void;
  onDelete: (item: VocabularyItem) => void | Promise<void>;
  onInteract: (
    item: VocabularyItem,
    type: InteractionType,
  ) => void;
}) {
  const router = useRouter();
  const { addItem } = useVocabulary();
  const contentRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useTextSelection(contentRef);
  const [addingWord, setAddingWord] = useState(false);
  const [addedWord, setAddedWord] = useState(false);

  useEffect(() => {
    onInteract(item, "view");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  async function handleAddSelectionToVocabulary() {
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
      setTimeout(() => {
        setSelection(null);
        setAddedWord(false);
      }, 1100);
    } catch (addError) {
      console.error("Failed to add word:", addError);
      setSelection(null);
    } finally {
      setAddingWord(false);
    }
  }

  async function handleSelectionSendToPartner() {
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
    } catch (selectionError) {
      console.error("Failed to prepare selected vocabulary:", selectionError);
    } finally {
      setAddingWord(false);
    }
  }

  async function handleShare() {
    onInteract(item, "share");
    const shareData = {
      title: item.word,
      text: `${item.word} — ${item.translation}`,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        return;
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(shareData.text);
    } catch {
      // Clipboard permission can fail without affecting the app.
    }
  }

  function openDetails() {
    onInteract(item, "view");
    router.push(`/vocabulary/${item.id}`);
  }

  return (
    <div ref={contentRef} className="relative">
      <SelectionToolbar
        selection={selection}
        addingWord={addingWord}
        addedWord={addedWord}
        onAddWord={() => void handleAddSelectionToVocabulary()}
        onSendToPartner={handleSelectionSendToPartner}
      />

      <article className="overflow-hidden rounded-[28px] border border-black/[0.07] bg-white shadow-[0_12px_42px_rgba(15,23,42,.05)] transition-all duration-200 hover:-translate-y-0.5 hover:border-black/[0.11] hover:shadow-[0_22px_60px_rgba(15,23,42,.09)]">
        <div
          onClick={openDetails}
          className="group block w-full cursor-pointer text-left transition active:scale-[0.995]"
        >
          {item.image_url && (
            <div
              className="aspect-[16/8] w-full bg-cover bg-center"
              style={{ backgroundImage: `url(${item.image_url})` }}
              role="img"
              aria-label={item.word}
            />
          )}

          <div className="px-6 py-6">
            <VocabularyCardHeader item={item} />

            <VocabularyExampleBlock
              english={item.example_sentence}
              chinese={item.translated_example}
              className="mt-7"
            />
          </div>
        </div>

        <VocabularyCardActions
          mastered={item.status === "mastered"}
          updating={updating}
          onToggleMastered={() =>
            void onChangeStatus(
              item,
              item.status === "mastered" ? "learning" : "mastered",
            )
          }
          onSend={() => onSendToPartner(item)}
          onOpen={openDetails}
        />
      </article>

    </div>
  );
}

export default memo(VocabularyCard);
