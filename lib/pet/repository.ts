import { SupabaseClient } from "@supabase/supabase-js";

import type { PetState } from "./types";

const TABLE = "murph_pet_state";

function emptyState(userId: string): PetState {
  const now = new Date().toISOString();

  return {
    user_id: userId,
    fed_word_ids: [],
    total_cookies_fed: 0,
    last_fed_at: null,
    last_opened_at: null,
    created_at: now,
    updated_at: now,
  };
}

// Fetches the caller's Murph state, creating a fresh row on first visit.
// Returns a client-side fallback (never persisted) if the murph_pet_state
// table doesn't exist yet — e.g. before the migration has been run against
// the live database — so the page still renders instead of hard-failing.
export async function getOrCreatePetState(
  supabase: SupabaseClient,
  userId: string,
): Promise<PetState> {
  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return emptyState(userId);
  }

  if (data) {
    return data as PetState;
  }

  const { data: created, error: insertError } = await supabase
    .from(TABLE)
    .insert({ user_id: userId })
    .select("*")
    .single();

  if (insertError || !created) {
    return emptyState(userId);
  }

  return created as PetState;
}

// Records that a word's cookie has been fed to Murph. Read-modify-write is
// fine here — feeding is a single-user, low-frequency, UI-driven action.
export async function feedCookie(
  supabase: SupabaseClient,
  current: PetState,
  wordId: string,
): Promise<PetState> {
  if (current.fed_word_ids.includes(wordId)) {
    return current;
  }

  const nextFedIds = [...current.fed_word_ids, wordId];
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from(TABLE)
    .update({
      fed_word_ids: nextFedIds,
      total_cookies_fed: current.total_cookies_fed + 1,
      last_fed_at: now,
      updated_at: now,
    })
    .eq("user_id", current.user_id)
    .select("*")
    .single();

  if (error || !data) {
    // Persistence failed silently (e.g. table not migrated yet) — keep the
    // optimistic in-memory state so the interaction still feels alive.
    return {
      ...current,
      fed_word_ids: nextFedIds,
      total_cookies_fed: current.total_cookies_fed + 1,
      last_fed_at: now,
      updated_at: now,
    };
  }

  return data as PetState;
}

// Stamps "last opened" for mood computation (e.g. "Murph missed you"),
// returning the PREVIOUS last_opened_at so the caller can diff against it
// before it gets overwritten.
export async function touchOpened(
  supabase: SupabaseClient,
  current: PetState,
): Promise<{ previousOpenedAt: string | null; state: PetState }> {
  const previousOpenedAt = current.last_opened_at;
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from(TABLE)
    .update({ last_opened_at: now, updated_at: now })
    .eq("user_id", current.user_id)
    .select("*")
    .single();

  if (error || !data) {
    return {
      previousOpenedAt,
      state: { ...current, last_opened_at: now, updated_at: now },
    };
  }

  return { previousOpenedAt, state: data as PetState };
}
