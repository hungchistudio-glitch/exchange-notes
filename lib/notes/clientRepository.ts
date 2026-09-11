"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  cachePrivateNote,
  cachePrivateNotes,
  deletePrivateNote,
  readPrivateNote,
  readPrivateNotes,
} from "@/lib/offline/privateNotes";
import {
  createNote as createRemoteNote,
  deleteNote as deleteRemoteNote,
  fetchNote as fetchRemoteNote,
  fetchNotes as fetchRemoteNotes,
  importLegacyNotes,
  searchNotes,
} from "@/lib/notes/repository";
import type { Note, NoteInput } from "@/lib/notes/repository";

export type {
  Note,
  NoteInput,
  NoteInterpretation,
  NotePrivacy,
  NoteSourceKind,
} from "@/lib/notes/repository";
export { importLegacyNotes, searchNotes };

function browserReportsOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

function isNetworkFailure(error: unknown): boolean {
  if (browserReportsOffline() || error instanceof TypeError) return true;
  if (!error || typeof error !== "object") return false;

  const candidate = error as {
    code?: unknown;
    message?: unknown;
    status?: unknown;
  };
  if (candidate.status === 0) return true;

  const code = typeof candidate.code === "string" ? candidate.code : "";
  if (code === "PGRST000" || code === "PGRST001" || code === "PGRST002") {
    return true;
  }

  const message =
    typeof candidate.message === "string"
      ? candidate.message.toLocaleLowerCase()
      : "";
  return (
    message.includes("failed to fetch") ||
    message.includes("fetch failed") ||
    message.includes("network request failed") ||
    message.includes("networkerror") ||
    message.includes("load failed")
  );
}

/**
 * Reads the already-held browser session so an encrypted mirror can open
 * without a network round trip. This is not authorization: every server
 * operation still travels through Supabase Auth and RLS.
 */
export async function getNotesSessionUserId(
  supabase: SupabaseClient,
): Promise<string | null> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.user?.id ?? null;
  } catch {
    // Older injected clients and locked-down storage can lack a readable
    // local session. An online identity check remains a safe fallback.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id ?? null;
  }
}

export async function fetchNotes(
  supabase: SupabaseClient,
  currentUserId: string,
  options: { limit?: number } = {},
) {
  if (browserReportsOffline()) {
    const local = await readPrivateNotes(currentUserId);
    return options.limit === undefined ? local : local.slice(0, options.limit);
  }

  try {
    const notes = await fetchRemoteNotes(supabase, currentUserId, options);
    await cachePrivateNotes(notes, currentUserId, {
      // The compact Home query is an upsert, not authority to erase the rest.
      replace: options.limit === undefined,
    });
    return notes;
  } catch (error) {
    // A 401/RLS rejection is not "offline". Showing a stale local copy after
    // the server has denied access would turn availability into an auth bypass.
    if (!isNetworkFailure(error)) throw error;
    const local = await readPrivateNotes(currentUserId);
    if (local.length === 0) throw error;
    return options.limit === undefined ? local : local.slice(0, options.limit);
  }
}

export async function fetchNote(
  supabase: SupabaseClient,
  currentUserId: string,
  noteId: string,
) {
  if (browserReportsOffline()) {
    return readPrivateNote(currentUserId, noteId);
  }

  try {
    const note = await fetchRemoteNote(supabase, currentUserId, noteId);
    if (note) await cachePrivateNote(note, currentUserId);
    else await deletePrivateNote(currentUserId, noteId);
    return note;
  } catch (error) {
    if (!isNetworkFailure(error)) throw error;
    const local = await readPrivateNote(currentUserId, noteId);
    if (!local) throw error;
    return local;
  }
}

export async function createNote(
  supabase: SupabaseClient,
  userId: string,
  input: NoteInput,
) {
  const note = await createRemoteNote(supabase, userId, input);
  if (note) await cachePrivateNote(note, userId);
  return note;
}

/** Persists a client-side enrichment (for example a new interpretation). */
export async function cacheNoteForOffline(
  note: Note,
  userId: string,
): Promise<void> {
  await cachePrivateNote(note, userId);
}

export async function deleteNote(
  supabase: SupabaseClient,
  noteId: string,
  userId: string,
): Promise<boolean> {
  const deleted = await deleteRemoteNote(supabase, noteId);
  if (deleted) await deletePrivateNote(userId, noteId);
  return deleted;
}
