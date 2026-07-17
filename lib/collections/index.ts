import type { SupabaseClient } from "@supabase/supabase-js";

import type { VocabularyCollection } from "@/lib/types/app";

export const DEFAULT_COLLECTIONS = [
  { name: "Daily Life", emoji: "☀️", color: "sand" },
  { name: "Food", emoji: "🍜", color: "orange" },
  { name: "Fashion", emoji: "👕", color: "blue" },
  { name: "Travel", emoji: "✈️", color: "green" },
  { name: "Work", emoji: "💼", color: "charcoal" },
] as const;

export async function listCollections(
  supabase: SupabaseClient,
  userId: string,
): Promise<VocabularyCollection[]> {
  const { data, error } = await supabase
    .from("vocabulary_collections")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as VocabularyCollection[];
}

export async function listVocabularyCollectionIds(
  supabase: SupabaseClient,
  vocabularyItemId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("vocabulary_collection_items")
    .select("collection_id")
    .eq("vocabulary_item_id", vocabularyItemId);

  if (error) throw error;
  return (data ?? []).map((item) => item.collection_id as string);
}

export async function setVocabularyCollections(
  supabase: SupabaseClient,
  vocabularyItemId: string,
  collectionIds: string[],
) {
  const { error: deleteError } = await supabase
    .from("vocabulary_collection_items")
    .delete()
    .eq("vocabulary_item_id", vocabularyItemId);

  if (deleteError) throw deleteError;

  if (collectionIds.length === 0) return;

  const { error: insertError } = await supabase
    .from("vocabulary_collection_items")
    .insert(
      collectionIds.map((collectionId) => ({
        collection_id: collectionId,
        vocabulary_item_id: vocabularyItemId,
      })),
    );

  if (insertError) throw insertError;
}
