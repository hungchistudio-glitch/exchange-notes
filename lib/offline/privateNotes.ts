"use client";

import {
  STORES,
  clearStore,
  deleteRecord,
  readAll,
  readRecord,
  replaceMatching,
  writeRecord,
} from "@/lib/offline/db";
import { isLanguageCode } from "@/lib/languages";
import type { Note, NoteInterpretation } from "@/lib/notes/repository";

/* =========================================================
   Private notes at rest

   A note is useful on a train only if closing the app does not erase it, but
   it is also some of the most personal text in the product. The offline copy
   therefore never stores a Note object. It stores only AES-GCM ciphertext,
   a fresh IV, and the minimum routing metadata IndexedDB needs.

   Every user has a different, non-extractable CryptoKey. The user id and note
   id are also authenticated as AES additional data, so moving a ciphertext
   into another account's namespace or under another note id makes decryption
   fail instead of revealing or mislabelling content.

   This protects data at rest and prevents accidental cross-account reads. It
   cannot protect against JavaScript already executing with this origin's
   privileges; preventing that remains the job of CSP, dependency hygiene and
   the app's XSS boundary.
   ========================================================= */

export const PRIVATE_NOTE_SCHEMA_VERSION = 1 as const;

const ALGORITHM = "AES-GCM" as const;
const KEY_LENGTH = 256;
const IV_BYTES = 12;

type StoredPrivateNoteKey = {
  key: string;
  userId: string;
  schemaVersion: typeof PRIVATE_NOTE_SCHEMA_VERSION;
  algorithm: typeof ALGORITHM;
  cryptoKey: CryptoKey;
};

export type EncryptedPrivateNoteRecord = {
  key: string;
  userId: string;
  noteId: string;
  schemaVersion: typeof PRIVATE_NOTE_SCHEMA_VERSION;
  algorithm: typeof ALGORITHM;
  iv: ArrayBuffer;
  ciphertext: ArrayBuffer;
};

const keyCreationTasks = new Map<string, Promise<CryptoKey | null>>();
let storageGeneration = 0;
const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

function webCrypto(): Crypto | null {
  const candidate = globalThis.crypto;
  return candidate?.subtle && typeof candidate.getRandomValues === "function"
    ? candidate
    : null;
}

function recordKey(userId: string, noteId: string): string {
  // JSON framing avoids delimiter collisions for future non-UUID identities.
  return JSON.stringify([userId, noteId]);
}

