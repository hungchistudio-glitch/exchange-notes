"use client";

import type { ComponentProps } from "react";

import DailyFocusCard from "@/components/dashboard/DailyFocusCard";
import TodayWordCard from "@/components/pronunciation/TodayWordCard";
import VocabularyList from "@/components/vocabulary/VocabularyList";
import VocabularySearchSection from "@/components/vocabulary/sections/VocabularySearchSection";
import { useVocabulary } from "@/contexts/VocabularyContext";
import useVocabularyStats from "@/hooks/useVocabularyStats";

type VocabularyMainContentProps = {
  error: string;
  searchProps: ComponentProps<typeof VocabularySearchSection>;
  listProps: ComponentProps<typeof VocabularyList>;
};

export default function VocabularyMainContent({
  error,
  searchProps,
  listProps,
}: VocabularyMainContentProps) {
  /* The app-wide library, the same one the home screen reads: a word saved
     from the search sheet has to change these counts without a reload. */
  const { items, loading: itemsLoading } = useVocabulary();
  const { reviewStats } = useVocabularyStats(items);

  return (
    // AppPage itself has no horizontal padding by design (each page manages
    // its own insets), and neither VocabularySearchSection nor
    // VocabularyList add any — so this is the one place that gives the
    // search bar, filter chips, and word list some breathing room from the
    // screen edge. 21px matches YumiCompanion's own section padding above,
    // so the page reads as one consistent column, not two different insets.
    <div className="px-[21px]">
      {/*
        Today's focus and today's word, which used to open the home screen.

        The home is only Yumi now, and these two went with the other eight
        modules — which left them rendered by nobody: both were zero-import
        files sitting in the tree. They belong here rather than nowhere. This
        is the screen about the words you have, they are about the words you
        have today, and a reader who came to look at their vocabulary is the
        reader they were written for.

        Above the search field on purpose: what is due is the thing to act on
        first, and searching is what you do when it is not.
      */}
      <DailyFocusCard
        due={itemsLoading ? 0 : reviewStats.due}
        retention={reviewStats.retention}
        accuracy={reviewStats.accuracy}
        loading={itemsLoading}
      />

      <div className="mt-5">
        <TodayWordCard />
      </div>

      <div className="mt-5">
        <VocabularySearchSection {...searchProps} />
      </div>

      {error && !listProps.loading && (
        <p
          role="alert"
          className="mt-5 rounded-[20px] bg-red-50 p-4 text-sm font-bold text-red-700"
        >
          {error}
        </p>
      )}

      <VocabularyList {...listProps} />
    </div>
  );
}
