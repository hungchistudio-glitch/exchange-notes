"use client";

import {
  memo,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
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
    <VirtualWordList
      label={t.vocabulary.search.yourWords}
      items={items}
      viewMode={viewMode}
      renderRow={(item) => (
        <SwipeActionRow
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
      )}
    />
  );
}

/*
 * Only the rows on screen exist.
 *
 * The list rendered every word: 300 of them was 24,001 DOM nodes and a 2.5s
 * first render, and this is a library meant to grow into the thousands. The
 * rows are absolutely positioned against a spacer the height of the whole
 * list, so the scrollbar still describes the real thing.
 *
 * Heights are measured rather than assumed. A card is a different height
 * compact than detailed, and different again while expanded, so the estimate
 * below only has to be close enough to place the first frame — every row that
 * renders reports its real height back and the positions settle.
 */
const ROW_GAP: Record<VocabularyViewMode, number> = { compact: 8, cards: 12 };
const ROW_ESTIMATE: Record<VocabularyViewMode, number> = {
  compact: 76,
  cards: 132,
};

/*
 * Enough to cover a tall phone before anything has been measured — a little
 * over a screenful of the shorter compact rows. It is a fixed number rather
 * than a calculation because there is nothing to calculate from yet: the
 * viewport has not been found, which is the whole reason this pass exists.
 */
const FIRST_PAINT_ROWS = 12;

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

function VirtualWordList({
  label,
  items,
  viewMode,
  renderRow,
}: {
  label: string;
  items: VocabularyItem[];
  viewMode: VocabularyViewMode;
  renderRow: (item: VocabularyItem) => ReactNode;
}) {
  const sectionRef = useRef<HTMLElement>(null);

  /*
   * Three answers, not two: undefined is "not looked yet", null is "looked
   * and there is no scroller", an element is the scroller.
   *
   * This was a plain `HTMLElement | null` starting at null, and null carried
   * both meanings at once — so the first render of every visit took the
   * no-scroller branch below and built every word in the library, which the
   * layout effect then threw away one render later. The list scrolled
   * beautifully and took seconds to arrive, because virtualisation only ever
   * applied from the second render onwards. Arriving is the common case.
   */
  const [scrollElement, setScrollElement] = useState<
    HTMLElement | null | undefined
  >(undefined);

  /*
   * The app's one scroller, found by walking up rather than threaded down.
   * AppViewport marks it deliberately — see data-app-scroll-viewport there.
   * Layout effect so it is known before the first paint and the reader never
   * sees the placeholder below.
   */
  useIsomorphicLayoutEffect(() => {
    setScrollElement(
      sectionRef.current?.closest<HTMLElement>("[data-app-scroll-viewport]")
        ?? null,
    );
  }, []);

  const gap = ROW_GAP[viewMode];
  const estimatedRowHeight = ROW_ESTIMATE[viewMode] + gap;

  /*
   * The React Compiler's lint rule warns that it would skip memoising this
   * component because of this hook. It is not enabled on this project — only
   * its rules ship with eslint-plugin-react-hooks — so there is nothing being
   * skipped, and the memoisation that matters here is done by hand upstream
   * in useVocabularyPage.
   */
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollElement ?? null,
    estimateSize: () => estimatedRowHeight,
    getItemKey: (index) => items[index].id,
    // Enough rows either side that a fast flick does not outrun the render.
    overscan: 8,
  });

  /*
   * The first render, before anything has been measured.
   *
   * A screenful of real rows, laid out exactly as the virtualiser will lay
   * them out, against a spacer the height of the whole list. The scroller is
   * found in the layout effect above and React flushes that before the
   * browser paints, so this pass is normally never seen — but "normally" is
   * not a thing worth promising a reader about whether their words are on
   * screen, and a dozen rows costs nothing to be sure.
   *
   * This branch used to render *every* row, which is why arriving at a large
   * library took seconds: virtualisation only ever applied from the second
   * render onwards, so every visit paid for the whole list and then threw it
   * away. 2,000 words built 188,003 DOM nodes to show twelve.
   */
  if (scrollElement === undefined) {
    return (
      <section ref={sectionRef} aria-label={label} className="mt-5">
        <div
          style={{
            height: items.length * estimatedRowHeight,
            position: "relative",
          }}
        >
          {items.slice(0, FIRST_PAINT_ROWS).map((item, index) => (
            <div
              key={item.id}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${index * estimatedRowHeight}px)`,
                paddingBottom: gap,
              }}
            >
              {renderRow(item)}
            </div>
          ))}
        </div>
      </section>
    );
  }

  /*
   * No scroller found — a test, or this list mounted somewhere without the
   * app frame around it. Render the lot rather than render nothing: the
   * failure mode has to be "slow", never "the reader's words are missing".
   */
  if (scrollElement === null) {
    return (
      <section
        ref={sectionRef}
        aria-label={label}
        className={viewMode === "compact" ? "mt-5 space-y-2" : "mt-5 space-y-3"}
      >
        {items.map((item) => (
          <div key={item.id}>{renderRow(item)}</div>
        ))}
      </section>
    );
  }

  return (
    <section ref={sectionRef} aria-label={label} className="mt-5">
      <div
        style={{ height: virtualizer.getTotalSize(), position: "relative" }}
      >
        {virtualizer.getVirtualItems().map((row) => {
          const item = items[row.index];

          return (
            <div
              key={row.key}
              data-index={row.index}
              ref={virtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${row.start}px)`,
                paddingBottom: gap,
              }}
            >
              {renderRow(item)}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default memo(VocabularyList);
