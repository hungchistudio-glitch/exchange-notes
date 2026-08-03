"use client";

import { useEffect, useState } from "react";

import useTranslation from "@/hooks/i18n/useTranslation";
import {
  COLLECTION_EMOJI_PRESETS,
  addItemToCollection,
  createCollection,
  listCollectionIdsForItem,
  listCollections,
  removeItemFromCollection,
} from "@/lib/vocabulary/collections";
import { createClient } from "@/lib/supabase/client";
import type { VocabularyCollection, VocabularyItem } from "@/lib/types/app";

type CollectionPickerSheetProps = {
  item: VocabularyItem;
  onClose: () => void;
};

export default function CollectionPickerSheet({
  item,
  onClose,
}: CollectionPickerSheetProps) {
  const { t } = useTranslation();
  const copy = t.vocabulary.collections;

  const [collections, setCollections] = useState<VocabularyCollection[]>([]);
  const [memberIds, setMemberIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
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

      try {
        const [collectionList, memberList] = await Promise.all([
          listCollections(supabase, user.id),
          listCollectionIdsForItem(supabase, item.id),
        ]);

        if (active) {
          setCollections(collectionList);
          setMemberIds(new Set(memberList));
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
  }, [item.id, copy.loadingError]);

  async function handleToggle(collection: VocabularyCollection) {
    setTogglingId(collection.id);
    const supabase = createClient();
    const isMember = memberIds.has(collection.id);

    setMemberIds((current) => {
      const next = new Set(current);
      if (isMember) next.delete(collection.id);
      else next.add(collection.id);
      return next;
    });

    setCollections((current) =>
      current.map((c) =>
        c.id === collection.id
          ? { ...c, word_count: Math.max(0, (c.word_count ?? 0) + (isMember ? -1 : 1)) }
          : c,
      ),
    );

    try {
      if (isMember) {
        await removeItemFromCollection(supabase, collection.id, item.id);
      } else {
        await addItemToCollection(supabase, collection.id, item.id);
      }
    } catch (error) {
      setMemberIds((current) => {
        const next = new Set(current);
        if (isMember) next.add(collection.id);
        else next.delete(collection.id);
        return next;
      });

      setCollections((current) =>
        current.map((c) =>
          c.id === collection.id
            ? { ...c, word_count: Math.max(0, (c.word_count ?? 0) + (isMember ? 1 : -1)) }
            : c,
        ),
      );

      console.error(error);
      setErrorMessage(copy.toggleError);
    } finally {
      setTogglingId(null);
    }
  }

  async function handleCreate() {
    const name = newName.trim();

    if (!name) return;

    setSaving(true);
    setErrorMessage("");

    try {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const created = await createCollection(supabase, user.id, name, newEmoji);

      await addItemToCollection(supabase, created.id, item.id);

      setCollections((current) => [
        ...current,
        { ...created, word_count: 1 },
      ]);
      setMemberIds((current) => new Set(current).add(created.id));
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
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-t-[28px] bg-white p-5"
        style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto h-1 w-10 rounded-full bg-black/10" />

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-black/40">
              Collections
            </p>
            <h2 className="mt-0.5 truncate text-lg font-bold">{item.word}</h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-black/50 hover:bg-black/[0.04]"
          >
            ✕
          </button>
        </div>

        {errorMessage && (
          <p className="mt-3 text-sm font-semibold text-red-600">
            {errorMessage}
          </p>
        )}

        <div className="mt-4 max-h-[45vh] space-y-2 overflow-y-auto">
          {loading && (
            <p className="py-6 text-center text-sm text-black/40">
              Loading…
            </p>
          )}

          {!loading && collections.length === 0 && (
            <p className="py-6 text-center text-sm text-black/40">
              You don&apos;t have any collections yet.
            </p>
          )}

          {!loading &&
            collections.map((collection) => {
              const checked = memberIds.has(collection.id);

              return (
                <button
                  key={collection.id}
                  type="button"
                  onClick={() => handleToggle(collection)}
                  disabled={togglingId === collection.id}
                  className="flex w-full items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 text-left transition disabled:opacity-50"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface text-lg">
                    {collection.emoji}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">
                      {collection.name}
                    </span>
                    <span className="block text-xs text-black/40">
                      {collection.word_count ?? 0} words
                    </span>
                  </span>

                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${
                      checked
                        ? "border-black bg-black text-white"
                        : "border-line text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                </button>
              );
            })}
        </div>

        {creating ? (
          <div className="mt-4 rounded-2xl border border-line bg-surface p-4">
            <div className="flex flex-wrap gap-2">
              {COLLECTION_EMOJI_PRESETS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setNewEmoji(emoji)}
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-lg transition ${
                    newEmoji === emoji ? "bg-black" : "bg-white"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            <input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Collection name"
              className="mt-3 w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm outline-none"
            />

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="flex-1 rounded-xl border border-line bg-white py-2.5 text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={saving || !newName.trim()}
                className="flex-1 rounded-xl bg-black py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-black/20 py-3 text-sm font-semibold text-black/60"
          >
            + New collection
          </button>
        )}
      </div>
    </div>
  );
}
