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
  Volume2,
  Send,
} from "lucide-react";
import Link from "next/link";

import OrbitIconButton from "@/components/foundation/buttons/OrbitIconButton";
import { EmptyState } from "@/components/foundation-legacy";
import PronunciationBlock from "@/components/pronunciation/PronunciationBlock";
import { getLanguage, type LanguageCode } from "@/lib/languages";
import { speak } from "@/lib/speech";
import { insertValues } from "@/lib/utils";
import SwipeActionRow from "@/components/foundation/interaction/SwipeActionRow";
import VocabularyCard from "@/components/vocabulary/VocabularyCard";
import type {
  VocabularyLookupResult,
  VocabularyLookupStatus,
} from "@/lib/types/vocabularyLookup";
import useTranslation from "@/hooks/i18n/useTranslation";
import useDisplayLanguages from "@/hooks/useDisplayLanguages";
import type {
  VocabularyItem,
  VocabularyStatus,
} from "@/lib/types/app";
import { normalizePartOfSpeech } from "@/lib/vocabulary/partOfSpeech";
import type { VocabularyViewMode } from "@/lib/vocabulary/viewMode";



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
  expandedItemId: string | null;
  viewMode: VocabularyViewMode;
  onLookupWord: () => void;
  onSaveLookupResult: () => void;
  onShareLookupResult: () => void;
  onChangeStatus: (
    item: VocabularyItem,
    status: VocabularyStatus,
  ) => void | Promise<void>;
  onDeleteItem: (item: VocabularyItem) => void | Promise<void>;
  onOpenDetail: (item: VocabularyItem) => void;
  onToggleExpanded: (item: VocabularyItem) => void;
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
  expandedItemId,
  viewMode,
  onLookupWord,
  onSaveLookupResult,
  onShareLookupResult,
  onChangeStatus,
  onDeleteItem,
  onOpenDetail,
  onToggleExpanded,
  onOpenCollections,
  onSendToPartner,
  onInteract,
}: VocabularyListProps) {
  const trimmedQuery = query.trim();
  const { t } = useTranslation();
  const { pair: languagePair } = useDisplayLanguages();
  const lookup = t.vocabulary.lookup;

  if (loading) {
    return (
      <section
        aria-label={t.vocabulary.search.loadingVocabulary}
        aria-live="polite"
        className="mt-6 flex min-h-40 items-center justify-center rounded-[24px] bg-white shadow-[0_8px_22px_rgba(0,0,0,0.04)]"
      >
        <div className="flex flex-col items-center gap-3 text-ink-faint">
          <LoaderCircle
            className="animate-spin"
            size={24}
            strokeWidth={1.8}
          />
          <span className="text-[12px] font-medium">
            {t.vocabulary.search.loadingVocabulary}
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
        title={t.vocabulary.search.firstWordTitle}
        description={t.vocabulary.search.firstWordDescription}
        action={
          <Link
            href="/capture?from=vocabulary"
            className="mx-auto flex h-12 max-w-sm items-center justify-center rounded-full bg-black px-5 text-[13px] font-semibold text-white transition active:scale-[0.99]"
          >
            {t.vocabulary.search.discoverWord}
          </Link>
        }
      />
    );
  }

  if (items.length === 0) {
    if (lookupStatus === "result" && lookupResult) {
      /*
       * The looked-up word gets the same hierarchy as a saved card: the
       * language being learned is the hero, the other is the support.
       *
       * There is no "is English primary" any more, and there does not need to
       * be — the result's two sides arrive in the pair's own order, learning
       * first, so the first one is the hero by construction rather than by a
       * question about which of two languages this happens to be.
       */
      const heroTextClass =
        "min-w-0 break-words text-[27px] font-semibold tracking-[-0.04em] text-black";
      const supportTextClass =
        "min-w-0 break-words text-xl font-normal text-ink-soft";
      const speakerBase =
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition active:scale-90";
      const heroSpeakerClass = `${speakerBase} bg-black text-white`;
      const supportSpeakerClass = `${speakerBase} bg-black/[0.05] text-ink-soft`;

      const wordRow = (
        text: string,
        language: LanguageCode,
        hero: boolean,
      ) => (
        <div
          key={language}
          className="mt-2 flex items-center justify-center gap-2.5"
        >
          <h2 className={hero ? heroTextClass : supportTextClass}>{text}</h2>

          <button
            type="button"
            onClick={() => speak(text, getLanguage(language).speechTag)}
            aria-label={insertValues(t.vocabulary.detail.listenAriaLabel, {
              text,
            })}
            className={hero ? heroSpeakerClass : supportSpeakerClass}
          >
            <Volume2 size={15} strokeWidth={1.8} />
          </button>
        </div>
      );

      const exampleSpeakerClass =
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-ink-soft transition active:scale-90";

      const exampleRow = (
        text: string | null | undefined,
        language: LanguageCode,
        hero: boolean,
      ) =>
        text ? (
          <div key={`example-${language}`} className="flex items-start gap-3">
            <p
              className={`min-w-0 flex-1 text-[14px] leading-6 ${
                hero ? "text-ink-strong" : "text-ink-soft"
              }`}
            >
              {text}
            </p>

            <button
              type="button"
              onClick={() => speak(text, getLanguage(language).speechTag)}
              aria-label={insertValues(t.vocabulary.detail.listenAriaLabel, {
                text,
              })}
              className={exampleSpeakerClass}
            >
              <Volume2 size={14} strokeWidth={1.8} />
            </button>
          </div>
        ) : null;

      return (
        <section className="mt-6 rounded-[24px] bg-white p-5 text-center shadow-[0_8px_22px_rgba(0,0,0,0.04)]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface text-ink-soft">
            <BookmarkPlus size={22} strokeWidth={1.7} />
          </div>

          <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
            {lookup.wordFound}
          </p>

          {[
            wordRow(lookupResult.englishName, languagePair[0], true),
            wordRow(lookupResult.chineseName, languagePair[1], false),
          ]}

          <PronunciationBlock
            entries={[
              { text: lookupResult.englishName, language: languagePair[0] },
              { text: lookupResult.chineseName, language: languagePair[1] },
            ]}
            className="mt-2.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1"
          />

          <p className="mt-2 text-[11px] font-medium tracking-[0.06em] text-ink-faint">
            {t.vocabulary.detail.partOfSpeech[
              normalizePartOfSpeech(lookupResult.partOfSpeech)
            ]}
          </p>

          <div className="mt-5 space-y-2 rounded-[20px] bg-surface p-4 text-left">
            {[
              exampleRow(lookupResult.englishExample, languagePair[0], true),
              exampleRow(lookupResult.chineseExample, languagePair[1], false),
            ]}
          </div>

          {/* Share sits beside Add rather than after it: sending a word to a
              partner is not a step that follows saving it, and often replaces
              it — the word was looked up for them, not for you. */}
          <div className="mt-5 flex items-center gap-2">
            <OrbitIconButton
              onClick={onShareLookupResult}
              aria-label={lookup.shareWithFriend}
              sizeClassName="h-12 w-12 shrink-0"
            >
              <Send size={17} strokeWidth={1.9} aria-hidden="true" />
            </OrbitIconButton>

            <button
            type="button"
            onClick={onSaveLookupResult}
            disabled={savingLookup}
            className="flex h-12 flex-1 items-center justify-center rounded-full bg-black px-5 text-[13px] font-semibold text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-35"
          >
            {savingLookup ? (
              <>
                <LoaderCircle
                  size={15}
                  className="mr-2 animate-spin"
                />
                {lookup.saving}
              </>
            ) : (
              lookup.addToVocabulary
            )}
          </button>
          </div>
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
                    {lookup.lookingUp}
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
      aria-label={t.vocabulary.search.yourWords}
      className={viewMode === "compact" ? "mt-5 space-y-2" : "mt-5 space-y-3"}
    >
      {items.map((item) => (
        <SwipeActionRow
          key={item.id}
          disabled={updatingId === item.id}
          trailingAction={{
            label: t.vocabulary.detail.deleteWordAriaLabel,
            icon: <Trash2 size={22} strokeWidth={1.8} />,
            onAction: () => onDeleteItem(item),
          }}
          leadingAction={{
            label: t.vocabulary.detail.addToCollectionsAriaLabel,
            icon: <FolderPlus size={22} strokeWidth={1.8} />,
            onAction: () => onOpenCollections(item),
          }}
        >
          <VocabularyCard
            item={item}
            updating={updatingId === item.id}
            expanded={expandedItemId === item.id}
            viewMode={viewMode}
            onChangeStatus={onChangeStatus}
            onSendToPartner={onSendToPartner}
            onOpenDetail={onOpenDetail}
            onToggleExpanded={onToggleExpanded}
            onInteract={onInteract}
          />
        </SwipeActionRow>
      ))}
    </section>
  );
}

export default memo(VocabularyList);
