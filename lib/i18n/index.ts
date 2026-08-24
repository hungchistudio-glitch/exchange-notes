import type {
  TranslationDictionary,
  TranslationLanguage,
} from "@/lib/i18n/types";

/* =========================================================
   One dictionary per reader, not five

   A dictionary is about 21 KB gzipped and there are five of them. Imported
   statically, all five landed in one chunk that every page pulled on its
   critical path — 97 KB gzipped on the sign-in screen, whose only control is
   a Google button, of which 76 KB was four languages the reader had not
   chosen and would never see.

   These are dynamic imports, so the bundler gives each language its own
   chunk and a reader downloads the one they read in. The chunk is cached by
   the browser and by the service worker, so the second visit costs nothing —
   which is why this is a split rather than a move into the HTML payload. A
   dictionary inlined per document load would be smaller on the first visit
   and larger on every visit after it, and this app is opened daily.

   ── Why nothing ever waits on this ─────────────────────────────────────

   `useTranslation` is synchronous at all 110 of its call sites and stays
   that way: it reads `getTranslations`, which answers from the cache below
   or not at all. The load is arranged so the cache is already warm every
   time that matters:

     server render   the client module graph resolves the dictionary once
                     per language per process, on the first render that asks
     hydration       React suspends on the promise and keeps the
                     server-rendered markup, so nothing on screen changes
     switching       `prefetchTranslations` has already fetched the other
                     four while the device was idle
     tests           tests/setup.ts primes all five up front

   The only path that can suspend is the very first render of a language
   nobody has asked for yet, and the only place that happens in the app is
   hydration, where React holds the server's own HTML.
   ========================================================= */

/**
 * How each dictionary is fetched. Written as five literal `import()` calls
 * rather than a template path because a bundler can only split what it can
 * see — `import("./" + language)` produces one chunk containing all five,
 * which is the thing this file exists to undo.
 */
const LOADERS: Record<
  TranslationLanguage,
  () => Promise<{ default: TranslationDictionary }>
> = {
  english: () => import("@/lib/i18n/en"),
  "traditional-chinese": () => import("@/lib/i18n/zh-TW"),
  spanish: () => import("@/lib/i18n/es"),
  french: () => import("@/lib/i18n/fr"),
  italian: () => import("@/lib/i18n/it"),
};

export const TRANSLATION_LANGUAGES = Object.keys(
  LOADERS,
) as TranslationLanguage[];

/** Resolved dictionaries. The only thing `useTranslation` reads. */
const loaded = new Map<TranslationLanguage, TranslationDictionary>();

/**
 * In-flight loads, kept so the same promise is returned every time.
 *
 * `use()` re-invokes the render that suspended, so a function handing back a
 * new promise each call would suspend on a promise that had only just been
 * created, forever. The identity is the point.
 */
const pending = new Map<
  TranslationLanguage,
  Promise<TranslationDictionary>
>();

/**
 * The dictionary for a language, if it is already here.
 *
 * Deliberately not async. A caller that gets `undefined` has to decide what
 * to do about it — see useTranslation, which suspends — and a caller that
 * gets a dictionary is holding the real thing with no await in sight.
 */
export function getTranslations(
  language: TranslationLanguage,
): TranslationDictionary | undefined {
  return loaded.get(language);
}

/**
 * Fetches a dictionary, or hands back the fetch already running.
 *
 * A failed load resolves to whatever is already in the cache rather than
 * rejecting, when there is anything: losing the network mid-session should
 * cost a reader the language they switched *to*, not the screen they were
 * already reading. With nothing cached at all there is nothing to render
 * with and the rejection is the honest answer.
 */
export function loadTranslations(
  language: TranslationLanguage,
): Promise<TranslationDictionary> {
  const already = loaded.get(language);
  if (already) return Promise.resolve(already);

  const running = pending.get(language);
  if (running) return running;

  const request = LOADERS[language]()
    .then((module) => {
      loaded.set(language, module.default);
      pending.delete(language);
      return module.default;
    })
    .catch((error) => {
      pending.delete(language);

      const fallback = loaded.values().next().value;
      if (fallback) return fallback;

      throw error;
    });

  pending.set(language, request);
  return request;
}

/**
 * Puts a dictionary in the cache without fetching it.
 *
 * For the two callers that already hold one: the test setup, which imports
 * all five directly, and any future server path that has resolved one and
 * wants to hand it over rather than have it fetched twice.
 */
export function primeTranslations(
  language: TranslationLanguage,
  dictionary: TranslationDictionary,
): void {
  loaded.set(language, dictionary);
}

/**
 * Warms the languages the reader is not currently reading.
 *
 * Switching the app's language is a synchronous, in-place re-render — the
 * setting is a `useSyncExternalStore` and every screen changes in the same
 * commit. That only stays true if the dictionary is already here, so the
 * other four are fetched once the device has nothing better to do.
 *
 * Idle rather than immediate, and after the active language, because the
 * point of the split is that the first paint carries one dictionary. Calling
 * this during the critical path would put all five back on it by a longer
 * route.
 */
export function prefetchTranslations(active: TranslationLanguage): void {
  if (typeof window === "undefined") return;

  const rest = TRANSLATION_LANGUAGES.filter(
    (language) => language !== active && !loaded.has(language),
  );

  if (rest.length === 0) return;

  const schedule =
    window.requestIdleCallback ??
    ((callback: () => void) => window.setTimeout(callback, 1_200));

  schedule(() => {
    for (const language of rest) {
      // Failures are silent on purpose: this is a convenience, and a reader
      // who never switches language must not be shown an error about a
      // dictionary they were never going to read.
      void loadTranslations(language).catch(() => undefined);
    }
  });
}

export type { TranslationDictionary, TranslationLanguage };
