import { SupabaseClient } from "@supabase/supabase-js";

import type { PetState } from "./types";

const TABLE = "yumi_pet_state";

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

// Fetches the caller's Yumi state, creating a fresh row on first visit.
// Returns a client-side fallback (never persisted) if the yumi_pet_state
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

/*
 * Applies a feed locally, and only locally.
 *
 * Feeding is now continuous — a hand can put four cookies in Yumi's mouth
 * inside a second — so the tray has to update from this, immediately, rather
 * than from whatever the network eventually agrees to. Pure and idempotent:
 * feeding the same word twice is the same state, which is what makes it safe
 * to call from an optimistic path that may also be replayed.
 */
export function applyFedCookie(current: PetState, wordId: string): PetState {
  if (current.fed_word_ids.includes(wordId)) {
    return current;
  }

  const now = new Date().toISOString();

  return {
    ...current,
    fed_word_ids: [...current.fed_word_ids, wordId],
    total_cookies_fed: current.total_cookies_fed + 1,
    last_fed_at: now,
    updated_at: now,
  };
}

/*
 * Pushes the whole accumulated feeding state to the row.
 *
 * This replaced a read-modify-write per cookie, which was correct only while
 * feeding was one-at-a-time: two feeds started before either had returned both
 * read the same snapshot, and the second write then erased the first — one
 * word silently un-fed and the counter short by one. Writing the caller's
 * already-accumulated state instead means a late write can only ever be
 * redundant, never lossy, provided the caller serialises them (see
 * useFeedPersistence).
 */
export async function saveFedProgress(
  supabase: SupabaseClient,
  state: PetState,
): Promise<PetState> {
  const { data, error } = await supabase
    .from(TABLE)
    .update({
      fed_word_ids: state.fed_word_ids,
      total_cookies_fed: state.total_cookies_fed,
      last_fed_at: state.last_fed_at,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", state.user_id)
    .select("*")
    .single();

  if (error || !data) {
    // Persistence failed silently (e.g. table not migrated yet) — keep the
    // optimistic in-memory state so the interaction still feels alive.
    return state;
  }

  return data as PetState;
}

// Stamps "last opened" for mood computation (e.g. "Yumi missed you"),
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
