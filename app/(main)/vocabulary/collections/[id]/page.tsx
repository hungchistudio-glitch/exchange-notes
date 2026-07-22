"use client";

import {
  ArrowLeft,
  BookOpen,
  LoaderCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import AppPage from "@/components/ui/AppPage";
import PageHeader from "@/components/ui/PageHeader";
import VocabularyCard from "@/components/vocabulary/VocabularyCard";
import useTranslation from "@/hooks/i18n/useTranslation";
import { createClient } from "@/lib/supabase/client";
import type {
  VocabularyCollection,
  VocabularyItem,
} from "@/lib/types/app";

export default function CollectionDetailPage() {
  const { t } = useTranslation();
  const params = useParams<{ id: string }>();

  const [collection, setCollection] =
    useState<VocabularyCollection | null>(null);
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let active = true;

    async function loadCollection() {
      setLoading(true);
      setError("");

      try {
        const supabase = createClient();

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          throw new Error("unauthenticated");
        }

        const {
          data: collectionData,
          error: collectionError,
        } = await supabase
          .from("vocabulary_collections")
          .select("*")
          .eq("id", params.id)
          .eq("user_id", user.id)
          .single();

        if (collectionError) {
          throw collectionError;
        }

        const { data: links, error: linksError } =
          await supabase
            .from("vocabulary_collection_items")
            .select("vocabulary_items(*)")
            .eq("collection_id", params.id)
            .order("created_at", { ascending: false });

        if (linksError) {
          throw linksError;
        }

        if (!active) return;

        setCollection(
          collectionData as VocabularyCollection,
        );

        setItems(
          (links ?? [])
            .map(
              (link) =>
                link.vocabulary_items as unknown as VocabularyItem,
            )
            .filter(Boolean),
        );
      } catch (loadError) {
        console.error(loadError);

        if (active) {
          setError(
            t.vocabulary.collections.detail.loadingError,
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadCollection();

    return () => {
      active = false;
    };
  }, [
    params.id,
    t.vocabulary.collections.detail.loadingError,
  ]);

  async function changeStatus(
    item: VocabularyItem,
    status: VocabularyItem["status"],
  ) {
    setUpdatingId(item.id);

    try {
      const supabase = createClient();

      const { error: updateError } = await supabase
        .from("vocabulary_items")
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id);

      if (updateError) {
        throw updateError;
      }

      setItems((currentItems) =>
        currentItems.map((currentItem) =>
          currentItem.id === item.id
            ? { ...currentItem, status }
            : currentItem,
        ),
      );
    } catch (updateError) {
      console.error(updateError);
    } finally {
      setUpdatingId(null);
    }
  }

  const detail = t.vocabulary.collections.detail;
  const description = ` `;

  return (
    <AppPage>
      <div className="[&_.page-header__title]:text-[24px] [&_.page-header__title]:leading-tight">
        <PageHeader
          title={
            collection
              ? `${collection.emoji} ${collection.name}`
              : detail.fallbackTitle
          }
          description={description}
        leading={
          <Link
            href="/vocabulary/collections"
            aria-label={detail.backToCollections}
            className="flex h-11 w-11 items-center justify-center rounded-xl transition-colors hover:bg-black/5 active:bg-black/10"
          >
            <ArrowLeft size={18} />
          </Link>
          }
        />
      </div>

      {error && (
        <p
          role="alert"
          className="mt-5 rounded-[18px] bg-red-50 p-4 text-[13px] font-semibold text-red-700"
        >
          {error}
        </p>
      )}

      {loading ? (
        <div className="mt-8 flex min-h-48 items-center justify-center rounded-[28px] bg-white">
          <LoaderCircle
            className="animate-spin"
            size={26}
          />
        </div>
      ) : items.length === 0 ? (
        <section className="mt-6 rounded-[28px] bg-white px-5 py-7 text-center shadow-[0_3px_16px_rgba(0,0,0,0.035)]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#f4f1ea]">
            <BookOpen
              size={21}
              strokeWidth={1.7}
              className="text-black/45"
            />
          </div>

          <h2 className="mt-4 text-[20px] font-semibold tracking-[-0.03em]">
            {detail.emptyTitle}
          </h2>

          <p className="mx-auto mt-2.5 max-w-[340px] text-[14px] leading-[1.65] text-black/50">
            {detail.emptyDescription}
          </p>

          <Link
            href="/vocabulary"
            className="app-button app-button--primary mt-5 inline-flex h-12 min-w-[220px] items-center justify-center rounded-full px-8 text-[15px] font-semibold"
          >
            {detail.browseVocabulary}
          </Link>
        </section>
      ) : (
        <section className="mt-6 space-y-4">
          {items.map((item) => (
            <VocabularyCard
              key={item.id}
              item={item}
              updating={updatingId === item.id}
              onChangeStatus={changeStatus}
              onSendToPartner={() => undefined}
              onInteract={() => undefined}
            />
          ))}
        </section>
      )}
    </AppPage>
  );
}
