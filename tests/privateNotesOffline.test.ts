import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { STORES, clearStore, readAll, writeRecord } from "@/lib/offline/db";
import { forgetDeviceCopies } from "@/lib/offline/forgetDevice";
import {
  cachePrivateNote,
  cachePrivateNotes,
  readPrivateNote,
  readPrivateNotes,
  type EncryptedPrivateNoteRecord,
} from "@/lib/offline/privateNotes";
import type { Note } from "@/lib/notes/repository";

const FIRST_USER = "11111111-1111-4111-8111-111111111111";
const SECOND_USER = "22222222-2222-4222-8222-222222222222";

function note(
  id: string,
  ownerId: string,
  originalText: string,
  overrides: Partial<Note> = {},
): Note {
  return {
    id,
    ownerId,
    originalText,
    originalLanguage: "fr",
    personalMeaning: "A meaning only its author should see",
    context: "Written in a private journal",
    tags: ["private"],
    privacy: "private",
    sourceKind: "manual",
    sourceName: null,
    sourceUrl: null,
    sourceNoteId: null,
    sourceOwnerId: null,
    sourceOwnerName: null,
    createdAt: "2026-09-11T12:00:00.000Z",
    updatedAt: "2026-09-11T12:00:00.000Z",
    interpretations: [],
    isSharedWithMe: false,
    ...overrides,
  };
}

async function rawNotes() {
  return readAll<EncryptedPrivateNoteRecord>(STORES.privateNotes);
}

beforeEach(async () => {
  await clearStore(STORES.privateNotes);
  await clearStore(STORES.privateNoteKeys);
  vi.stubGlobal("caches", {
    keys: async () => [],
    delete: async () => true,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("encrypted private-note mirror", () => {
  it("round-trips with AES-GCM while keeping plaintext and extractable keys off disk", async () => {
    const privateNote = note(
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      FIRST_USER,
      "Ce souvenir ne doit jamais être stocké en clair.",
    );

    await cachePrivateNote(privateNote, FIRST_USER);

    const records = await rawNotes();
    const keys = await readAll<{
      cryptoKey: CryptoKey;
      userId: string;
    }>(STORES.privateNoteKeys);

    expect(records).toHaveLength(1);
    expect(records[0]).not.toHaveProperty("originalText");
    expect(records[0]).not.toHaveProperty("note");
    expect(JSON.stringify(records[0])).not.toContain(privateNote.originalText);
    expect(Object.prototype.toString.call(records[0].iv)).toBe(
      "[object ArrayBuffer]",
    );
    expect(records[0].ciphertext.byteLength).toBeGreaterThan(16);

    expect(keys).toHaveLength(1);
    expect(keys[0].userId).toBe(FIRST_USER);
    expect(keys[0].cryptoKey.extractable).toBe(false);
    await expect(
      crypto.subtle.exportKey("raw", keys[0].cryptoKey),
    ).rejects.toThrow();

    await expect(readPrivateNote(FIRST_USER, privateNote.id)).resolves.toEqual(
      privateNote,
    );
  });

  it("keeps every account in a strict user-id namespace with a distinct key", async () => {
    const first = note(
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      FIRST_USER,
      "first user's private note",
    );
    const second = note(
      "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      SECOND_USER,
      "second user's private note",
    );

    await cachePrivateNotes([first], FIRST_USER, { replace: true });

    expect(await readPrivateNotes(SECOND_USER)).toEqual([]);

    await cachePrivateNotes([second], SECOND_USER, { replace: true });

    expect((await readPrivateNotes(FIRST_USER)).map((item) => item.id)).toEqual([
      first.id,
    ]);
    expect((await readPrivateNotes(SECOND_USER)).map((item) => item.id)).toEqual([
      second.id,
    ]);

    const keys = await readAll<{ userId: string; cryptoKey: CryptoKey }>(
      STORES.privateNoteKeys,
    );
    expect(keys.map((entry) => entry.userId).sort()).toEqual(
      [FIRST_USER, SECOND_USER].sort(),
    );
    expect(keys[0].cryptoKey).not.toBe(keys[1].cryptoKey);

    // Even if ciphertext is copied and relabelled into another namespace,
    // that user's distinct key plus AES additional data refuses to open it.
    const firstRecord = (await rawNotes()).find(
      (record) => record.userId === FIRST_USER,
    )!;
    await writeRecord(STORES.privateNotes, {
      ...firstRecord,
      key: JSON.stringify([SECOND_USER, first.id]),
      userId: SECOND_USER,
    });

    await expect(readPrivateNote(SECOND_USER, first.id)).resolves.toBeNull();
    await expect(readPrivateNote(FIRST_USER, first.id)).resolves.toEqual(first);
    await expect(readPrivateNote(SECOND_USER, second.id)).resolves.toEqual(second);
  });

  it("fails closed and deletes a ciphertext whose authenticated bytes were changed", async () => {
    const privateNote = note(
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      FIRST_USER,
      "tamper evident",
    );
    await cachePrivateNote(privateNote, FIRST_USER);

    const [record] = await rawNotes();
    const changed = new Uint8Array(record.ciphertext.slice(0));
    changed[0] ^= 0xff;
    await writeRecord(STORES.privateNotes, {
      ...record,
      ciphertext: changed.buffer,
    });

    await expect(readPrivateNote(FIRST_USER, privateNote.id)).resolves.toBeNull();
    expect(await rawNotes()).toEqual([]);
  });

  it("never retains another person's shared note as an offline private copy", async () => {
    const shared = note(
      "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      SECOND_USER,
      "revocable shared content",
      { privacy: "shared", isSharedWithMe: true },
    );

    await cachePrivateNote(shared, FIRST_USER);

    expect(await rawNotes()).toEqual([]);
    expect(await readPrivateNotes(FIRST_USER)).toEqual([]);
  });

  it("wipes both ciphertext and every decryption key when the device is forgotten", async () => {
    await cachePrivateNote(
      note(
        "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        FIRST_USER,
        "leave nothing behind",
      ),
      FIRST_USER,
    );
    await cachePrivateNote(
      note(
        "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        SECOND_USER,
        "not even another account's key",
      ),
      SECOND_USER,
    );

    expect(await rawNotes()).toHaveLength(2);
    expect(await readAll(STORES.privateNoteKeys)).toHaveLength(2);

    await forgetDeviceCopies();

    expect(await rawNotes()).toEqual([]);
    expect(await readAll(STORES.privateNoteKeys)).toEqual([]);
    expect(await readPrivateNotes(FIRST_USER)).toEqual([]);
  });
});
