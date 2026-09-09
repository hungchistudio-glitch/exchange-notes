"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, BookOpen, Trash2 } from "lucide-react";

import Screen from "@/components/foundation/layout/Screen";
import SwipeActionRow from "@/components/foundation/interaction/SwipeActionRow";
import VocabularyCard from "@/components/vocabulary/VocabularyCard";
import useTranslation from "@/hooks/i18n/useTranslation";
import {
  listCollections,
  listCollectionWords,
  removeItemFromCollection,
} from "@/lib/vocabulary/collections";
import { createClient } from "@/lib/supabase/client";
import type { VocabularyCollection, VocabularyItem } from "@/lib/types/app";

export default function CollectionDetailPage() {
  const params = useParams<{ id: string }>();
  const collectionId = params.id;

  const { t } = useTranslation();
  const copy = t.vocabulary.collections.detail;

  const [collection, setCollection] = useState<VocabularyCollection | null>(
    null,
  );
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !active) {
        if (active) setLoading(false);
        return;
      }

      try {
        const [collections, words] = await Promise.all([
          listCollections(supabase, user.id),
          listCollectionWords(supabase, collectionId),
        ]);

        if (active) {
          setCollection(
            collections.find((current) => current.id === collectionId) ??
              null,
          );
          setItems(words);
        }
      } catch (error) {
        if (active) {
          console.error(error);
          setErrorMessage(copy.loadingError);
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [collectionId, copy.loadingError]);

  async function handleRemove(item: VocabularyItem) {
    setRemovingId(item.id);
    const previous = items;

    setItems((current) =>
      current.filter((existing) => existing.id !== item.id),
    );

    try {
      const supabase = createClient();
      await removeItemFromCollection(supabase, collectionId, item.id);
    } catch (error) {
      setItems(previous);
      console.error(error);
      setErrorMessage(copy.removeError);
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <Screen>
      <div
        className="px-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 1.5rem)" }}
      >
        <Link
          href="/vocabulary/collections"
          aria-label={copy.backToCollections}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition hover:bg-black/[0.04]"
        >
          <ArrowLeft size={20} strokeWidth={1.9} />
        </Link>

        <div className="mt-3 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-xl shadow-sm">
            {collection?.emoji ?? "📚"}
          </span>
          <h1 className="text-[1.5rem] font-bold tracking-[-0.02em]">
            {collection?.name ?? copy.fallbackTitle}
          </h1>
        </div>

        {!loading && items.length > 0 && (
          <p className="mt-2 text-sm text-ink-faint">
            {items.length} {items.length === 1 ? copy.word : copy.words}{" "}
            {copy.inCollection}
          </p>
        )}

        {errorMessage && (
          <p className="mt-4 text-sm font-semibold text-red-600">
            {errorMessage}
          </p>
        )}

        {loading && (
          <p className="mt-10 text-center text-sm text-ink-faint">
            {copy.loading}
          </p>
        )}

        {!loading && items.length === 0 && (
          <div className="mt-10 rounded-[24px] bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface text-ink-soft">
              <BookOpen size={22} strokeWidth={1.7} />
            </div>
            <p className="mt-4 text-lg font-bold">{copy.emptyTitle}</p>
            <p className="mt-1 text-sm leading-6 text-ink-soft">
              {copy.emptyDescription}
            </p>
            <Link
              href="/vocabulary"
              className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-black px-5 text-sm font-semibold text-white"
            >
              {copy.browseVocabulary}
            </Link>
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="mt-5 space-y-3">
            {items.map((item) => (
              <SwipeActionRow
                key={item.id}
                disabled={removingId === item.id}
                trailingAction={{
                  label: copy.removeWordAriaLabel,
                  icon: <Trash2 size={22} strokeWidth={1.8} />,
                  onAction: () => handleRemove(item),
                }}
              >
                <VocabularyCard
                  item={item}
                  updating={false}
                  expanded={expandedItemId === item.id}
                  viewMode="cards"
                  onChangeStatus={() => {}}
                  onSendToPartner={() => {}}
                  onOpenDetail={() => {}}
                  onToggleExpanded={(selectedItem) => {
                    setExpandedItemId((current) =>
                      current === selectedItem.id ? null : selectedItem.id,
                    );
                  }}
                  onInteract={() => {}}
                />
              </SwipeActionRow>
            ))}
          </div>
        )}
      </div>
    </Screen>
  );
}
