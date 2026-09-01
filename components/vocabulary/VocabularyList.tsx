"use client";

import { memo, type ComponentProps } from "react";
import {
  BookOpen,
  FolderPlus,
  LoaderCircle,
  Search,
  SearchX,
  Trash2,
} from "lucide-react";

import LanguageOriginBadge from "@/components/language/LanguageOriginBadge";
import { EmptyState } from "@/components/foundation-legacy";
import { getLanguageName, type LanguageCode } from "@/lib/languages";
import { insertValues } from "@/lib/utils";
import SwipeActionRow from "@/components/foundation/interaction/SwipeActionRow";
import VocabularyCard from "@/components/vocabulary/VocabularyCard";
import useTranslation from "@/hooks/i18n/useTranslation";
import type {
  VocabularyItem,
  VocabularyStatus,
} from "@/lib/types/app";
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
  expandedItemId: string | null;
  viewMode: VocabularyViewMode;
  /** Which languages the list is limited to. Empty means all of them. */
  languageFilter: readonly LanguageCode[];
  /**
   * Hands a query to the Universal Search.
   *
   * This list used to look the word up itself and render the answer inline,
   * which meant the vocabulary screen carried a second copy of the result
   * card, the save button and the duplicate check — three things that could
   * disagree with the sheet showing the same word one tap away. It hands over
   * now, and the one sheet answers.
   *
   * An empty string opens the search with nothing in it, for the two empty
   * states where there is no query yet.
   */
  onLookUpQuery: (query: string) => void;
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
  expandedItemId,
  viewMode,
  languageFilter,
  onLookUpQuery,
  onChangeStatus,
  onDeleteItem,
  onOpenDetail,
  onToggleExpanded,
  onOpenCollections,
  onSendToPartner,
  onInteract,
}: VocabularyListProps) {
  const trimmedQuery = query.trim();
  const { t, language: interfaceLanguage } = useTranslation();
  const lookup = t.vocabulary.lookup;

  /* The way out of every empty state on this screen: one button, one sheet. */
  const searchAction = (query: string) => (
    <button
      type="button"
      onClick={() => onLookUpQuery(query)}
      className="mx-auto flex h-12 w-full max-w-sm items-center justify-center gap-2 rounded-full bg-black px-5 text-[0.8125rem] font-semibold text-white transition active:scale-[0.99]"
    >
      <Search size={15} strokeWidth={2} aria-hidden="true" />
      {query
        ? insertValues(lookup.lookUpWord, { word: query })
        : t.lexicon.open}
    </button>
  );

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
          <span className="text-[0.75rem] font-medium">
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
        icon={<Search size={23} strokeWidth={1.7} />}
        title={t.vocabulary.search.firstWordTitle}
        description={t.vocabulary.search.firstWordDescription}
        /* The camera used to be the only way out of an empty library, which
           made the first word conditional on having something to photograph.
           The search takes any of the four inputs, the camera among them. */
        action={searchAction("")}
      />
    );
  }

  /*
   * A language filter with nothing behind it gets its own answer.
   *
   * The generic "no words yet" is wrong here and misleading with it: the
   * library is not empty, this corner of it is, and the reader chose the
   * corner. Naming the language is the difference between "you have nothing"
   * and "you have nothing in Italian yet".
   *
   * Only when nothing else is narrowing the list. With a search term or a
   * status chip also active, the language is one of several reasons for the
   * emptiness and singling it out would be a guess.
   */
  if (items.length === 0 && languageFilter.length === 1 && !trimmedQuery) {
    const languageName = getLanguageName(languageFilter[0], interfaceLanguage);

    return (
      <div className="mt-6">
        <EmptyState
          className="rounded-[24px] py-8 shadow-[0_8px_22px_rgba(0,0,0,0.04)]"
          icon={<LanguageOriginBadge language={languageFilter[0]} />}
          title={insertValues(t.vocabulary.language.emptyTitle, {
            language: languageName,
          })}
          description={insertValues(t.vocabulary.language.emptyDescription, {
            language: languageName,
          })}
          action={searchAction("")}
        />
      </div>
    );
  }

  if (items.length === 0) {
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
          action={trimmedQuery ? searchAction(trimmedQuery) : undefined}
        />
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
