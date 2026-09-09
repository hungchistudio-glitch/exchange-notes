"use client";

import {
  STORES,
  appendRecord,
  clearStore,
  deleteRecord,
  readAll,
  readRecord,
  replaceAll,
  writeRecord,
} from "@/lib/offline/db";
import type { ByLanguage, LanguageCode } from "@/lib/languages";
import type { VocabularyItem } from "@/lib/types/app";
import type { LanguageMetadataSource } from "@/lib/vocabulary/languageIdentity";

/* =========================================================
   The reader's words, on the device

   Two jobs, and they are separate on purpose.

   The mirror is what the app *reads* when there is no network — a copy of
   what the server last said, kept whole rather than merged, because a
   partial copy that looks complete is worse than an old one that admits
   its date.

   The outbox is what the app *owes* the server — changes made while
   offline, in the order they were made, replayed when there is a
   connection again. Nothing is lost by closing the app: it is on disk.
   ========================================================= */

type MirrorRecord = { key: string; item: VocabularyItem };

const SYNCED_AT_KEY = "vocabulary:syncedAt";
const OWNER_KEY = "vocabulary:owner";

/**
 * Whose copy this is.
 *
 * A shared or handed-on phone is the ordinary case, not the exotic one,
 * and a mirror is read *before* anything has been authenticated — that is
 * the whole point of it. Without an owner recorded alongside, signing out
 * and signing in as somebody else showed the previous person's words on
 * the way in, from disk, before any check could run.
 *
 * The mirror is cleared on sign-out as well. This is the second lock,
 * for the sign-out that never completed.
 */
async function mirrorOwner(): Promise<string | null> {
  const record = await readRecord<{ userId: string }>(STORES.kv, OWNER_KEY);
  return record?.userId ?? null;
}

/** Rows the server has confirmed, as of the last sync, for this reader. */
export async function readMirror(userId: string): Promise<VocabularyItem[]> {
  if (!userId || (await mirrorOwner()) !== userId) return [];

  const records = await readAll<MirrorRecord>(STORES.vocabulary);

  return records
    .map((record) => record.item)
    .filter(Boolean)
    .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
}

export async function writeMirror(
  items: VocabularyItem[],
  userId: string,
): Promise<void> {
  await replaceAll(
    STORES.vocabulary,
    items.map((item) => ({ key: item.id, item })),
  );

  await writeRecord(STORES.kv, { key: OWNER_KEY, userId });

  await writeRecord(STORES.kv, {
    key: SYNCED_AT_KEY,
    at: new Date().toISOString(),
  });
}

/**
 * Removes every trace of this device's copy.
 *
 * Called on sign-out. The outbox goes too: a change made by someone who
 * has now left is not a change the next person's session should be made
 * to send, and the server would refuse it anyway under their own row
 * security — quietly, in the background, on a screen belonging to someone
 * who never made it.
 */
export async function forgetMirror(): Promise<void> {
  await clearStore(STORES.vocabulary);
  await clearStore(STORES.outbox);
  await deleteRecord(STORES.kv, OWNER_KEY);
  await deleteRecord(STORES.kv, SYNCED_AT_KEY);

  announceOutboxChange();
}
/* ---------- the outbox ---------- */

/**
 * The language half of a row, on its own.
 *
 * Separate from the content fields because correcting a language must not
 * touch the word: the two travel through different mutations, and a queued
 * correction replayed after a queued edit must not undo the edit.
 */
export type VocabularyLanguageFields = {
  word_language: LanguageCode;
  translation_language: LanguageCode;
  language_source: LanguageMetadataSource;
  language_confidence: number | null;
  needs_language_review: boolean;
  /**
   * The map, re-keyed to match. A correction that moved the headword from
   * `es` to `it` has to move the text with it, or the row goes on claiming
   * the word is the Spanish for itself. See relabelLanguage.
   */
  texts: ByLanguage;
  examples: ByLanguage;
};

export type PendingMutation =
  | { id?: number; kind: "insert"; at: string; item: VocabularyItem }
  | {
      id?: number;
      kind: "language";
      at: string;
      itemId: string;
      fields: VocabularyLanguageFields;
    }
  | {
      id?: number;
      kind: "status";
      at: string;
      itemId: string;
      status: VocabularyItem["status"];
    }
  | {
      id?: number;
      kind: "fields";
      at: string;
      itemId: string;
      fields: {
        word: string;
        translation: string;
        example_sentence: string | null;
        translated_example: string | null;
      };
    }
  | { id?: number; kind: "delete"; at: string; itemId: string };

/*
 * Distributive, unlike a bare Omit.
 *
 * PendingMutation is a union, and Omit collapses a union to the properties
 * its members have in common — which here is `kind` and nothing else, so
 * every caller would be told `itemId` does not exist. Mapping over the
 * union one member at a time keeps each variant's own fields.
 */
type NewMutation<T = PendingMutation> = T extends PendingMutation
  ? Omit<T, "id" | "at">
  : never;

