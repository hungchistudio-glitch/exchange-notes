"use client";

import type { ComponentProps } from "react";
import { BookmarkPlus, BookOpen, Camera, LoaderCircle } from "lucide-react";
import Link from "next/link";

import VocabularyCard from "@/components/vocabulary/VocabularyCard";
import type {
  AppLanguage,
  VocabularyCategory,
  VocabularyItem,
  VocabularyStatus,
} from "@/lib/types/app";

type LookupStatus = "idle" | "loading" | "error" | "result";

type LookupResult = {
  englishName: string;
  chineseName: string;
  partOfSpeech: string;
  englishExample: string;
  chineseExample: string;
  confidence: "high" | "medium" | "low";
  category: VocabularyCategory;
};

type CardInteraction = Parameters<
  NonNullable<ComponentProps<typeof VocabularyCard>["onInteract"]>
>[0];

type VocabularyListProps = {
  loading: boolean;
  totalItemCount: number;
  items: VocabularyItem[];
  query: string;
  learningLanguage: AppLanguage | null;
  updatingId: string | null;
  lookupStatus: LookupStatus;
  lookupResult: LookupResult | null;
  lookupError: string;
  savingLookup: boolean;
  onLookupWord: () => void;
  onSaveLookupResult: () => void;
  onChangeStatus: (
    item: VocabularyItem,
    status: VocabularyStatus,
  ) => void | Promise<void>;
  onSendToPartner: (item: VocabularyItem) => void;
  onDelete: (item: VocabularyItem) => void | Promise<void>;
  onInteract: (item: VocabularyItem, type: CardInteraction) => void;
  onItemAdded: (item: VocabularyItem) => void;
};

export default function VocabularyList({
  loading,
  totalItemCount,
  items,
  query,
  learningLanguage,
  updatingId,
  lookupStatus,
  lookupResult,
  lookupError,
  savingLookup,
  onLookupWord,
  onSaveLookupResult,
  onChangeStatus,
  onSendToPartner,
  onDelete,
  onInteract,
  onItemAdded,
}: VocabularyListProps) {
  if (loading) {
    return (
      <section
        aria-label="Loading vocabulary"
        className="mt-8 flex items-center justify-center rounded-[30px] bg-white p-10"
      >
        <LoaderCircle className="animate-spin" size={28} />
      </section>
    );
  }

  if (totalItemCount === 0) {
    return (
      <section className="mt-8 rounded-[30px] bg-white p-7 text-center shadow-[0_3px_16px_rgba(0,0,0,0.035)]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f4f1ea]">
          <Camera size={24} strokeWidth={1.7} />
        </div>
        <h2 className="mt-5 text-2xl font-semibold tracking-[-0.035em]">
          Your first word begins outside
        </h2>
        <p className="mx-auto mt-3 max-w-sm text-[14px] leading-6 text-black/50">
          Photograph something from daily life and save its English and
          Traditional Chinese meaning.
        </p>
        <Link
          href="/capture"
          className="mt-6 flex h-12 items-center justify-center rounded-full bg-black px-5 text-[13px] font-semibold text-white transition-transform active:scale-[0.99]"
        >
          Discover a Word
        </Link>
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section className="mt-8 rounded-[30px] bg-white p-7 text-center shadow-[0_3px_16px_rgba(0,0,0,0.035)]">
        {lookupStatus === "result" && lookupResult ? (
          <>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f4f1ea]">
              <BookmarkPlus size={23} strokeWidth={1.7} />
            </div>
            <h2 className="mt-5 break-words text-2xl font-semibold tracking-[-0.035em]">
              {lookupResult.englishName}
            </h2>
            <p className="mt-1 break-words text-xl text-black/65">
              {lookupResult.chineseName}
            </p>
            <p className="mt-2 text-[11px] capitalize tracking-[0.06em] text-black/35">
              {lookupResult.partOfSpeech}
            </p>
            <div className="mt-5 rounded-[20px] bg-[#f5f2eb] p-4 text-left">
              <p className="text-[14px] leading-6">
                {lookupResult.englishExample}
              </p>
              <p className="mt-2 text-[14px] leading-6 text-black/50">
                {lookupResult.chineseExample}
              </p>
            </div>
            <button
              type="button"
              onClick={onSaveLookupResult}
              disabled={savingLookup}
              className="mt-5 flex h-12 w-full items-center justify-center rounded-full bg-black px-5 text-[13px] font-semibold text-white transition-transform active:scale-[0.99] disabled:opacity-35"
            >
              {savingLookup ? (
                <>
                  <LoaderCircle size={15} className="mr-2 animate-spin" />
                  Saving
                </>
              ) : (
                "Add to Vocabulary"
              )}
            </button>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f4f1ea]">
              <BookOpen size={23} strokeWidth={1.7} />
            </div>
            <h2 className="mt-5 text-xl font-semibold tracking-[-0.025em]">
              No matching words
            </h2>
            <p className="mt-2 text-[14px] leading-6 text-black/50">
              {query.trim()
                ? "This word is not saved yet. Look it up and add it."
                : "Try another search or learning status."}
            </p>
            {query.trim() && (
              <button
                type="button"
                onClick={onLookupWord}
                disabled={lookupStatus === "loading"}
                className="mt-5 flex h-12 w-full items-center justify-center rounded-full bg-black px-5 text-[13px] font-semibold text-white transition-transform active:scale-[0.99] disabled:opacity-35"
              >
                {lookupStatus === "loading" ? (
                  <>
                    <LoaderCircle size={15} className="mr-2 animate-spin" />
                    Looking up
                  </>
                ) : (
                  `Look up "${query.trim()}"`
                )}
              </button>
            )}
            {lookupStatus === "error" && (
              <p className="mt-3 rounded-[16px] bg-red-50 p-3 text-[13px] font-semibold text-red-700">
                {lookupError}
              </p>
            )}
          </>
        )}
      </section>
    );
  }

  return (
    <section aria-label="Saved vocabulary" className="mt-6 space-y-4">
      {items.map((item) => (
        <VocabularyCard
          key={item.id}
          item={item}
          learningLanguage={learningLanguage}
          updating={updatingId === item.id}
          onChangeStatus={(status) => {
            void onChangeStatus(item, status);
          }}
          onSendToPartner={(sharedItem) => {
            onSendToPartner(sharedItem ?? item);
          }}
          onDelete={() => {
            void onDelete(item);
          }}
          onInteract={(type) => onInteract(item, type)}
          onItemAdded={onItemAdded}
        />
      ))}
    </section>
  );
}
