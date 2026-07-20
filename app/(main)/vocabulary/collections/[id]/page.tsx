"use client";

import { ArrowLeft, BookOpen, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import AppPage from "@/components/ui/AppPage";
import PageHeader from "@/components/ui/PageHeader";
import VocabularyCard from "@/components/vocabulary/VocabularyCard";
import { createClient } from "@/lib/supabase/client";
import type { VocabularyCollection, VocabularyItem } from "@/lib/types/app";

export default function CollectionDetailPage() {
  const params = useParams<{ id: string }>();
  const [collection, setCollection] = useState<VocabularyCollection | null>(
    null,
  );
  const [items, setItems] = useState<VocabularyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Please log in to view this collection.");

        const { data: collectionData, error: collectionError } = await supabase
          .from("vocabulary_collections")
          .select("*")
          .eq("id", params.id)
          .eq("user_id", user.id)
          .single();
        if (collectionError) throw collectionError;

        const { data: links, error: linksError } = await supabase
          .from("vocabulary_collection_items")
          .select("vocabulary_items(*)")
          .eq("collection_id", params.id)
          .order("created_at", { ascending: false });
        if (linksError) throw linksError;

        if (active) {
          setCollection(collectionData as VocabularyCollection);
          setItems(
            (links ?? [])
              .map((link) => link.vocabulary_items as unknown as VocabularyItem)
              .filter(Boolean),
          );
        }
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Could not load this collection.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [params.id]);

  async function changeStatus(
    item: VocabularyItem,
    status: VocabularyItem["status"],
  ) {
    setUpdatingId(item.id);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from("vocabulary_items")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", item.id);
      if (updateError) throw updateError;
      setItems((current) =>
        current.map((currentItem) =>
          currentItem.id === item.id ? { ...currentItem, status } : currentItem,
        ),
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function deleteItem(item: VocabularyItem) {
    if (!window.confirm(`Delete “${item.word}” from your vocabulary?`)) return;
    const supabase = createClient();
    const { error: deleteError } = await supabase
      .from("vocabulary_items")
      .delete()
      .eq("id", item.id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    setItems((current) =>
      current.filter((currentItem) => currentItem.id !== item.id),
    );
  }

  return (
    <AppPage>
      <PageHeader
        eyebrow="Vocabulary collection"
        title={
          collection ? `${collection.emoji} ${collection.name}` : "Collection"
        }
        description={`${items.length} ${items.length === 1 ? "word" : "words"} in this collection.`}
        leading={
          <Link
            href="/vocabulary/collections"
            className="app-button app-button--secondary app-button--icon"
            aria-label="Back to collections"
          >
            <ArrowLeft size={18} />
          </Link>
        }
      />

      {error && (
        <p className="mt-5 rounded-[18px] bg-red-50 p-4 text-[13px] font-semibold text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <div className="mt-8 flex min-h-48 items-center justify-center rounded-[28px] bg-white">
          <LoaderCircle className="animate-spin" size={26} />
        </div>
      ) : items.length === 0 ? (
        <section className="mt-8 rounded-[30px] bg-white p-8 text-center">
          <BookOpen className="mx-auto text-black/30" size={28} />
          <h2 className="mt-4 text-xl font-semibold">No words here yet</h2>
          <p className="mt-2 text-[14px] leading-6 text-black/50">
            Open a vocabulary card and choose Collections to add it here.
          </p>
          <Link
            href="/vocabulary"
            className="mt-5 inline-flex h-12 items-center justify-center rounded-full bg-black px-6 text-[13px] font-semibold text-white"
          >
            Browse vocabulary
          </Link>
        </section>
      ) : (
        <section className="mt-6 space-y-4">
          {items.map((item) => (
            <VocabularyCard
              key={item.id}
              item={item}
              learningLanguage={null}
              updating={updatingId === item.id}
              onChangeStatus={changeStatus}
              onSendToPartner={() => undefined}
              onDelete={deleteItem}
              onInteract={() => undefined}
            />
          ))}
        </section>
      )}
    </AppPage>
  );
}
