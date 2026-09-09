import type { SupabaseClient } from "@supabase/supabase-js";

import type { LanguageCode } from "@/lib/languages";

export type NoteSourceKind = "manual" | "search" | "news" | "shared";
export type NotePrivacy = "private" | "shared";

export type NoteInterpretation = {
  id: string;
  noteId: string;
  targetLanguage: LanguageCode;
  naturalTranslation: string;
  meaning: string;
  localExpressions: string[];
  tone: string;
  culturalNuance: string;
  usageExamples: string[];
  warnings: string[];
  model: string | null;
  createdAt: string;
};

export type Note = {
  id: string;
  ownerId: string;
  originalText: string;
  originalLanguage: LanguageCode;
  personalMeaning: string;
  context: string;
  tags: string[];
  privacy: NotePrivacy;
  sourceKind: NoteSourceKind;
  sourceName: string | null;
  sourceUrl: string | null;
  sourceNoteId: string | null;
  sourceOwnerId: string | null;
  sourceOwnerName: string | null;
  createdAt: string;
  updatedAt: string;
  interpretations: NoteInterpretation[];
  isSharedWithMe: boolean;
};

export type NoteInput = {
  originalText: string;
  originalLanguage: LanguageCode;
  personalMeaning?: string;
  context?: string;
  tags?: string[];
  privacy?: NotePrivacy;
  sourceKind?: NoteSourceKind;
  sourceName?: string | null;
  sourceUrl?: string | null;
  sourceNoteId?: string | null;
  sourceOwnerId?: string | null;
  sourceOwnerName?: string | null;
};

export type NoteShare = {
  id: string;
  noteId: string;
  ownerId: string;
  recipientId: string;
  permission: "view";
  createdAt: string;
  revokedAt: string | null;
};

type InterpretationRow = {
  id: string;
  note_id: string;
  target_language: LanguageCode;
  natural_translation: string;
  meaning: string | null;
  local_expressions: unknown;
  tone: string | null;
  cultural_nuance: string | null;
  usage_examples: unknown;
  warnings: unknown;
  model: string | null;
  created_at: string | null;
};

type NoteRow = {
  id: string;
  user_id: string;
  original_text: string | null;
  original_language: LanguageCode | null;
  english: string | null;
  chinese: string | null;
  personal_meaning: string | null;
  context: string | null;
  tags: string[] | null;
  privacy: NotePrivacy | null;
  source_kind: NoteSourceKind | null;
  source_name: string | null;
  source_url: string | null;
  source_note_id: string | null;
  source_owner_id: string | null;
  source_owner_name: string | null;
  created_at: string | null;
  updated_at: string | null;
  note_interpretations?: InterpretationRow[] | null;
};

type ShareRow = {
  id: string;
  note_id: string;
  owner_id: string;
  recipient_id: string;
  permission: "view";
  created_at: string;
  revoked_at: string | null;
};

const NOTE_SELECT = [
  "id",
  "user_id",
  "original_text",
  "original_language",
  "english",
  "chinese",
  "personal_meaning",
  "context",
  "tags",
  "privacy",
  "source_kind",
  "source_name",
  "source_url",
  "source_note_id",
  "source_owner_id",
  "source_owner_name",
  "created_at",
  "updated_at",
  "note_interpretations(id,note_id,target_language,natural_translation,meaning,local_expressions,tone,cultural_nuance,usage_examples,warnings,model,created_at)",
].join(",");

const LEGACY_STORAGE_KEY = "exchange-notes-home-notes";
const LEGACY_IMPORTED_KEY = "exchange-notes-legacy-notes-imported";

function strings(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function toInterpretation(row: InterpretationRow): NoteInterpretation {
  return {
    id: row.id,
    noteId: row.note_id,
    targetLanguage: row.target_language,
    naturalTranslation: row.natural_translation,
    meaning: row.meaning ?? "",
    localExpressions: strings(row.local_expressions),
    tone: row.tone ?? "",
    culturalNuance: row.cultural_nuance ?? "",
    usageExamples: strings(row.usage_examples),
    warnings: strings(row.warnings),
    model: row.model,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

function toNote(row: NoteRow, currentUserId: string): Note {
  const fallbackText = row.english?.trim() || row.chinese?.trim() || "";
  const fallbackLanguage: LanguageCode = row.english?.trim() ? "en" : "zh-TW";

  return {
    id: row.id,
    ownerId: row.user_id,
    originalText: row.original_text?.trim() || fallbackText,
    originalLanguage: row.original_language ?? fallbackLanguage,
    personalMeaning: row.personal_meaning ?? "",
    context: row.context ?? "",
    tags: row.tags ?? [],
    privacy: row.privacy ?? "private",
    sourceKind: row.source_kind ?? "manual",
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    sourceNoteId: row.source_note_id,
    sourceOwnerId: row.source_owner_id,
    sourceOwnerName: row.source_owner_name,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? row.created_at ?? new Date().toISOString(),
    interpretations: (row.note_interpretations ?? []).map(toInterpretation),
    isSharedWithMe: row.user_id !== currentUserId,
  };
}

function readLegacyNotes(): Array<{
  id: string;
  english: string;
  chinese: string;
  createdAt: string;
}> {
  try {
    const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item): item is {
      id: string;
      english: string;
      chinese: string;
      createdAt: string;
    } => Boolean(
      item &&
      typeof item === "object" &&
      typeof (item as { id?: unknown }).id === "string" &&
      typeof (item as { english?: unknown }).english === "string" &&
      typeof (item as { chinese?: unknown }).chinese === "string" &&
      typeof (item as { createdAt?: unknown }).createdAt === "string",
    ));
  } catch {
    return [];
  }
}

/** Imports old device-only notes once, leaving the source copy untouched. */
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
        original_text: note.english.trim() || note.chinese.trim(),
        original_language: note.english.trim() ? "en" : "zh-TW",
        created_at: note.createdAt,
      })),
    );

    if (error) return 0;
    window.localStorage.setItem(LEGACY_IMPORTED_KEY, "1");
    return legacy.length;
  } catch {
    return 0;
  }
}

