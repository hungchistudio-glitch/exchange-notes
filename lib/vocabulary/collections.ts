import type { SupabaseClient } from "@supabase/supabase-js";

import type { VocabularyCollection, VocabularyItem } from "@/lib/types/app";

export const COLLECTION_EMOJI_PRESETS = [
  "📚",
  "⭐",
  "🐶",
  "🍎",
  "✈️",
  "💼",
  "🎬",
  "🏠",
  "❤️",
  "🎯",
  "🌱",
  "🎓",
];

type CollectionRow = {
  id: string;
  user_id: string;
  name: string;
  emoji: string;
  color: string;
  created_at: string;
  updated_at: string;
  vocabulary_collection_items?: { count: number }[];
};

function toCollection(row: CollectionRow): VocabularyCollection {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    emoji: row.emoji,
    color: row.color,
    created_at: row.created_at,
    updated_at: row.updated_at,
    word_count: row.vocabulary_collection_items?.[0]?.count ?? 0,
  };
}

/** List every collection the user has created, with a word count each. */
export async function listCollections(
  supabase: SupabaseClient,
  userId: string,
): Promise<VocabularyCollection[]> {
  const { data, error } = await supabase
    .from("vocabulary_collections")
    .select("*, vocabulary_collection_items(count)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return ((data ?? []) as CollectionRow[]).map(toCollection);
}

/** Create a new collection. */
export async function createCollection(
  supabase: SupabaseClient,
  userId: string,
  name: string,
  emoji: string,
): Promise<VocabularyCollection> {
  const { data, error } = await supabase
    .from("vocabulary_collections")
    .insert({ user_id: userId, name: name.trim(), emoji })
    .select("*")
    .single();

  if (error) throw error;

  return toCollection({ ...(data as CollectionRow), vocabulary_collection_items: [{ count: 0 }] });
}
/** Which of the user's collections a given word currently belongs to. */
export async function listCollectionIdsForItem(
  supabase: SupabaseClient,
  vocabularyItemId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from("vocabulary_collection_items")
    .select("collection_id")
    .eq("vocabulary_item_id", vocabularyItemId);

  if (error) throw error;

  return (data ?? []).map((row) => row.collection_id as string);
}

export async function addItemToCollection(
  supabase: SupabaseClient,
  collectionId: string,
  vocabularyItemId: string,
): Promise<void> {
  const { error } = await supabase.from("vocabulary_collection_items").insert({
    collection_id: collectionId,
    vocabulary_item_id: vocabularyItemId,
  });

  if (error) throw error;
}

export async function removeItemFromCollection(
  supabase: SupabaseClient,
  collectionId: string,
  vocabularyItemId: string,
): Promise<void> {
  const { error } = await supabase
    .from("vocabulary_collection_items")
    .delete()
    .eq("collection_id", collectionId)
    .eq("vocabulary_item_id", vocabularyItemId);

  if (error) throw error;
}

/** All vocabulary items that belong to a given collection. */
export async function listCollectionWords(
  supabase: SupabaseClient,
  collectionId: string,
): Promise<VocabularyItem[]> {
  const { data, error } = await supabase
    .from("vocabulary_collection_items")
    .select("vocabulary_items(*)")
    .eq("collection_id", collectionId);

  if (error) throw error;

  return (data ?? [])
    .map((row) => row.vocabulary_items as unknown as VocabularyItem)
    .filter(Boolean);
}
