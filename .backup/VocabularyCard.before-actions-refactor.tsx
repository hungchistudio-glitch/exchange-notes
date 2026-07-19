"use client";

import {
  ArrowUpRight,
  Check,
  MoreHorizontal,
  Send,} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import AppBadge from "@/components/ui/AppBadge";
import CollectionPickerSheet from "@/components/collections/CollectionPickerSheet";
import AppButton from "@/components/ui/AppButton";
import PronunciationBlock from "@/components/pronunciation/PronunciationBlock";
import SelectionToolbar from "@/components/vocabulary/SelectionToolbar";
import VocabularyDetailSheet from "@/components/vocabulary/VocabularyDetailSheet";
import VocabularyCardHeader from "@/components/vocabulary/card/VocabularyCardHeader";
import VocabularyCardActions from "@/components/vocabulary/card/VocabularyCardActions";
import VocabularyExampleBlock from "@/components/vocabulary/ui/VocabularyExampleBlock";
import VocabularySpeechButton from "@/components/vocabulary/ui/VocabularySpeechButton";
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
  new: "＋ New",
  learning: "● Learning",
  mastered: "✓ Mastered",
};

function statusTone(status: VocabularyStatus) {
  if (status === "mastered") return "success" as const;
  if (status === "learning") return "warning" as const;
  return "neutral" as const;
}

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
  const router = useRouter();
  const contentRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useTextSelection(contentRef);
  const [addingWord, setAddingWord] = useState(false);
  const [addedWord, setAddedWord] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [collectionsOpen, setCollectionsOpen] = useState(false);

  useEffect(() => {
    onInteract("view");
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

      if (!user) throw new Error("Please log in before saving a word.");

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
    onInteract("view");
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

            {(item.example_sentence?.trim() || item.translated_example?.trim()) && (
              <div className="mt-6 overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-50">
                {item.example_sentence?.trim() && (
                  <div className="flex items-start justify-between gap-4 px-5 py-4">
                    <p className="line-clamp-3 min-w-0 flex-1 text-[15px] font-medium leading-7 text-neutral-700">
                      {item.example_sentence}
                    </p>

                    <VocabularySpeechButton
                      text={item.example_sentence!}
                      language="en-US"
                      label="Play English example"
                      size="sm"
                    />
                  </div>
                )}

                {item.translated_example?.trim() && (
                  <div className="flex items-start justify-between gap-4 border-t border-black/[0.06] px-5 py-4">
                    <p className="line-clamp-3 min-w-0 flex-1 text-[15px] leading-7 text-neutral-500">
                      {item.translated_example}
                    </p>

                    <VocabularySpeechButton
                      text={item.translated_example}
                      language="zh-TW"
                      label="播放中文例句"
                      size="sm"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-[1fr_auto_auto] gap-2 border-t border-neutral-200/70 bg-white px-4 py-3">
          <AppButton
            variant={item.status === "mastered" ? "secondary" : "primary"}
            className="rounded-xl shadow-sm"
            size="md"
            disabled={updating}
            onClick={() =>
              onChangeStatus(
                item.status === "mastered" ? "learning" : "mastered",
              )
            }
          >
            <Check size={15} />
            {item.status === "mastered" ? "Learning" : "Mastered"}
          </AppButton>

          <AppButton
            variant="ghost"
            size="icon"
            className="rounded-xl transition-colors hover:bg-neutral-200"
            onClick={() => onSendToPartner()}
            aria-label="Send to partner"
          >
            <Send size={16} />
          </AppButton>

          <AppButton
            variant="ghost"
            size="icon"
            className="rounded-xl transition-colors hover:bg-neutral-200"
            onClick={openDetails}
            aria-label="Open word details"
          >
            <MoreHorizontal size={17} />
          </AppButton>
        </div>
      </article>

      <VocabularyDetailSheet
        item={item}
        open={detailOpen}
        updating={updating}
        onClose={() => setDetailOpen(false)}
        onChangeStatus={onChangeStatus}
        onSendToPartner={() => onSendToPartner()}
        onShare={() => void handleShare()}
        onDelete={onDelete}
        onOpenCollections={() => {
          setDetailOpen(false);
          setCollectionsOpen(true);
        }}
      />

      <CollectionPickerSheet
        item={item}
        open={collectionsOpen}
        onClose={() => setCollectionsOpen(false)}
      />
    </div>
  );
}
