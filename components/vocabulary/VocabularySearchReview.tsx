"use client";

import { useState } from "react";

import VocabularySearch from "@/components/vocabulary/VocabularySearch";
import { LexiconSearchProvider } from "@/contexts/LexiconSearchContext";
import { InterfaceModeProvider } from "@/contexts/InterfaceModeContext";
import { LearningLanguageProvider } from "@/contexts/LearningLanguageContext";
import { VocabularyProvider } from "@/contexts/VocabularyContext";
import { DEFAULT_SORT_MODE } from "@/components/vocabulary/SortBottomSheet";
import type { InterfaceMode } from "@/lib/appPreferences";

/**
 * The vocabulary search field on its own, signed out.
 *
 * The field lives on a protected screen, so the only way to look at it was to
 * sign in — which is how it shipped with no way to submit what you had typed.
 * Everything below it on the real page is a list of words this harness has
 * none of; the field is the whole subject.
 */
export default function VocabularySearchReview({
  storedMode,
}: {
  storedMode: InterfaceMode;
}) {
  const [query, setQuery] = useState("功能");

  return (
    <InterfaceModeProvider initialMode={storedMode}>
      <LearningLanguageProvider
        initialLearningLanguage="en"
        initialNativeLanguage="zh-TW"
      >
        <VocabularyProvider>
          <LexiconSearchProvider>
            <main className="min-h-dvh bg-surface px-5 py-8">
              <div className="mx-auto w-full max-w-xl">
                <VocabularySearch
                  query={query}
                  quickFilter="all"
                  quickFilters={[
                    { value: "all", label: "All", count: 0 },
                    { value: "new", label: "New", count: 0 },
                    { value: "learning", label: "Learning", count: 0 },
                    { value: "mastered", label: "Mastered", count: 0 },
                  ]}
                  visibleCount={0}
                  sortMode={DEFAULT_SORT_MODE}
                  viewMode="cards"
                  onQueryChange={setQuery}
                  onClear={() => setQuery("")}
                  onQuickFilterChange={() => {}}
                  onOpenSort={() => {}}
                  onOpenCollections={() => {}}
                  onOpenLanguageFilter={() => {}}
                  onToggleView={() => {}}
                  languageFilter={[]}
                  languageCount={2}
                />
              </div>
            </main>
          </LexiconSearchProvider>
        </VocabularyProvider>
      </LearningLanguageProvider>
    </InterfaceModeProvider>
  );
}