/* ---------- knowing when the queue changes ---------- */

const outboxListeners = new Set<() => void>();

/**
 * Told whenever something is added to or taken off the queue.
 *
 * The alternative was a four-second poll, which is a timer running for as
 * long as a reader is offline — the exact situation where a phone is also
 * short of battery — and a count that is up to four seconds out of date on
 * a screen the reader is watching while they save something.
 */
export function subscribeToOutbox(listener: () => void): () => void {
  outboxListeners.add(listener);
  return () => {
    outboxListeners.delete(listener);
  };
}

function announceOutboxChange() {
  for (const listener of outboxListeners) listener();
}

export async function queueMutation(mutation: NewMutation): Promise<void> {
  await appendRecord(STORES.outbox, {
    ...mutation,
    at: new Date().toISOString(),
  });

  announceOutboxChange();
}

export async function readOutbox(): Promise<PendingMutation[]> {
  const queued = await readAll<PendingMutation>(STORES.outbox);

  // In the order they were made. Two edits to the same word have to land
  // the same way round on the server as they did on screen.
  return queued.sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
}

export async function forgetMutation(id: number): Promise<void> {
  await deleteRecord(STORES.outbox, id);
  announceOutboxChange();
}

/**
 * The mirror with everything the outbox has not delivered applied on top.
 *
 * This is what a screen should render offline. A word saved on a train is
 * in the list on the next screen, in the right place, with no hint that it
 * is waiting — because from the reader's side it is simply saved, and it
 * will be.
 */
export function applyPending(
  items: VocabularyItem[],
  pending: PendingMutation[],
): VocabularyItem[] {
  const byId = new Map(items.map((item) => [item.id, item]));

  for (const mutation of pending) {
    switch (mutation.kind) {
      case "insert":
        byId.set(mutation.item.id, mutation.item);
        break;

      case "status": {
        const item = byId.get(mutation.itemId);
        if (item) byId.set(item.id, { ...item, status: mutation.status });
        break;
      }

      case "fields": {
        const item = byId.get(mutation.itemId);
        if (item) byId.set(item.id, { ...item, ...mutation.fields });
        break;
      }

      case "language": {
        const item = byId.get(mutation.itemId);
        if (item) byId.set(item.id, { ...item, ...mutation.fields });
        break;
      }

      case "delete":
        byId.delete(mutation.itemId);
        break;
    }
  }

  return [...byId.values()].sort((a, b) =>
    (b.created_at ?? "").localeCompare(a.created_at ?? ""),
  );
}

/**
 * A word saved with no connection, as a row that can stand in for a real one.
 *
 * The id is a real uuid rather than a placeholder to be swapped later:
 * everything that references a word — a collection, a review, an edit made
 * a minute afterwards — references it by id, and an id that changes when
 * the network returns is an id that was wrong everywhere it was written
 * down. The server accepts it as the primary key when the insert replays.
 */
export function draftVocabularyItem(
  payload: Partial<VocabularyItem> & { user_id: string },
): VocabularyItem {
  const now = new Date().toISOString();

  return {
    id: crypto.randomUUID(),
    word: "",
    translation: "",
    texts: {},
    examples: {},
    category: "other",
    favorite: false,
    part_of_speech: null,
    example_sentence: null,
    translated_example: null,
    image_url: null,
    confidence: null,
    status: "new",
    created_at: now,
    updated_at: now,
    ...payload,
  } as VocabularyItem;
}

/* ---------- searching what is already here ---------- */

function normalise(text: string): string {
  return text.trim().toLowerCase();
}

/**
 * Finds a word among the ones already saved, in any language they are held in.
 *
 * The offline answer to "what does this mean". It cannot look up something
 * new — that needs a model, and a model needs a connection — but a reader
 * standing in front of a menu abroad is usually reaching for a word they
 * have met before, and this finds it without asking anyone.
 *
 * Exact matches first, then words that start with the query, then words
 * that contain it. A prefix match is almost always what was meant; a
 * contains match is a fallback that stops a long word from being
 * unfindable by its middle.
 */
export function searchLocal(
  items: VocabularyItem[],
  query: string,
): VocabularyItem[] {
  const needle = normalise(query);
  if (!needle) return [];

  const exact: VocabularyItem[] = [];
  const prefix: VocabularyItem[] = [];
  const contains: VocabularyItem[] = [];

  for (const item of items) {
    const texts = Object.values(item.texts ?? {}).map((value) =>
      normalise(String(value ?? "")),
    );

    const candidates = [
      ...texts,
      normalise(item.word ?? ""),
      normalise(item.translation ?? ""),
    ].filter(Boolean);

    if (candidates.some((text) => text === needle)) exact.push(item);
    else if (candidates.some((text) => text.startsWith(needle))) prefix.push(item);
    else if (candidates.some((text) => text.includes(needle))) contains.push(item);
  }

  return [...exact, ...prefix, ...contains];
}
