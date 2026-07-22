"use client";

import {
  FolderOpen,
  LoaderCircle,
  Plus,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  type FormEvent,
  useCallback,
  useEffect,
  useState,
} from "react";

import AppButton from "@/components/ui/AppButton";
import AppPage from "@/components/ui/AppPage";
import {
  BackButton,
  PageHeader,
} from "@/components/foundation/navigation";
import useTranslation from "@/hooks/i18n/useTranslation";
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
  const { t } = useTranslation();

  const [collections, setCollections] = useState<
    VocabularyCollection[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("📚");
  const [error, setError] = useState("");

  const suggestions = [
    { emoji: "🍜", name: t.vocabulary.collections.examples.food },
    {
      emoji: "👟",
      name: t.vocabulary.collections.examples.fashion,
    },
    {
      emoji: "✈️",
      name: t.vocabulary.collections.examples.travel,
    },
    { emoji: "💼", name: t.vocabulary.collections.examples.work },
    { emoji: "🏠", name: t.vocabulary.collections.examples.home },
  ];

  const loadCollections = useCallback(async () => {
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

      const { data, error: fetchError } = await supabase
        .from("vocabulary_collections")
        .select("*, vocabulary_collection_items(count)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      setCollections(
        (data ?? []).map((collection) => ({
          ...(collection as VocabularyCollection),
          word_count:
            collection.vocabulary_collection_items?.[0]?.count ??
            0,
        })),
      );
    } catch (loadError) {
      console.error(loadError);
      setError(t.vocabulary.collections.loadingError);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadCollections();
  }, [loadCollections]);

  function openCreateModal(
    suggestion?: { emoji: string; name: string },
  ) {
    setEmoji(suggestion?.emoji ?? "📚");
    setName(suggestion?.name ?? "");
    setError("");
    setCreating(true);
  }

  function closeCreateModal() {
    if (saving) return;

    setCreating(false);
    setName("");
    setEmoji("📚");
  }

  async function createCollection(
    event?: FormEvent<HTMLFormElement>,
  ) {
    event?.preventDefault();

    const trimmedName = name.trim();

    if (!trimmedName || saving) return;

    setSaving(true);
    setError("");

    try {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("unauthenticated");
      }

      const palette = [
        "sand",
        "orange",
        "blue",
        "green",
        "charcoal",
      ];

      const { error: insertError } = await supabase
        .from("vocabulary_collections")
        .insert({
          user_id: user.id,
          name: trimmedName,
          emoji: emoji.trim() || "📚",
          color: palette[collections.length % palette.length],
        });

      if (insertError) {
        throw insertError;
      }

      setName("");
      setEmoji("📚");
      setCreating(false);

      await loadCollections();
    } catch (createError) {
      console.error(createError);
      setError(t.vocabulary.collections.createError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppPage>
      <PageHeader
        title={t.vocabulary.collections.title}
        description={t.vocabulary.collections.description}
        leading={
          <BackButton
            href="/vocabulary"
            label={t.vocabulary.collections.backToVocabulary}
          />
        }
        trailing={
          <button
            type="button"
            onClick={() => openCreateModal()}
            className="app-button app-button--primary app-button--icon"
            aria-label={
              t.vocabulary.collections.createCollectionAria
            }
          >
            <Plus size={18} />
          </button>
        }
      />

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
          <LoaderCircle className="animate-spin" size={26} />
        </div>
      ) : collections.length === 0 ? (
        <section className="mt-8 rounded-[30px] bg-white px-6 py-8 text-center shadow-[0_3px_16px_rgba(0,0,0,0.035)]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f4f1ea]">
            <FolderOpen size={24} strokeWidth={1.7} />
          </div>

          <h2 className="mt-5 text-2xl font-semibold tracking-[-0.035em]">
            {t.vocabulary.collections.emptyTitle}
          </h2>

          <p className="mx-auto mt-3 max-w-sm text-[14px] leading-6 text-black/50">
            {t.vocabulary.collections.emptyDescription}
          </p>

          <div className="mt-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/35">
              {t.vocabulary.collections.suggestions}
            </p>

            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={`${suggestion.emoji}-${suggestion.name}`}
                  type="button"
                  onClick={() => openCreateModal(suggestion)}
                  className="rounded-full bg-[#f4f1ea] px-4 py-2.5 text-[13px] font-semibold transition-transform active:scale-[0.97]"
                >
                  <span aria-hidden="true">
                    {suggestion.emoji}
                  </span>{" "}
                  {suggestion.name}
                </button>
              ))}
            </div>
          </div>

          <AppButton
            className="mt-6"
            onClick={() => openCreateModal()}
            leftIcon={<Plus size={16} />}
          >
            {t.vocabulary.collections.createCollection}
          </AppButton>
        </section>
      ) : (
        <section
          className="mt-6 grid grid-cols-2 gap-3"
          aria-label={t.vocabulary.collections.listAriaLabel}
        >
          {collections.map((collection) => {
            const count = collection.word_count ?? 0;
            const countLabel =
              count === 1
                ? t.vocabulary.collections.word
                : t.vocabulary.collections.words;

            return (
              <Link
                key={collection.id}
                href={`/vocabulary/collections/${collection.id}`}
                aria-label={`${collection.name}, ${count} ${countLabel}`}
                className={[
                  COLOR_CLASSES[collection.color] ??
                    COLOR_CLASSES.sand,
                  "flex min-h-[172px] flex-col rounded-[26px] p-5",
                  "transition-transform active:scale-[0.98]",
                ].join(" ")}
              >
                <span
                  aria-hidden="true"
                  className="text-[30px]"
                >
                  {collection.emoji}
                </span>

                <div className="mt-auto">
                  <h2 className="break-words text-[20px] font-semibold leading-tight tracking-[-0.035em]">
                    {collection.name}
                  </h2>

                  <p className="mt-2 text-[12px] font-semibold text-black/45">
                    {count} {countLabel}
                  </p>
                </div>
              </Link>
            );
          })}
        </section>
      )}

      {creating && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center">
          <button
            type="button"
            className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
            aria-label={t.vocabulary.collections.close}
            onClick={closeCreateModal}
          />

          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-collection-title"
            className="relative z-10 w-full max-w-[640px] rounded-t-[32px] bg-[#f4f1ea] px-4 pb-[calc(24px+env(safe-area-inset-bottom))] pt-3"
          >
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-black/15" />

            <form
              onSubmit={(event) =>
                void createCollection(event)
              }
              className="rounded-[28px] bg-white p-5"
            >
              <div className="flex items-center justify-between">
                <h2
                  id="new-collection-title"
                  className="text-[24px] font-semibold tracking-[-0.04em]"
                >
                  {t.vocabulary.collections.newCollection}
                </h2>

                <button
                  type="button"
                  onClick={closeCreateModal}
                  aria-label={t.vocabulary.collections.close}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-black/[0.055]"
                >
                  <X size={17} />
                </button>
              </div>

              <div className="mt-5 grid grid-cols-[72px_1fr] gap-2">
                <input
                  value={emoji}
                  onChange={(event) =>
                    setEmoji(event.target.value)
                  }
                  maxLength={4}
                  aria-label={
                    t.vocabulary.collections.emojiLabel
                  }
                  className="h-14 rounded-[18px] border border-black/[0.08] bg-[#f7f5f0] px-3 text-center text-2xl outline-none focus:border-black/30"
                />

                <input
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  placeholder={
                    t.vocabulary.collections.namePlaceholder
                  }
                  maxLength={60}
                  autoFocus
                  className="h-14 rounded-[18px] border border-black/[0.08] bg-[#f7f5f0] px-4 text-[15px] outline-none focus:border-black/30"
                />
              </div>

              <AppButton
                type="submit"
                size="lg"
                fullWidth
                className="mt-4"
                disabled={!name.trim()}
                loading={saving}
                loadingLabel={t.vocabulary.collections.creating}
                leftIcon={<Plus size={16} />}
              >
                {t.vocabulary.collections.createCollection}
              </AppButton>
            </form>
          </section>
        </div>
      )}
    </AppPage>
  );
}
