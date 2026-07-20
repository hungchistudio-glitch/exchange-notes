"use client";

import type { ComponentProps } from "react";
import {
  BookmarkPlus,
  BookOpen,
  Camera,
  LoaderCircle,
  SearchX,
} from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/foundation";
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
>[1];

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
}: VocabularyListProps) {
  const trimmedQuery = query.trim();

  if (loading) {
    return (
      <section
        aria-label="Loading vocabulary"
        aria-live="polite"
        className="mt-8 flex min-h-40 items-center justify-center rounded-[28px] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.035)]"
      >
        <div className="flex flex-col items-center gap-3 text-black/40">
          <LoaderCircle
            className="animate-spin"
            size={24}
            strokeWidth={1.8}
          />
          <span className="text-[12px] font-medium">
            Loading your words
          </span>
        </div>
      </section>
    );
  }

  if (totalItemCount === 0) {
    return (
      <EmptyState
        className="mt-8 rounded-[28px] py-9 shadow-[0_4px_20px_rgba(0,0,0,0.035)]"
        icon={<Camera size={23} strokeWidth={1.7} />}
        title="Your first word begins outside"
        description="Photograph something from daily life and save its English and Traditional Chinese meaning."
        action={
          <Link
            href="/capture"
            className="mx-auto flex h-12 max-w-sm items-center justify-center rounded-full bg-black px-5 text-[13px] font-semibold text-white transition active:scale-[0.99]"
          >
            Discover a word
          </Link>
        }
      />
    );
  }

  if (items.length === 0) {
    if (lookupStatus === "result" && lookupResult) {
      return (
        <section className="mt-8 rounded-[28px] bg-white p-6 text-center shadow-[0_4px_20px_rgba(0,0,0,0.035)]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#f4f1ea] text-black/60">
            <BookmarkPlus size={22} strokeWidth={1.7} />
          </div>

          <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-black/35">
            Word found
          </p>

          <h2 className="mt-2 break-words text-[27px] font-semibold tracking-[-0.04em] text-black">
            {lookupResult.englishName}
          </h2>

          <p className="mt-1 break-words text-xl text-black/60">
            {lookupResult.chineseName}
          </p>

          <p className="mt-2 text-[11px] font-medium capitalize tracking-[0.06em] text-black/35">
            {lookupResult.partOfSpeech}
          </p>

          <div className="mt-5 rounded-[20px] bg-[#f5f2eb] p-4 text-left">
            <p className="text-[14px] leading-6 text-black/80">
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
            className="mt-5 flex h-12 w-full items-center justify-center rounded-full bg-black px-5 text-[13px] font-semibold text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-35"
          >
            {savingLookup ? (
              <>
                <LoaderCircle
                  size={15}
                  className="mr-2 animate-spin"
                />
                Saving
              </>
            ) : (
              "Add to vocabulary"
            )}
          </button>
        </section>
      );
    }

    return (
      <div className="mt-8">
        <EmptyState
          className="rounded-[28px] py-9 shadow-[0_4px_20px_rgba(0,0,0,0.035)]"
          icon={
            trimmedQuery ? (
              <SearchX size={22} strokeWidth={1.7} />
            ) : (
              <BookOpen size={22} strokeWidth={1.7} />
            )
          }
          title={
            trimmedQuery
              ? "This word is not saved yet"
              : "No matching words"
          }
          description={
            trimmedQuery
              ? "Look it up to find its meaning, examples, and save it to your vocabulary."
              : "Try another search or choose a different learning status."
          }
          action={
            trimmedQuery ? (
              <button
                type="button"
                onClick={onLookupWord}
                disabled={lookupStatus === "loading"}
                className="mx-auto flex h-12 w-full max-w-sm items-center justify-center rounded-full bg-black px-5 text-[13px] font-semibold text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-35"
              >
                {lookupStatus === "loading" ? (
                  <>
                    <LoaderCircle
                      size={15}
                      className="mr-2 animate-spin"
                    />
                    Looking up
                  </>
                ) : (
                  `Look up "${trimmedQuery}"`
                )}
              </button>
            ) : undefined
          }
        />

        {lookupStatus === "error" && (
          <p
            role="alert"
            className="mt-3 rounded-[16px] bg-red-50 px-4 py-3 text-center text-[13px] font-semibold text-red-700"
          >
            {lookupError}
          </p>
        )}
      </div>
    );
  }

  return (
    <section
      aria-label="Saved vocabulary"
      className="mt-6 space-y-4"
    >
      {items.map((item) => (
        <VocabularyCard
          key={item.id}
          item={item}
          learningLanguage={learningLanguage}
          updating={updatingId === item.id}
          onChangeStatus={onChangeStatus}
          onSendToPartner={onSendToPartner}
          onDelete={onDelete}
          onInteract={onInteract}
        />
      ))}
    </section>
  );
}
