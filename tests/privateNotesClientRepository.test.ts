import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { STORES, clearStore } from "@/lib/offline/db";
import type { Note } from "@/lib/notes/repository";

const remote = vi.hoisted(() => ({
  createNote: vi.fn(),
  deleteNote: vi.fn(),
  fetchNote: vi.fn(),
  fetchNotes: vi.fn(),
}));

vi.mock("@/lib/notes/repository", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/notes/repository")>();
  return {
    ...actual,
    createNote: remote.createNote,
    deleteNote: remote.deleteNote,
    fetchNote: remote.fetchNote,
    fetchNotes: remote.fetchNotes,
  };
});

const {
  createNote,
  deleteNote,
  fetchNote,
  fetchNotes,
} = await import("@/lib/notes/clientRepository");

const USER_ID = "11111111-1111-4111-8111-111111111111";
const supabase = {} as SupabaseClient;

function privateNote(id: string, text: string, createdAt: string): Note {
  return {
    id,
    ownerId: USER_ID,
    originalText: text,
    originalLanguage: "it",
    personalMeaning: "",
    context: "",
    tags: [],
    privacy: "private",
    sourceKind: "manual",
    sourceName: null,
    sourceUrl: null,
    sourceNoteId: null,
    sourceOwnerId: null,
    sourceOwnerName: null,
    createdAt,
    updatedAt: createdAt,
    interpretations: [],
    isSharedWithMe: false,
  };
}

beforeEach(async () => {
  remote.createNote.mockReset();
  remote.deleteNote.mockReset();
  remote.fetchNote.mockReset();
  remote.fetchNotes.mockReset();
  await clearStore(STORES.privateNotes);
  await clearStore(STORES.privateNoteKeys);
});

describe("private-note sync integration", () => {
  it("mirrors a successful server snapshot and falls back to it on network failure", async () => {
    const serverNotes = [
      privateNote(
        "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        "available after the tunnel",
        "2026-09-11T13:00:00.000Z",
      ),
    ];
    remote.fetchNotes.mockResolvedValueOnce(serverNotes);

    await expect(fetchNotes(supabase, USER_ID)).resolves.toEqual(serverNotes);

    remote.fetchNotes.mockRejectedValueOnce(new TypeError("Failed to fetch"));

    await expect(fetchNotes(supabase, USER_ID)).resolves.toEqual(serverNotes);
  });

  it("does not let the three-note Home preview erase an older complete snapshot", async () => {
    const newest = privateNote(
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "newest",
      "2026-09-11T13:00:00.000Z",
    );
    const older = privateNote(
      "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      "older",
      "2026-09-10T13:00:00.000Z",
    );

    remote.fetchNotes.mockResolvedValueOnce([newest, older]);
    await fetchNotes(supabase, USER_ID);

    remote.fetchNotes.mockResolvedValueOnce([newest]);
    await fetchNotes(supabase, USER_ID, { limit: 3 });

    remote.fetchNotes.mockRejectedValueOnce(new TypeError("offline"));
    await expect(fetchNotes(supabase, USER_ID)).resolves.toEqual([
      newest,
      older,
    ]);
  });

  it("keeps successful creates and deletes in step with the encrypted mirror", async () => {
    const saved = privateNote(
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "created online, readable offline",
      "2026-09-11T13:00:00.000Z",
    );
    remote.createNote.mockResolvedValue(saved);
    remote.deleteNote.mockResolvedValue(true);

    await expect(
      createNote(supabase, USER_ID, {
        originalText: saved.originalText,
        originalLanguage: saved.originalLanguage,
      }),
    ).resolves.toEqual(saved);

    remote.fetchNote.mockRejectedValueOnce(new TypeError("offline"));
    await expect(fetchNote(supabase, USER_ID, saved.id)).resolves.toEqual(saved);

    await expect(deleteNote(supabase, saved.id, USER_ID)).resolves.toBe(true);

    remote.fetchNote.mockRejectedValueOnce(new TypeError("offline"));
    await expect(fetchNote(supabase, USER_ID, saved.id)).rejects.toThrow(
      "offline",
    );
  });

  it("never disguises an authorization rejection as an offline cache hit", async () => {
    const cached = privateNote(
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      "must not bypass a revoked session",
      "2026-09-11T13:00:00.000Z",
    );
    remote.fetchNotes.mockResolvedValueOnce([cached]);
    await fetchNotes(supabase, USER_ID);

    const revoked = {
      code: "PGRST301",
      message: "JWT expired",
      status: 401,
    };
    remote.fetchNotes.mockRejectedValueOnce(revoked);

    await expect(fetchNotes(supabase, USER_ID)).rejects.toBe(revoked);
  });
});
