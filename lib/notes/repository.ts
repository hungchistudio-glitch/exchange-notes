import type { SupabaseClient } from "@supabase/supabase-js";

export type Note = {
  id: string;
  english: string;
  chinese: string;
  createdAt: string;
};

type NoteInput = {
  english: string;
  chinese: string;
  sourceName?: string | null;
  sourceUrl?: string | null;
};

type NoteRow = {
  id: string;
  english: string;
  chinese: string;
  created_at: string | null;
};

/**
 * Where notes lived before they were account-backed. Kept only so existing
 * installs can hand their notes over once; nothing writes here any more.
 */
const LEGACY_STORAGE_KEY = "exchange-notes-home-notes";

/** Set once a device's legacy notes have been handed over, so it happens once. */
const LEGACY_IMPORTED_KEY = "exchange-notes-legacy-notes-imported";

function toNote(row: NoteRow): Note {
  return {
    id: row.id,
    english: row.english,
    chinese: row.chinese,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

function readLegacyNotes(): Note[] {
  try {
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item): item is Note =>
        Boolean(item)
        && typeof item === "object"
        && typeof (item as Note).id === "string"
        && typeof (item as Note).english === "string"
        && typeof (item as Note).chinese === "string",
    );
  } catch {
    return [];
  }
}

/**
 * Moves any notes this device saved before notes were account-backed.
 *
 * Runs once per device. The local copy is deliberately left in place after a
 * successful import: it costs a few kilobytes and means a failure halfway
 * through, or a user who later signs in as someone else, has not destroyed
 * anything. Only the flag is written.
 */
export async function importLegacyNotes(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  if (typeof window === "undefined") return 0;

  try {
    if (window.localStorage.getItem(LEGACY_IMPORTED_KEY) === "1") return 0;

    const legacy = readLegacyNotes();

    if (legacy.length === 0) {
      window.localStorage.setItem(LEGACY_IMPORTED_KEY, "1");
      return 0;
    }

    const { error } = await supabase.from("notes").insert(
      legacy.map((note) => ({
        user_id: userId,
        english: note.english,
        chinese: note.chinese,
        created_at: note.createdAt,
      })),
    );

    // Leave the flag unset on failure so the next launch tries again rather
    // than silently abandoning the notes.
    if (error) return 0;

    window.localStorage.setItem(LEGACY_IMPORTED_KEY, "1");
    return legacy.length;
  } catch {
    return 0;
  }
}

export async function fetchNotes(supabase: SupabaseClient): Promise<Note[]> {
  const { data, error } = await supabase
    .from("notes")
    .select("id, english, chinese, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error || !data) return [];

  return (data as NoteRow[]).map(toNote);
}

export async function createNote(
  supabase: SupabaseClient,
  userId: string,
  input: NoteInput,
): Promise<Note | null> {
  const { data, error } = await supabase
    .from("notes")
    .insert({
      user_id: userId,
      english: input.english,
      chinese: input.chinese,
      source_name: input.sourceName ?? null,
      source_url: input.sourceUrl ?? null,
    })
    .select("id, english, chinese, created_at")
    .single();

  if (error || !data) return null;

  return toNote(data as NoteRow);
}

export async function deleteNote(
  supabase: SupabaseClient,
  noteId: string,
): Promise<boolean> {
  const { error } = await supabase.from("notes").delete().eq("id", noteId);
  return !error;
}
