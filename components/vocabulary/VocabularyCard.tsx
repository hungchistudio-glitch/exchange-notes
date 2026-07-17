"use client";

import {
  ArrowUpRight,
  Check,
  MoreHorizontal,
  Send,
  Volume2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import AppBadge from "@/components/ui/AppBadge";
import CollectionPickerSheet from "@/components/collections/CollectionPickerSheet";
import AppButton from "@/components/ui/AppButton";
import PronunciationBlock from "@/components/pronunciation/PronunciationBlock";
import SelectionToolbar from "@/components/vocabulary/SelectionToolbar";
import VocabularyDetailSheet from "@/components/vocabulary/VocabularyDetailSheet";
import useTextSelection from "@/hooks/useTextSelection";
import { createClient } from "@/lib/supabase/client";
import { speak } from "@/lib/speech";
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
    setDetailOpen(true);
  }

  const isChinesePrimary = learningLanguage === "traditional-chinese";
  const primaryWord = isChinesePrimary ? item.translation : item.word;
  const secondaryWord = isChinesePrimary ? item.word : item.translation;
  const example = item.example_sentence?.trim() || "";

  return (
    <div ref={contentRef} className="relative">
      <SelectionToolbar
        selection={selection}
        addingWord={addingWord}
        addedWord={addedWord}
        onAddWord={() => void handleAddSelectionToVocabulary()}
        onSendToPartner={handleSelectionSendToPartner}
      />

      <article className="overflow-hidden rounded-[28px] border border-black/[0.07] bg-white shadow-[0_10px_36px_rgba(16,16,15,0.045)] transition-all duration-200 hover:-translate-y-0.5 hover:border-black/[0.11] hover:shadow-[0_18px_50px_rgba(16,16,15,0.08)]">
        <button
          type="button"
          onClick={openDetails}
          className="group block w-full text-left transition active:scale-[0.995]"
          aria-label={`Open ${item.word} details`}
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
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <AppBadge tone={statusTone(item.status)}>
                    {STATUS_LABELS[item.status]}
                  </AppBadge>
                  {item.part_of_speech && (
                    <AppBadge>{item.part_of_speech}</AppBadge>
                  )}
                </div>

                <h2 className="mt-5 break-words text-[34px] font-bold leading-[1.05] tracking-[-0.055em] text-neutral-950">
                  {primaryWord}
                </h2>
                <p className="mt-2 text-[18px] font-medium leading-7 text-neutral-500">
                  {secondaryWord}
                </p>

                <PronunciationBlock
                  english={item.word}
                  chinese={item.translation}
                  showEnglish
                  className="mt-5"
                />
              </div>

              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 transition-colors group-hover:bg-neutral-200">
                <ArrowUpRight size={17} />
              </span>
            </div>

            {example && (
              <div className="mt-6 rounded-2xl border border-neutral-200 bg-neutral-50 px-5 py-4">
                <p className="line-clamp-3 text-[15px] leading-7 text-neutral-600">
                  {example}
                </p>
              </div>
            )}
          </div>
        </button>

        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 border-t border-black/[0.055] bg-black/[0.012] p-3">
          <AppButton
            variant={item.status === "mastered" ? "secondary" : "primary"}
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
            onClick={() =>
              speak(
                isChinesePrimary ? item.translation : item.word,
                isChinesePrimary ? "zh-TW" : "en-US",
              )
            }
            aria-label="Play pronunciation"
          >
            <Volume2 size={16} />
          </AppButton>

          <AppButton
            variant="ghost"
            size="icon"
            onClick={() => onSendToPartner()}
            aria-label="Send to partner"
          >
            <Send size={16} />
          </AppButton>

          <AppButton
            variant="ghost"
            size="icon"
            onClick={openDetails}
            aria-label="More actions"
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