export async function fetchNotes(
  supabase: SupabaseClient,
  currentUserId: string,
  options: { limit?: number } = {},
): Promise<Note[]> {
  const { data, error } = await supabase
    .from("notes")
    .select(NOTE_SELECT)
    .order("created_at", { ascending: false })
    .limit(options.limit ?? 200);

  if (error) throw error;
  const notes = ((data ?? []) as unknown as NoteRow[]).map((row) =>
    toNote(row, currentUserId),
  );

  return hydrateSharedOwnerNames(supabase, notes);
}

export async function fetchNote(
  supabase: SupabaseClient,
  currentUserId: string,
  noteId: string,
): Promise<Note | null> {
  const { data, error } = await supabase
    .from("notes")
    .select(NOTE_SELECT)
    .eq("id", noteId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return (await hydrateSharedOwnerNames(
    supabase,
    [toNote(data as unknown as NoteRow, currentUserId)],
  ))[0] ?? null;
}

async function hydrateSharedOwnerNames(
  supabase: SupabaseClient,
  notes: Note[],
): Promise<Note[]> {
  const ownerIds = [...new Set(
    notes.filter((note) => note.isSharedWithMe).map((note) => note.ownerId),
  )];
  if (ownerIds.length === 0) return notes;

  const { data } = await supabase
    .from("public_profiles")
    .select("id,display_name,exchange_id")
    .in("id", ownerIds);
  const names = new Map(
    ((data ?? []) as Array<{ id: string; display_name: string | null; exchange_id: string }>).map(
      (profile) => [profile.id, profile.display_name?.trim() || profile.exchange_id],
    ),
  );

  return notes.map((note) => note.isSharedWithMe
    ? { ...note, sourceOwnerName: names.get(note.ownerId) ?? note.sourceOwnerName }
    : note);
}

export async function createNote(
  supabase: SupabaseClient,
  userId: string,
  input: NoteInput,
): Promise<Note | null> {
  const text = input.originalText.trim();
  if (!text) return null;

  const { data, error } = await supabase
    .from("notes")
    .insert({
      user_id: userId,
      original_text: text,
      original_language: input.originalLanguage,
      english: input.originalLanguage === "en" ? text : "",
      chinese: input.originalLanguage === "zh-TW" ? text : "",
      personal_meaning: input.personalMeaning?.trim() || null,
      context: input.context?.trim() || null,
      tags: input.tags ?? [],
      privacy: input.privacy ?? "private",
      source_kind: input.sourceKind ?? "manual",
      source_name: input.sourceName ?? null,
      source_url: input.sourceUrl ?? null,
      source_note_id: input.sourceNoteId ?? null,
      source_owner_id: input.sourceOwnerId ?? null,
      source_owner_name: input.sourceOwnerName ?? null,
    })
    .select(NOTE_SELECT)
    .single();

  if (error || !data) return null;
  return toNote(data as unknown as NoteRow, userId);
}

export async function deleteNote(
  supabase: SupabaseClient,
  noteId: string,
): Promise<boolean> {
  const { error } = await supabase.from("notes").delete().eq("id", noteId);
  return !error;
}

export function searchNotes(notes: Note[], query: string): Note[] {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return notes;

  return notes.filter((note) => {
    const values = [
      note.originalText,
      note.personalMeaning,
      note.context,
      note.sourceName ?? "",
      ...note.tags,
      ...note.interpretations.flatMap((interpretation) => [
        interpretation.naturalTranslation,
        interpretation.meaning,
        interpretation.tone,
        interpretation.culturalNuance,
        ...interpretation.localExpressions,
        ...interpretation.usageExamples,
        ...interpretation.warnings,
      ]),
    ];

    return values.some((value) => value.toLocaleLowerCase().includes(needle));
  });
}

export async function fetchNoteShares(
  supabase: SupabaseClient,
  noteId: string,
): Promise<NoteShare[]> {
  const { data, error } = await supabase
    .from("note_shares")
    .select("id,note_id,owner_id,recipient_id,permission,created_at,revoked_at")
    .eq("note_id", noteId)
    .is("revoked_at", null);

  if (error) throw error;
  return ((data ?? []) as ShareRow[]).map((row) => ({
    id: row.id,
    noteId: row.note_id,
    ownerId: row.owner_id,
    recipientId: row.recipient_id,
    permission: row.permission,
    createdAt: row.created_at,
    revokedAt: row.revoked_at,
  }));
}

export async function shareNote(
  supabase: SupabaseClient,
  noteId: string,
  ownerId: string,
  recipientId: string,
): Promise<boolean> {
  const { error } = await supabase.from("note_shares").upsert(
    {
      note_id: noteId,
      owner_id: ownerId,
      recipient_id: recipientId,
      permission: "view",
      revoked_at: null,
    },
    { onConflict: "note_id,recipient_id" },
  );

  return !error;
}

export async function revokeNoteShare(
  supabase: SupabaseClient,
  noteId: string,
  recipientId: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("note_shares")
    .update({ revoked_at: new Date().toISOString() })
    .eq("note_id", noteId)
    .eq("recipient_id", recipientId);

  return !error;
}
