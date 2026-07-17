"use client";

import { Check, FolderPlus, LoaderCircle, Plus, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import AppButton from "@/components/ui/AppButton";
import {
  listCollections,
  listVocabularyCollectionIds,
  setVocabularyCollections,
} from "@/lib/collections";
import { createClient } from "@/lib/supabase/client";
import type { VocabularyCollection, VocabularyItem } from "@/lib/types/app";

const COLORS = ["sand", "orange", "blue", "green", "charcoal"];

export default function CollectionPickerSheet({
  item,
  open,
  onClose,
}: {
  item: VocabularyItem;
  open: boolean;
  onClose: () => void;
}) {
  const [collections, setCollections] = useState<VocabularyCollection[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("📚");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Please log in to manage collections.");

      const [allCollections, assignedIds] = await Promise.all([
        listCollections(supabase, user.id),
        listVocabularyCollectionIds(supabase, item.id),
      ]);
      setCollections(allCollections);
      setSelectedIds(assignedIds);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load collections.",
      );
    } finally {
      setLoading(false);
    }
  }, [item.id]);

  useEffect(() => {
    if (!open) return;
    void load();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [load, open]);

  function toggle(collectionId: string) {
    setSelectedIds((current) =>
      current.includes(collectionId)
        ? current.filter((id) => id !== collectionId)
        : [...current, collectionId],
    );
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const supabase = createClient();
      await setVocabularyCollections(supabase, item.id, selectedIds);
      onClose();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not update collections.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function createCollection() {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    setSaving(true);
    setError("");
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Please log in to create a collection.");

      const { data, error: insertError } = await supabase
        .from("vocabulary_collections")
        .insert({
          user_id: user.id,
          name: trimmedName,
          emoji: emoji.trim() || "📚",
          color: COLORS[collections.length % COLORS.length],
        })
        .select()
        .single();
      if (insertError) throw insertError;

      const created = data as VocabularyCollection;
      setCollections((current) => [...current, created]);
      setSelectedIds((current) => [...current, created.id]);
      setName("");
      setEmoji("📚");
      setCreating(false);
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <button
        type="button"
        aria-label="Close collections"
        className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <section className="relative z-10 max-h-[88dvh] w-full max-w-[640px] overflow-y-auto rounded-t-[32px] bg-[#f4f1ea] px-4 pb-[calc(24px+env(safe-area-inset-bottom))] pt-3 shadow-[0_-18px_60px_rgba(0,0,0,0.18)]">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-black/15" />
        <div className="rounded-[28px] bg-white p-5 shadow-[0_10px_36px_rgba(16,16,15,0.06)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-black/32">
                Organize word
              </p>
              <h2 className="mt-2 text-[28px] font-semibold tracking-[-0.04em]">
                Collections
              </h2>
              <p className="mt-1 text-[14px] text-black/45">
                Add “{item.word}” to one or more learning groups.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black/[0.055]"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {loading ? (
            <div className="flex min-h-40 items-center justify-center">
              <LoaderCircle className="animate-spin" size={24} />
            </div>
          ) : (
            <div className="mt-5 space-y-2">
              {collections.map((collection) => {
                const selected = selectedIds.includes(collection.id);
                return (
                  <button
                    key={collection.id}
                    type="button"
                    onClick={() => toggle(collection.id)}
                    className={`flex min-h-[58px] w-full items-center gap-3 rounded-[20px] border px-4 text-left transition-all ${
                      selected
                        ? "border-black bg-black text-white"
                        : "border-black/[0.07] bg-[#f7f5f0]"
                    }`}
                  >
                    <span className="text-xl">{collection.emoji}</span>
                    <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">
                      {collection.name}
                    </span>
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full ${
                        selected ? "bg-white text-black" : "bg-black/[0.06]"
                      }`}
                    >
                      {selected && <Check size={15} strokeWidth={2.5} />}
                    </span>
                  </button>
                );
              })}

              {collections.length === 0 && !creating && (
                <div className="rounded-[22px] bg-[#f5f2eb] p-5 text-center">
                  <FolderPlus className="mx-auto text-black/35" size={25} />
                  <p className="mt-3 text-[14px] font-semibold">
                    Create your first collection
                  </p>
                  <p className="mt-1 text-[13px] leading-5 text-black/45">
                    Group words by topic, trip, project, or daily routine.
                  </p>
                </div>
              )}

              {creating ? (
                <div className="rounded-[22px] bg-[#f5f2eb] p-4">
                  <div className="grid grid-cols-[70px_1fr] gap-2">
                    <input
                      value={emoji}
                      onChange={(event) => setEmoji(event.target.value)}
                      aria-label="Collection emoji"
                      maxLength={4}
                      className="h-12 rounded-[16px] border border-black/[0.08] bg-white px-3 text-center text-xl outline-none"
                    />
                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Collection name"
                      className="h-12 rounded-[16px] border border-black/[0.08] bg-white px-4 text-[14px] outline-none focus:border-black/30"
                      autoFocus
                    />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <AppButton
                      variant="secondary"
                      onClick={() => setCreating(false)}
                    >
                      Cancel
                    </AppButton>
                    <AppButton
                      disabled={!name.trim() || saving}
                      onClick={() => void createCollection()}
                    >
                      {saving ? (
                        <LoaderCircle className="animate-spin" size={15} />
                      ) : (
                        <Plus size={15} />
                      )}
                      Create
                    </AppButton>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[18px] border border-dashed border-black/15 text-[13px] font-semibold text-black/55"
                >
                  <Plus size={16} /> New collection
                </button>
              )}
            </div>
          )}

          {error && (
            <p className="mt-4 rounded-[16px] bg-red-50 p-3 text-[13px] font-semibold text-red-700">
              {error}
            </p>
          )}

          <AppButton
            size="lg"
            className="mt-5 w-full"
            disabled={loading || saving}
            onClick={() => void save()}
          >
            {saving ? (
              <LoaderCircle className="animate-spin" size={16} />
            ) : (
              <Check size={16} />
            )}
            Save collections
          </AppButton>
        </div>
      </section>
    </div>
  );
}
