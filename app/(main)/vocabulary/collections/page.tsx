"use client";

import { ArrowLeft, FolderOpen, LoaderCircle, Plus, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import AppButton from "@/components/ui/AppButton";
import AppPage from "@/components/ui/AppPage";
import PageHeader from "@/components/ui/PageHeader";
import { createClient } from "@/lib/supabase/client";
import type { VocabularyCollection } from "@/lib/types/app";

const COLOR_CLASSES: Record<string, string> = {
  sand: "bg-[#e9dfcb]",
  orange: "bg-[#f2d2b6]",
  blue: "bg-[#cfddeb]",
  green: "bg-[#d4e2cf]",
  charcoal: "bg-[#dedede]",
};

export default function CollectionsPage() {
  const [collections, setCollections] = useState<VocabularyCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("📚");
  const [error, setError] = useState("");

  const loadCollections = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Please log in to view collections.");

      const { data, error: fetchError } = await supabase
        .from("vocabulary_collections")
        .select("*, vocabulary_collection_items(count)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      if (fetchError) throw fetchError;

      setCollections(
        (data ?? []).map((collection) => ({
          ...(collection as VocabularyCollection),
          word_count: collection.vocabulary_collection_items?.[0]?.count ?? 0,
        })),
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load collections.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCollections();
  }, [loadCollections]);

  async function createCollection() {
    if (!name.trim() || saving) return;
    setSaving(true);
    setError("");
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Please log in to create a collection.");

      const palette = ["sand", "orange", "blue", "green", "charcoal"];
      const { error: insertError } = await supabase
        .from("vocabulary_collections")
        .insert({
          user_id: user.id,
          name: name.trim(),
          emoji: emoji.trim() || "📚",
          color: palette[collections.length % palette.length],
        });
      if (insertError) throw insertError;

      setName("");
      setEmoji("📚");
      setCreating(false);
      await loadCollections();
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Could not create collection.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppPage>
      <PageHeader
        eyebrow="Organize your learning"
        title="Collections"
        description="Group vocabulary by topic, place, project, or personal goal."
        leading={
          <Link
            href="/vocabulary"
            aria-label="Back to vocabulary"
            className="app-button app-button--secondary app-button--icon"
          >
            <ArrowLeft size={18} />
          </Link>
        }
        trailing={
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="app-button app-button--primary app-button--icon"
            aria-label="Create collection"
          >
            <Plus size={18} />
          </button>
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
      ) : collections.length === 0 ? (
        <section className="mt-8 rounded-[30px] bg-white p-8 text-center shadow-[0_3px_16px_rgba(0,0,0,0.035)]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f4f1ea]">
            <FolderOpen size={24} strokeWidth={1.7} />
          </div>
          <h2 className="mt-5 text-2xl font-semibold tracking-[-0.035em]">
            Build your first collection
          </h2>
          <p className="mx-auto mt-3 max-w-sm text-[14px] leading-6 text-black/50">
            Start with Food, Fashion, Travel, Work, or a personal learning
            project.
          </p>
          <AppButton className="mt-6" onClick={() => setCreating(true)}>
            <Plus size={16} /> New collection
          </AppButton>
        </section>
      ) : (
        <section
          className="mt-6 grid grid-cols-2 gap-3"
          aria-label="Vocabulary collections"
        >
          {collections.map((collection) => (
            <Link
              key={collection.id}
              href={`/vocabulary/collections/${collection.id}`}
              className={`${COLOR_CLASSES[collection.color] ?? COLOR_CLASSES.sand} min-h-[178px] rounded-[26px] p-5 transition-transform active:scale-[0.98]`}
            >
              <span className="text-[30px]">{collection.emoji}</span>
              <h2 className="mt-8 break-words text-[20px] font-semibold leading-tight tracking-[-0.035em]">
                {collection.name}
              </h2>
              <p className="mt-2 text-[12px] font-semibold text-black/45">
                {collection.word_count ?? 0}{" "}
                {(collection.word_count ?? 0) === 1 ? "word" : "words"}
              </p>
            </Link>
          ))}
        </section>
      )}

      {creating && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center">
          <button
            type="button"
            className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
            aria-label="Close"
            onClick={() => setCreating(false)}
          />
          <section className="relative z-10 w-full max-w-[640px] rounded-t-[32px] bg-[#f4f1ea] px-4 pb-[calc(24px+env(safe-area-inset-bottom))] pt-3">
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-black/15" />
            <div className="rounded-[28px] bg-white p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-[24px] font-semibold tracking-[-0.04em]">
                  New collection
                </h2>
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-black/[0.055]"
                >
                  <X size={17} />
                </button>
              </div>
              <div className="mt-5 grid grid-cols-[72px_1fr] gap-2">
                <input
                  value={emoji}
                  onChange={(event) => setEmoji(event.target.value)}
                  maxLength={4}
                  aria-label="Collection emoji"
                  className="h-14 rounded-[18px] border border-black/[0.08] bg-[#f7f5f0] px-3 text-center text-2xl outline-none"
                />
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Collection name"
                  autoFocus
                  className="h-14 rounded-[18px] border border-black/[0.08] bg-[#f7f5f0] px-4 text-[15px] outline-none focus:border-black/30"
                />
              </div>
              <AppButton
                size="lg"
                className="mt-4 w-full"
                disabled={!name.trim() || saving}
                onClick={() => void createCollection()}
              >
                {saving ? (
                  <LoaderCircle className="animate-spin" size={16} />
                ) : (
                  <Plus size={16} />
                )}
                Create collection
              </AppButton>
            </div>
          </section>
        </div>
      )}
    </AppPage>
  );
}
