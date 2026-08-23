"use client";

/* =========================================================
   The local copy

   Exchange Notes is used on trips, which is exactly where there is no
   signal — and until now that meant an app shell with nothing in it. Every
   screen read straight from Supabase over the network, and the service
   worker deliberately did not cache those calls, so offline the app opened
   and then had nothing to show.

   This is the store underneath the fix. It is a mirror, not a second source
   of truth: the server still owns the data, and everything here is either a
   copy of what the server said or a change waiting to be told to it.

   Written against raw IndexedDB rather than a wrapper library. The surface
   used is four calls wide, and a dependency that ships its own transaction
   semantics is a larger thing to reason about than the thirty lines below.
   ========================================================= */

const DB_NAME = "exchange-notes";

/*
 * Bumped when a store is added. Never renumber: the browser runs the
 * upgrade path from whatever version this device already has, so the
 * handler below has to be safe to run against every earlier one — which is
 * why it creates stores conditionally rather than assuming a starting point.
 */
const DB_VERSION = 1;

export const STORES = {
  /** The reader's own words, keyed by row id. */
  vocabulary: "vocabulary",
  /** Changes made offline, waiting to be sent. */
  outbox: "outbox",
  /** IPA and zhuyin, keyed `${language}:${text}`. */
  phonetics: "phonetics",
  /** Card text in other languages, keyed `${from}>${to}:${text}`. */
  translations: "translations",
  /** Everything singular: the last news batch, sync timestamps. */
  kv: "kv",
} as const;

export type StoreName = (typeof STORES)[keyof typeof STORES];

let opening: Promise<IDBDatabase | null> | null = null;

export function indexedDbAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

/**
 * The database, opened once and shared.
 *
 * Resolves to null rather than throwing where IndexedDB is unavailable or
 * refuses to open — private windows and locked-down browsers both do this.
 * Every caller treats null as "no local copy", which is the state the app
 * was in before any of this existed, so nothing here can make things worse
 * than they already were.
 */
export function openDb(): Promise<IDBDatabase | null> {
  if (!indexedDbAvailable()) return Promise.resolve(null);

  opening ??= new Promise<IDBDatabase | null>((resolve) => {
    let request: IDBOpenDBRequest;

    try {
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      resolve(null);
      return;
    }

    request.onupgradeneeded = () => {
      const db = request.result;

      for (const name of Object.values(STORES)) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(
            name,
            name === STORES.outbox
              ? { keyPath: "id", autoIncrement: true }
              : { keyPath: "key" },
          );
        }
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });

  return opening;
}

function run<T>(
  store: IDBObjectStore,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | null> {
  return new Promise((resolve) => {
    let request: IDBRequest<T>;

    try {
      request = action(store);
    } catch {
      resolve(null);
      return;
    }

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
}

async function withStore<T>(
  name: StoreName,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | null> {
  const db = await openDb();
  if (!db) return null;

  try {
    return await run(db.transaction(name, mode).objectStore(name), action);
  } catch {
    // A transaction that cannot even be opened — the store is missing, or
    // the database was deleted under us. Same answer as no database at all.
    return null;
  }
}

/** One record, or null if it is not held locally. */
export async function readRecord<T>(
  store: StoreName,
  key: string,
): Promise<T | null> {
  return (await withStore<T>(store, "readonly", (s) => s.get(key))) ?? null;
}

/** Every record in a store. */
export async function readAll<T>(store: StoreName): Promise<T[]> {
  return (await withStore<T[]>(store, "readonly", (s) => s.getAll())) ?? [];
}

export async function writeRecord(
  store: StoreName,
  record: Record<string, unknown>,
): Promise<void> {
  await withStore(store, "readwrite", (s) => s.put(record));
}

export async function deleteRecord(
  store: StoreName,
  key: IDBValidKey,
): Promise<void> {
  await withStore(store, "readwrite", (s) => s.delete(key));
}

export async function clearStore(store: StoreName): Promise<void> {
  await withStore(store, "readwrite", (s) => s.clear());
}

/**
 * Replaces a store's contents in one transaction.
 *
 * One transaction rather than clear-then-write so a mirror is never
 * observed empty: an interrupted sync should leave yesterday's copy intact,
 * not nothing at all.
 */
export async function replaceAll(
  store: StoreName,
  records: Record<string, unknown>[],
): Promise<void> {
  const db = await openDb();
  if (!db) return;

  await new Promise<void>((resolve) => {
    let transaction: IDBTransaction;

    try {
      transaction = db.transaction(store, "readwrite");
    } catch {
      resolve();
      return;
    }

    const objectStore = transaction.objectStore(store);

    objectStore.clear();
    for (const record of records) objectStore.put(record);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => resolve();
    transaction.onabort = () => resolve();
  });
}

/** Appends to the outbox, which assigns its own key. */
export async function appendRecord(
  store: StoreName,
  record: Record<string, unknown>,
): Promise<void> {
  await withStore(store, "readwrite", (s) => s.add(record));
}