function additionalData(userId: string, noteId: string): Uint8Array<ArrayBuffer> {
  return encoder.encode(
    JSON.stringify([
      "exchange-notes-private-note",
      PRIVATE_NOTE_SCHEMA_VERSION,
      userId,
      noteId,
    ]),
  );
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isArrayBuffer(value: unknown): value is ArrayBuffer {
  // Web Crypto and the page can live in different realms (notably WebViews
  // and test DOMs), so `instanceof ArrayBuffer` rejects a perfectly valid
  // structured clone. The intrinsic tag and byteLength survive that boundary.
  return (
    typeof value === "object" &&
    value !== null &&
    Object.prototype.toString.call(value) === "[object ArrayBuffer]" &&
    typeof (value as ArrayBuffer).byteLength === "number"
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isInterpretation(
  value: unknown,
  noteId: string,
): value is NoteInterpretation {
  if (!isObject(value)) return false;

  return (
    typeof value.id === "string" &&
    value.noteId === noteId &&
    isLanguageCode(value.targetLanguage) &&
    typeof value.naturalTranslation === "string" &&
    typeof value.meaning === "string" &&
    isStringArray(value.localExpressions) &&
    typeof value.tone === "string" &&
    typeof value.culturalNuance === "string" &&
    isStringArray(value.usageExamples) &&
    isStringArray(value.warnings) &&
    (typeof value.model === "string" || value.model === null) &&
    typeof value.createdAt === "string"
  );
}

function isPrivateNote(
  value: unknown,
  userId: string,
  noteId: string,
): value is Note {
  if (!isObject(value)) return false;

  return (
    value.id === noteId &&
    value.ownerId === userId &&
    typeof value.originalText === "string" &&
    isLanguageCode(value.originalLanguage) &&
    typeof value.personalMeaning === "string" &&
    typeof value.context === "string" &&
    isStringArray(value.tags) &&
    value.privacy === "private" &&
    (value.sourceKind === "manual" ||
      value.sourceKind === "search" ||
      value.sourceKind === "news" ||
      value.sourceKind === "shared") &&
    (typeof value.sourceName === "string" || value.sourceName === null) &&
    (typeof value.sourceUrl === "string" || value.sourceUrl === null) &&
    (typeof value.sourceNoteId === "string" || value.sourceNoteId === null) &&
    (typeof value.sourceOwnerId === "string" || value.sourceOwnerId === null) &&
    (typeof value.sourceOwnerName === "string" ||
      value.sourceOwnerName === null) &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string" &&
    Array.isArray(value.interpretations) &&
    value.interpretations.every((item) => isInterpretation(item, noteId)) &&
    value.isSharedWithMe === false
  );
}

function mayBeCached(note: Note, userId: string): boolean {
  // Shared rows can be revoked by their owner while this device is offline.
  // Only an owner's genuinely private notes belong in this long-lived mirror.
  return (
    Boolean(userId) &&
    note.ownerId === userId &&
    note.privacy === "private" &&
    !note.isSharedWithMe
  );
}

function isUsableKey(value: unknown, userId: string): value is StoredPrivateNoteKey {
  if (!isObject(value) || !isObject(value.cryptoKey)) return false;

  const key = value.cryptoKey as unknown as CryptoKey;
  const algorithm = key.algorithm as AesKeyAlgorithm | undefined;

  return (
    value.key === userId &&
    value.userId === userId &&
    value.schemaVersion === PRIVATE_NOTE_SCHEMA_VERSION &&
    value.algorithm === ALGORITHM &&
    key.type === "secret" &&
    key.extractable === false &&
    algorithm?.name === ALGORITHM &&
    algorithm.length === KEY_LENGTH &&
    key.usages.includes("encrypt") &&
    key.usages.includes("decrypt")
  );
}

function isEncryptedRecord(
  value: unknown,
  userId?: string,
  noteId?: string,
): value is EncryptedPrivateNoteRecord {
  if (!isObject(value)) return false;

  return (
    typeof value.key === "string" &&
    typeof value.userId === "string" &&
    typeof value.noteId === "string" &&
    (!userId || value.userId === userId) &&
    (!noteId || value.noteId === noteId) &&
    value.key === recordKey(value.userId, value.noteId) &&
    value.schemaVersion === PRIVATE_NOTE_SCHEMA_VERSION &&
    value.algorithm === ALGORITHM &&
    isArrayBuffer(value.iv) &&
    value.iv.byteLength === IV_BYTES &&
    isArrayBuffer(value.ciphertext) &&
    value.ciphertext.byteLength > 16
  );
}

async function replaceUserRecords(
  userId: string,
  records: EncryptedPrivateNoteRecord[],
): Promise<void> {
  await replaceMatching(
    STORES.privateNotes,
    records.map((record) => ({ ...record })),
    (value) => isObject(value) && value.userId === userId,
  );
}

async function removeUserRecords(userId: string): Promise<void> {
  await replaceUserRecords(userId, []);
}

async function readExistingKey(userId: string): Promise<CryptoKey | null> {
  if (!userId || !webCrypto()) return null;

  const stored = await readRecord<StoredPrivateNoteKey>(
    STORES.privateNoteKeys,
    userId,
  );

  if (isUsableKey(stored, userId)) return stored.cryptoKey;

  // Ciphertext without its authentic key can never be recovered. Purging it
  // prevents a later replacement key from repeatedly trying to open it.
  await Promise.all([
    deleteRecord(STORES.privateNoteKeys, userId),
    removeUserRecords(userId),
  ]);
  return null;
}

async function createAndPersistKey(
  userId: string,
  generation: number,
): Promise<CryptoKey | null> {
  const cryptoApi = webCrypto();
  if (!userId || !cryptoApi) return null;

  try {
    const generated = (await cryptoApi.subtle.generateKey(
      { name: ALGORITHM, length: KEY_LENGTH },
      false,
      ["encrypt", "decrypt"],
    )) as CryptoKey;

    const stored: StoredPrivateNoteKey = {
      key: userId,
      userId,
      schemaVersion: PRIVATE_NOTE_SCHEMA_VERSION,
      algorithm: ALGORITHM,
      cryptoKey: generated,
    };

    await writeRecord(STORES.privateNoteKeys, { ...stored });

    // IndexedDB implementations that cannot clone CryptoKey objects fail
    // closed in the primitive. A read-back proves this key will survive the
    // app closing before any note is encrypted with it.
    const persisted = await readRecord<StoredPrivateNoteKey>(
      STORES.privateNoteKeys,
      userId,
    );

    if (generation !== storageGeneration) {
      await Promise.all([
        deleteRecord(STORES.privateNoteKeys, userId),
        removeUserRecords(userId),
      ]);
      return null;
    }
    return isUsableKey(persisted, userId) ? persisted.cryptoKey : null;
  } catch {
    return null;
  }
}

async function ensureKey(userId: string): Promise<CryptoKey | null> {
  const current = await readExistingKey(userId);
  if (current) return current;

  const existingTask = keyCreationTasks.get(userId);
  if (existingTask) return existingTask;

  const task = createAndPersistKey(userId, storageGeneration).finally(() => {
    keyCreationTasks.delete(userId);
  });
  keyCreationTasks.set(userId, task);
  return task;
}

async function encryptNote(
  key: CryptoKey,
  note: Note,
  userId: string,
): Promise<EncryptedPrivateNoteRecord | null> {
  const cryptoApi = webCrypto();
  if (!cryptoApi || !mayBeCached(note, userId)) return null;

  try {
    const iv = cryptoApi.getRandomValues(new Uint8Array(IV_BYTES));
    const ciphertext = await cryptoApi.subtle.encrypt(
      {
        name: ALGORITHM,
        iv,
        additionalData: additionalData(userId, note.id),
        tagLength: 128,
      },
      key,
      encoder.encode(JSON.stringify(note)),
    );

    return {
      key: recordKey(userId, note.id),
      userId,
      noteId: note.id,
      schemaVersion: PRIVATE_NOTE_SCHEMA_VERSION,
      algorithm: ALGORITHM,
      iv: iv.buffer.slice(0),
      ciphertext,
    };
  } catch {
    return null;
  }
}

async function decryptNote(
  key: CryptoKey,
  record: EncryptedPrivateNoteRecord,
  userId: string,
): Promise<Note | null> {
  const cryptoApi = webCrypto();
  if (!cryptoApi || !isEncryptedRecord(record, userId)) return null;

  try {
    const plaintext = await cryptoApi.subtle.decrypt(
      {
        name: ALGORITHM,
        iv: new Uint8Array(record.iv),
        additionalData: additionalData(userId, record.noteId),
        tagLength: 128,
      },
      key,
      record.ciphertext,
    );
    const parsed: unknown = JSON.parse(decoder.decode(plaintext));
    return isPrivateNote(parsed, userId, record.noteId) ? parsed : null;
  } catch {
    return null;
  }
}

/** Reads only the requested user's authenticated, private note records. */
export async function readPrivateNotes(userId: string): Promise<Note[]> {
  const generation = storageGeneration;
  const key = await readExistingKey(userId);
  if (!key) return [];

  const stored = await readAll<unknown>(STORES.privateNotes);
  const records = stored.filter((value): value is EncryptedPrivateNoteRecord =>
    isEncryptedRecord(value, userId),
  );

  const opened = await Promise.all(
    records.map(async (record) => ({
      record,
      note: await decryptNote(key, record, userId),
    })),
  );

  // Authentication or schema failure is never converted into partial text.
  // The corrupt record is discarded and every other valid note remains usable.
  await Promise.all(
    opened
      .filter(({ note }) => note === null)
      .map(({ record }) => deleteRecord(STORES.privateNotes, record.key)),
  );

  if (generation !== storageGeneration) return [];

  return opened
    .flatMap(({ note }) => (note ? [note] : []))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function readPrivateNote(
  userId: string,
  noteId: string,
): Promise<Note | null> {
  if (!userId || !noteId) return null;

  const generation = storageGeneration;

  const [key, stored] = await Promise.all([
    readExistingKey(userId),
    readRecord<unknown>(STORES.privateNotes, recordKey(userId, noteId)),
  ]);
  if (!key || !isEncryptedRecord(stored, userId, noteId)) return null;

  const note = await decryptNote(key, stored, userId);
  if (!note) await deleteRecord(STORES.privateNotes, stored.key);
  return generation === storageGeneration ? note : null;
}

/**
 * Mirrors a server snapshot. `replace` is reserved for the complete library;
 * the three-note Home preview may only upsert or it would erase older notes.
 */
export async function cachePrivateNotes(
  notes: Note[],
  userId: string,
  options: { replace?: boolean } = {},
): Promise<void> {
  if (!userId) return;

  const generation = storageGeneration;

  const eligible = notes.filter((note) => mayBeCached(note, userId));

  if (eligible.length === 0) {
    if (options.replace) await removeUserRecords(userId);
    return;
  }

  const key = await ensureKey(userId);
  if (!key) return;

  const encrypted = await Promise.all(
    eligible.map((note) => encryptNote(key, note, userId)),
  );
  const records = encrypted.filter(
    (record): record is EncryptedPrivateNoteRecord => record !== null,
  );

  // A partial encryption pass must not replace the last known-good snapshot.
  if (records.length !== eligible.length) return;
  if (generation !== storageGeneration) return;

  if (options.replace) {
    await replaceUserRecords(userId, records);
  } else {
    for (const record of records) {
      await writeRecord(STORES.privateNotes, { ...record });
    }
  }

  // A sign-out can race a slow crypto/storage operation. If it began while
  // this write was in flight, remove anything the stale operation landed.
  if (generation !== storageGeneration) {
    await removeUserRecords(userId);
  }
}

export async function cachePrivateNote(note: Note, userId: string): Promise<void> {
  if (!mayBeCached(note, userId)) {
    if (note.id) await deletePrivateNote(userId, note.id);
    return;
  }

  await cachePrivateNotes([note], userId);
}

export async function deletePrivateNote(
  userId: string,
  noteId: string,
): Promise<void> {
  if (!userId || !noteId) return;
  await deleteRecord(STORES.privateNotes, recordKey(userId, noteId));
}

/** Clears every user's private note ciphertext and every decryption key. */
export async function forgetPrivateNotes(): Promise<void> {
  storageGeneration += 1;
  keyCreationTasks.clear();
  await Promise.all([
    clearStore(STORES.privateNotes),
    clearStore(STORES.privateNoteKeys),
  ]);
}
