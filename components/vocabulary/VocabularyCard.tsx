"use client";

import { Send, Share, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import WordCard from "@/components/learning/WordCard";
import SelectionToolbar from "@/components/vocabulary/SelectionToolbar";
import useTextSelection from "@/hooks/useTextSelection";
import { createClient } from "@/lib/supabase/client";
import {
  getVocabularyKey,
  type InteractionType,
} from "@/lib/vocabulary/helpers";
import type {
  AppLanguage,
  VocabularyCategory,
  VocabularyItem,
  VocabularyStatus,
} from "@/lib/types/app";

const STATUS_LABELS: Record<VocabularyStatus, string> = {
  new: "New",
  learning: "Learning",
  mastered: "Mastered",
};

export default function VocabularyCard({
  item,
  learningLanguage,
  updating,
  onChangeStatus,
  onSendToPartner,
  onDelete,
  onInteract,
  onItemAdded,
}: {
  item: VocabularyItem;
  learningLanguage: AppLanguage | null;
  updating: boolean;
  onChangeStatus: (status: VocabularyStatus) => void;
  onSendToPartner: (sharedItem?: VocabularyItem) => void;
  onDelete: () => void;
  onInteract: (type: InteractionType) => void;
  onItemAdded: (item: VocabularyItem) => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useTextSelection(contentRef);
  const [addingWord, setAddingWord] = useState(false);
  const [addedWord, setAddedWord] = useState(false);

  useEffect(() => {
    onInteract("view");
    // Count one view when the card is mounted in the current ordering.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  async function handleAddSelectionToVocabulary() {
    if (!selection || addingWord) return;
    const text = selection.text;
    setAddingWord(true);

    try {
      const response = await fetch("/api/classify-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const data = await response.json();

      if (!response.ok || "error" in data) {
        throw new Error(
          "error" in data ? data.error : "Couldn't look up that word.",
        );
      }

      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Please log in before saving a word.");
      }

      const word = (data.englishName ?? text).trim();
      const translation = (data.chineseName ?? "").trim();
      const candidateKey = getVocabularyKey(word, translation);

      const { data: existingItems, error: duplicateCheckError } = await supabase
        .from("vocabulary_items")
        .select("id, word, translation")
        .eq("user_id", user.id);

      if (duplicateCheckError) throw duplicateCheckError;

      const duplicate = (existingItems ?? []).some(
        (existingItem) =>
          getVocabularyKey(existingItem.word, existingItem.translation) ===
          candidateKey,
      );

      if (!duplicate) {
        const { data: inserted, error: insertError } = await supabase
          .from("vocabulary_items")
          .insert({
            user_id: user.id,
            word,
            translation,
            language: "english",
            part_of_speech: data.partOfSpeech?.trim() || null,
            example_sentence: data.englishExample?.trim() || null,
            translated_example: data.chineseExample?.trim() || null,
            confidence: data.confidence ?? "medium",
            category: (data.category ?? "other") as VocabularyCategory,
            status: "new",
          })
          .select()
          .single();

        if (insertError) throw insertError;
        onItemAdded(inserted as VocabularyItem);
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
      const response = await fetch("/api/classify-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: selectedText }),
      });

      const data = await response.json();

      if (!response.ok || "error" in data) {
        throw new Error(
          "error" in data
            ? data.error
            : "Couldn't create a word card from that selection.",
        );
      }

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
    onInteract("share");
    const shareData = {
      title: item.word,
      text: `${item.word} — ${item.translation}`,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled or share failed — no action needed.
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(shareData.text);
    } catch {
      // Clipboard can fail without permission; safe to ignore.
    }
  }

  const englishExample = item.example_sentence?.trim() || "";

  const chineseExample = item.translated_example?.trim() || "";

  return (
    <div ref={contentRef} className="relative">
      <SelectionToolbar
        selection={selection}
        addingWord={addingWord}
        addedWord={addedWord}
        onAddWord={() => void handleAddSelectionToVocabulary()}
        onSendToPartner={handleSelectionSendToPartner}
      />

      <WordCard
        english={item.word}
        chinese={item.translation}
        englishExample={englishExample}
        chineseExample={chineseExample}
        partOfSpeech={item.part_of_speech}
        imageUrl={item.image_url}
        learningLanguage={learningLanguage ?? "english"}
        headerLabel="Vocabulary"
        statusLabel={STATUS_LABELS[item.status]}
        actions={
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onSendToPartner()}
                aria-label="Send to Partner"
                title="Send to Partner"
                className="flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-full bg-black px-4 text-[12px] font-semibold text-white transition-transform active:scale-[0.99]"
              >
                <Send size={15} strokeWidth={1.8} />
                Send
              </button>

              <button
                type="button"
                onClick={() => void handleShare()}
                aria-label="Share"
                title="Share"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f1eee7] text-black/65 transition-transform active:scale-95"
              >
                <Share size={16} strokeWidth={1.8} />
              </button>

              <button
                type="button"
                onClick={onDelete}
                aria-label="Delete vocabulary item"
                title="Delete vocabulary item"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f1eee7] text-red-500 transition-transform active:scale-95"
              >
                <Trash2 size={16} strokeWidth={1.8} />
              </button>
            </div>

            <div className="rounded-[20px] bg-[#f5f2eb] p-1.5">
              <div className="grid grid-cols-3 gap-1.5">
                {(["new", "learning", "mastered"] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    disabled={updating}
                    onClick={() => onChangeStatus(status)}
                    className={`min-h-[42px] whitespace-nowrap rounded-[15px] px-2 text-[11px] font-semibold transition-all disabled:opacity-40 ${
                      item.status === status
                        ? "bg-black text-white shadow-sm"
                        : "text-black/45 hover:bg-white/60 hover:text-black"
                    }`}
                  >
                    {STATUS_LABELS[status]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        }
      />
    </div>
  );
}
