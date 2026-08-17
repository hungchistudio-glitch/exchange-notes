"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, FolderPlus, Plus } from "lucide-react";

import Screen from "@/components/foundation/layout/Screen";
import ClearFieldButton from "@/components/foundation/forms/ClearFieldButton";
import useTranslation from "@/hooks/i18n/useTranslation";
import {
  COLLECTION_EMOJI_PRESETS,
  createCollection,
  listCollections,
} from "@/lib/vocabulary/collections";
import { createClient } from "@/lib/supabase/client";
import type { VocabularyCollection } from "@/lib/types/app";

export default function VocabularyCollectionsPage() {
  const { t } = useTranslation();
  const copy = t.vocabulary.collections;

  const [userId, setUserId] = useState<string | null>(null);
  const [collections, setCollections] = useState<VocabularyCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState(COLLECTION_EMOJI_PRESETS[0]);
  const [saving, setSaving] = useState(false);

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

      setUserId(user.id);

      try {
        const list = await listCollections(supabase, user.id);
        if (active) setCollections(list);
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
  }, [copy.loadingError]);

  async function handleCreate() {
    const name = newName.trim();

    if (!name || !userId) return;

    setSaving(true);
    setErrorMessage("");

    try {
      const supabase = createClient();
      const created = await createCollection(supabase, userId, name, newEmoji);

      setCollections((current) => [...current, created]);
      setNewName("");
      setCreating(false);
    } catch (error) {
      console.error(error);
      setErrorMessage(copy.createError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <div
        className="px-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 1.5rem)" }}
      >
        <Link
          href="/vocabulary"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-black/60 transition hover:bg-black/[0.04]"
          aria-label={copy.backToVocabulary}
        >
          <ArrowLeft size={20} strokeWidth={1.9} />
        </Link>

        <div className="mt-3 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-[26px] font-bold tracking-[-0.02em]">
              {copy.title}
            </h1>
            <p className="mt-1 text-black/50">{copy.description}</p>
          </div>

          <button
            type="button"
            onClick={() => setCreating(true)}
            aria-label={copy.createCollectionAria}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black text-white"
          >
            <Plus size={20} strokeWidth={2} />
          </button>
        </div>

        {errorMessage && (
          <p className="mt-4 text-sm font-semibold text-red-600">
            {errorMessage}
          </p>
        )}

        {creating && (
          <div className="mt-5 rounded-[24px] border border-line bg-white p-4">
            <p className="text-sm font-semibold">{copy.newCollection}</p>

            <div className="mt-3 flex flex-wrap gap-2">
              {COLLECTION_EMOJI_PRESETS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setNewEmoji(emoji)}
                  aria-label={copy.emojiLabel}
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-lg transition ${
                    newEmoji === emoji ? "bg-black" : "bg-surface"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            <div className="relative mt-3">

              <input

                value={newName}

                onChange={(event) => setNewName(event.target.value)}

                placeholder={copy.namePlaceholder}

                className="w-full rounded-xl border border-line bg-white py-2.5 pl-4 pr-11 text-sm outline-none"

              />

              {newName && (

                <ClearFieldButton floating onClear={() => setNewName("")} />

              )}

            </div>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="flex-1 rounded-xl border border-line bg-white py-2.5 text-sm font-semibold"
              >
                {copy.close}
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={saving || !newName.trim()}
                className="flex-1 rounded-xl bg-black py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? copy.creating : copy.createCollection}
              </button>
            </div>
          </div>
        )}

        {loading && (
          <p className="mt-10 text-center text-sm text-black/40">Loading…</p>
        )}

        {!loading && collections.length === 0 && (
          <div className="mt-10 rounded-[24px] bg-white p-8 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface text-black/50">
              <FolderPlus size={22} strokeWidth={1.7} />
            </div>
            <p className="mt-4 text-lg font-bold">{copy.emptyTitle}</p>
            <p className="mt-1 text-sm leading-6 text-black/50">
              {copy.emptyDescription}
            </p>
          </div>
        )}

        {!loading && collections.length > 0 && (
          <div
            aria-label={copy.listAriaLabel}
            className="mt-6 grid grid-cols-2 gap-3"
          >
            {collections.map((collection) => (
              <Link
                key={collection.id}
                href={`/vocabulary/collections/${collection.id}`}
                className="rounded-[24px] bg-white p-4 shadow-sm transition active:scale-[0.98]"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface text-xl">
                  {collection.emoji}
                </span>
                <p className="mt-3 truncate font-bold">{collection.name}</p>
                <p className="mt-0.5 text-xs text-black/40">
                  {collection.word_count ?? 0}{" "}
                  {(collection.word_count ?? 0) === 1 ? copy.word : copy.words}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </Screen>
  );
}
