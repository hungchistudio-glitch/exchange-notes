"use client";

import { memo, type ComponentProps } from "react";
import {
  BookmarkPlus,
  BookOpen,
  Camera,
  FolderPlus,
  LoaderCircle,
  SearchX,
  Trash2,
} from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/foundation-legacy";
import SwipeActionRow from "@/components/foundation/interaction/SwipeActionRow";
import VocabularyCard from "@/components/vocabulary/VocabularyCard";
import type {
  VocabularyLookupResult,
  VocabularyLookupStatus,
} from "@/lib/types/vocabularyLookup";
import useTranslation from "@/hooks/i18n/useTranslation";
import type {
  VocabularyItem,
  VocabularyStatus,
} from "@/lib/types/app";



type CardInteraction = Parameters<
  NonNullable<ComponentProps<typeof VocabularyCard>["onInteract"]>
>[1];

type VocabularyListProps = {
  loading: boolean;
  totalItemCount: number;
  items: VocabularyItem[];
  query: string;
  updatingId: string | null;
  lookupStatus: VocabularyLookupStatus;
  lookupResult: VocabularyLookupResult | null;
  lookupError: string;
  savingLookup: boolean;
  onLookupWord: () => void;
  onSaveLookupResult: () => void;
  onChangeStatus: (
    item: VocabularyItem,
    status: VocabularyStatus,
  ) => void | Promise<void>;
  onDeleteItem: (item: VocabularyItem) => void | Promise<void>;
  onOpenDetail: (item: VocabularyItem) => void;
  onOpenCollections: (item: VocabularyItem) => void;
  onSendToPartner: (item: VocabularyItem) => void;
  onInteract: (item: VocabularyItem, type: CardInteraction) => void;
};

function VocabularyList({
  loading,
  totalItemCount,
  items,
  query,
  updatingId,
  lookupStatus,
  lookupResult,
  lookupError,
  savingLookup,
  onLookupWord,
  onSaveLookupResult,
  onChangeStatus,
  onDeleteItem,
  onOpenDetail,
  onOpenCollections,
  onSendToPartner,
  onInteract,
}: VocabularyListProps) {
  const trimmedQuery = query.trim();
  const { t } = useTranslation();
  const lookup = t.vocabulary.lookup;

  if (loading) {
    return (
      <section
        aria-label="Loading vocabulary"
        aria-live="polite"
        className="mt-6 flex min-h-40 items-center justify-center rounded-[24px] bg-white shadow-[0_8px_22px_rgba(0,0,0,0.04)]"
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
        className="mt-6 rounded-[24px] py-8 shadow-[0_8px_22px_rgba(0,0,0,0.04)]"
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
        <section className="mt-6 rounded-[24px] bg-white p-5 text-center shadow-[0_8px_22px_rgba(0,0,0,0.04)]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface text-black/60">
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

          <div className="mt-5 rounded-[20px] bg-surface p-4 text-left">
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
              lookup.addToVocabulary
            )}
          </button>
        </section>
      );
    }

    return (
      <div className="mt-6">
        <EmptyState
          className="rounded-[24px] py-8 shadow-[0_8px_22px_rgba(0,0,0,0.04)]"
          icon={
            trimmedQuery ? (
              <SearchX size={22} strokeWidth={1.7} />
            ) : (
              <BookOpen size={22} strokeWidth={1.7} />
            )
          }
          title={
            trimmedQuery
              ? lookup.unsavedTitle
              : lookup.noMatchingTitle
          }
          description={
            trimmedQuery
              ? lookup.unsavedDescription
              : lookup.noMatchingDescription
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
                  lookup.lookUpWord.replace("{word}", trimmedQuery)
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
      className="mt-5 space-y-3"
    >
      {items.map((item) => (
        <SwipeActionRow
          key={item.id}
          disabled={updatingId === item.id}
          trailingAction={{
            label: "刪除",
            icon: <Trash2 size={22} strokeWidth={1.8} />,
            onAction: () => onDeleteItem(item),
          }}
          leadingAction={{
            label: "收藏集",
            icon: <FolderPlus size={22} strokeWidth={1.8} />,
            onAction: () => onOpenCollections(item),
          }}
        >
          <VocabularyCard
            item={item}
            updating={updatingId === item.id}
            onChangeStatus={onChangeStatus}
            onSendToPartner={onSendToPartner}
            onOpenDetail={onOpenDetail}
            onInteract={onInteract}
          />
        </SwipeActionRow>
      ))}
    </section>
  );
}

export default memo(VocabularyList);
