"use client";

import { useState } from "react";

import VocabularyList from "@/components/vocabulary/VocabularyList";
import { LearningLanguageProvider } from "@/contexts/LearningLanguageContext";
import { VocabularyProvider } from "@/contexts/VocabularyContext";
import type { VocabularyItem } from "@/lib/types/app";

/**
 * The word cards, without an account.
 *
 * The list lives behind the login, and the things that go wrong with it go
 * wrong under a finger rather than a mouse — a tap that has to be made twice,
 * a swipe that will not open, a phrase that cannot be selected. None of that
 * reproduces on a desktop with a pointer, so it has to be openable on a real
 * device, or a simulator, without signing in.
 *
 * The words are fixtures. Everything else is the real list: the same virtual
 * scroller, the same swipe rows, the same cards.
 */

const WORDS: Array<[string, string, string]> = [
  ["serendipity", "機緣巧合", "A happy accident of serendipity changed everything."],
  ["ephemeral", "短暫的", "The ephemeral bloom lasted a single morning."],
  ["luminous", "發光的", "A luminous sky hung over the harbour."],
  ["cascade", "瀑布", "Water fell in a slow cascade behind the house."],
  ["threshold", "門檻", "She paused at the threshold before going in."],
  ["meridian", "子午線", "The sun crossed the meridian at noon."],
  ["quixotic", "不切實際的", "It was a quixotic plan with no chance of working."],
  ["ineffable", "難以言喻的", "There was an ineffable calm in the room."],
];

function fixtures(count: number): VocabularyItem[] {
  return Array.from({ length: count }, (_, index) => {
    const [word, translation, example] = WORDS[index % WORDS.length];
    const suffix = index >= WORDS.length ? ` ${Math.floor(index / WORDS.length) + 1}` : "";

    return {
      id: `review-${index}`,
      user_id: "review",
      word: `${word}${suffix}`,
      translation: `${translation}${suffix}`,
      language: "en",
      word_language: "en",
      translation_language: "zh-TW",
      texts: { en: `${word}${suffix}`, "zh-TW": `${translation}${suffix}` },
      examples: {},
      category: "other",
      favorite: false,
      part_of_speech: "noun",
      example_sentence: example,
      translated_example: "這是一個例句。",
      image_url: null,
      confidence: "high",
      status: index % 3 === 0 ? "mastered" : index % 3 === 1 ? "learning" : "new",
      created_at: new Date(Date.UTC(2026, 0, 1) + index * 3_600_000).toISOString(),
      updated_at: new Date().toISOString(),
    };
  }) as unknown as VocabularyItem[];
}

const ITEMS = fixtures(60);

export default function VocabularyCardReview() {
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [taps, setTaps] = useState(0);
  const [viewMode, setViewMode] = useState<"compact" | "cards">("compact");

  return (
    <LearningLanguageProvider
      initialLearningLanguage="en"
      initialNativeLanguage="zh-TW"
    >
      <VocabularyProvider>
        <div
          data-app-viewport
          className="relative h-[100dvh] min-h-0 w-full overflow-hidden"
        >
          <div
            data-app-scroll-viewport
            className="h-full min-h-0 w-full overflow-y-auto overflow-x-clip overscroll-y-none"
          >
            <main className="mx-auto w-full max-w-xl px-4 pb-28">
              <div className="flex items-center justify-between gap-3 py-3">
                <p className="text-[0.8125rem] text-ink-soft">
                  {/* Counts every toggle that actually arrived, so "it took two
                      taps" stops being a matter of memory. */}
                  toggles: <span data-testid="tap-count">{taps}</span> · expanded:{" "}
                  {expandedItemId ?? "none"}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    setViewMode((m) => (m === "compact" ? "cards" : "compact"))
                  }
                  className="rounded-full bg-black px-3 py-1.5 text-xs font-semibold text-white"
                >
                  {viewMode}
                </button>
              </div>

              <VocabularyList
                loading={false}
                totalItemCount={ITEMS.length}
                items={ITEMS}
                query=""
                updatingId={null}
                expandedItemId={expandedItemId}
                viewMode={viewMode}
                languageFilter={[]}
                onLookUpQuery={() => {}}
                onChangeStatus={() => {}}
                onDeleteItem={() => {}}
                onOpenDetail={() => {}}
                onToggleExpanded={(item) => {
                  setTaps((n) => n + 1);
                  setExpandedItemId((c) => (c === item.id ? null : item.id));
                }}
                onOpenCollections={() => {}}
                onSendToPartner={() => {}}
                onInteract={() => {}}
              />
            </main>
          </div>
        </div>
      </VocabularyProvider>
    </LearningLanguageProvider>
  );
}
