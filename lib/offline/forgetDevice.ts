"use client";

/* =========================================================
   What the last person leaves behind

   A shared or handed-on phone is the ordinary case for this app, not the
   exotic one, and the vocabulary mirror already takes it seriously: it
   records an owner, refuses to be read by anyone else, and is cleared on
   sign-out. See lib/offline/vocabulary.

   Two other stores were not treated that way, and both hold the same kind of
   thing.

   localStorage. `vocabulary-interactions-v1` is the largest of them — every
   word the reader has viewed, searched, spoken, shared or sent, with the word
   and its translation written out in full beside the counts. It survived a
   sign-out, and the next account's library was ordered by it. The others here
   are smaller but the same in kind: a note, a word someone shared, a
   pronunciation session, the devices an account had paired.

   The service worker's cache. public/sw.js is network-first over every
   same-origin GET that is not an API route, and it caches whatever comes
   back — which includes the HTML of `/vocabulary`, `/notes/[id]`,
   `/messages/…` and `/profile`, and the RSC payloads behind them. That cache
   outlived the session too, and offline it is what the app serves. The pages
   are mostly shells whose contents arrive over the network, so what leaks is
   the frame rather than the words; it is still the previous account's frame,
   and nothing needed it after they left.

   Display preferences are deliberately not cleared: font size, the speech
   settings, the daily word goal, whether the tutorial has been seen. Those
   belong to the device rather than to the person, and wiping them would make
   signing out and back in as yourself worse for no privacy gained.
   ========================================================= */

/**
 * localStorage keys holding one account's content or activity.
 *
 * Each is owned by the module named beside it; this list is the one place
 * that knows they all have to go together, because "clear it on sign-out" is
 * not a thing any of them can decide alone.
 */
const ACCOUNT_STORAGE_KEYS = [
  /** lib/vocabulary/helpers — words, translations, and what was done to them. */
  "vocabulary-interactions-v1",
  /** lib/notes/repository — the pre-Supabase home notes. */
  "exchange-notes-home-notes",
  /** lib/vocabularyDraft — a word shared in, waiting to be saved. */
  "pending-shared-vocabulary",
  /** lib/pronunciation/lab/session — where the reader was in the lab. */
  "exchange-notes-pronunciation-session",
  /** lib/settings/deviceConnections — the devices this account had paired. */
  "exchange-notes-device-connections",
] as const;

function forgetAccountStorage(): void {
  if (typeof window === "undefined") return;

  for (const key of ACCOUNT_STORAGE_KEYS) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Private browsing and a full quota both throw. One key that cannot be
      // removed must not stop the rest from being.
    }
  }
}

/**
 * Empties every cache this origin holds.
 *
 * By name rather than by entry: the worker owns one cache and names it after
 * a version it bumps on its own, so matching on today's name would quietly
 * stop working the next time that constant changes. Anything cached here is
 * either a public asset — free to fetch again — or a signed-in page that
 * should not be kept, and there is nothing in between worth the coupling.
 */
async function forgetCachedPages(): Promise<void> {
  if (typeof caches === "undefined") return;

  try {
    const names = await caches.keys();
    await Promise.all(names.map((name) => caches.delete(name)));
  } catch {
    // Caches are unavailable in some privacy modes and in insecure contexts.
  }
}

/**
 * Removes what this device is holding on behalf of the account signing out.
 *
 * Awaitable, and worth awaiting before a navigation: the caches are cleared
 * asynchronously, and a document that is being replaced may not live long
 * enough to finish work nobody waited for.
 *
 * Safe to call twice, and it is called twice on the ordinary path — once by
 * whoever pressed the button and once by the SIGNED_OUT listener, which is
 * also what covers a session ended from another device.
 */
export async function forgetDeviceCopies(): Promise<void> {
  forgetAccountStorage();
  await forgetCachedPages();
}
