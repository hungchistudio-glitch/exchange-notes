"use client";

import {
  STORES,
  appendRecord,
  deleteRecord,
  readAll,
  readRecord,
  replaceAll,
  writeRecord,
} from "@/lib/offline/db";
import type { VocabularyItem } from "@/lib/types/app";

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

/** Rows the server has confirmed, as of the last sync. */
export async function readMirror(): Promise<VocabularyItem[]> {
  const records = await readAll<MirrorRecord>(STORES.vocabulary);

  return records
    .map((record) => record.item)
    .filter(Boolean)
    .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
}

export async function writeMirror(items: VocabularyItem[]): Promise<void> {
  await replaceAll(
    STORES.vocabulary,
    items.map((item) => ({ key: item.id, item })),
  );

  await writeRecord(STORES.kv, {
    key: SYNCED_AT_KEY,
    at: new Date().toISOString(),
  });
}

/** When the mirror was last known to match the server, if ever. */
export async function mirrorSyncedAt(): Promise<string | null> {
  const record = await readRecord<{ at: string }>(STORES.kv, SYNCED_AT_KEY);
  return record?.at ?? null;
}

/* ---------- the outbox ---------- */

export type PendingMutation =
  | { id?: number; kind: "insert"; at: string; item: VocabularyItem }
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

export async function queueMutation(mutation: NewMutation): Promise<void> {
  await appendRecord(STORES.outbox, {
    ...mutation,
    at: new Date().toISOString(),
  });
}

export async function readOutbox(): Promise<PendingMutation[]> {
  const queued = await readAll<PendingMutation>(STORES.outbox);

  // In the order they were made. Two edits to the same word have to land
  // the same way round on the server as they did on screen.
  return queued.sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
}

export async function forgetMutation(id: number): Promise<void> {
  await deleteRecord(STORES.outbox, id);
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
