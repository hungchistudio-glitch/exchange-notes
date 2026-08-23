"use client";

import { STORES, readAll, writeRecord, type StoreName } from "@/lib/offline/db";

/* =========================================================
   Annotations that survive a reload

   IPA, zhuyin and card translations are already cached twice — once in the
   database, shared by everybody, and once in memory for the life of the
   tab. Neither helps a reader with no signal: the first needs a request to
   reach, and the second is gone the moment the app is closed.

   This is the third copy, and the only one that is any use on a train. It
   is small — a few hundred short strings — and it is exactly the data that
   never changes, which is what makes it worth keeping rather than
   re-deriving.
   ========================================================= */

type CachedRecord = { key: string; value: string };

/** Everything held locally for one kind of annotation. */
export async function hydrate(store: StoreName): Promise<Map<string, string>> {
  const records = await readAll<CachedRecord>(store);

  return new Map(
    records
      .filter((record) => typeof record?.value === "string")
      .map((record) => [record.key, record.value]),
  );
}

/**
 * Keeps what was just looked up.
 *
 * Misses are kept too, as empty strings: "this word has no IPA" is an
 * answer worth remembering, and re-asking for it on every cold start is
 * how a cache becomes a source of requests rather than a way to avoid them.
 */
export async function persist(
  store: StoreName,
  entries: Iterable<[string, string]>,
): Promise<void> {
  for (const [key, value] of entries) {
    await writeRecord(store, { key, value });
  }
}

export const PHONETICS_STORE = STORES.phonetics;
export const TRANSLATIONS_STORE = STORES.translations;
