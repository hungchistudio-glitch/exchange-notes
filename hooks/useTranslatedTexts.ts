"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

import type { LanguageCode } from "@/lib/languages";
import { TRANSLATIONS_STORE, hydrate, persist } from "@/lib/offline/annotations";
import { createAnnotationBackoff } from "@/lib/offline/annotationBackoff";
import { isOnline } from "@/hooks/useOnline";

/* =========================================================
   The reader's language, for text that predates it

   A word card sent into a conversation before shared cards carried every
   language holds two, and they may be two the reader never chose. Their own
   vocabulary gets filled in when they switch; a message cannot, because it
   belongs to whoever sent it.

   So the message stays as sent and this supplies what the rendering needs.
   Same shape as usePhonetics, and for the same reasons: one request per
   language pair per frame, a store that outlives any one card, and a
   snapshot rather than a mutated map so a caller's memo notices the answer
   arriving.
   ========================================================= */

const BATCH_WINDOW_MS = 50;
const CHUNK = 40;

/*
 * How long to leave a phrase alone once the day's allowance is spent.
 *
 * The route now counts model calls and says so when there are none left. That
 * is not a busy minute, so the escalating hold is the wrong instrument: at
 * thirty seconds it would ask again two thousand eight hundred times before
 * midnight, and every one of them would get the same answer.
 *
 * An hour rather than "until tomorrow", because the allowance rolls over on
 * the reader's own midnight and this side does not know when that is — an
 * hour is short enough that the first cards after it come back on their own.
 */
const QUOTA_HOLD_MS = 60 * 60 * 1_000;

const cache = new Map<string, string>();
const inFlight = new Set<string>();
const pending = new Map<string, Set<string>>();
const listeners = new Set<() => void>();

let timer: ReturnType<typeof setTimeout> | null = null;

/** The device's own copy, read once per session. See usePhonetics. */
let hydrated: Promise<void> | null = null;

function hydrateOnce(): Promise<void> {
  hydrated ??= hydrate(TRANSLATIONS_STORE).then((stored) => {
    for (const [id, value] of stored) {
      if (!cache.has(id)) cache.set(id, value);
    }

    notify();
  });

  return hydrated;
}
let snapshot: ReadonlyMap<string, string> = new Map();

function key(from: LanguageCode, to: LanguageCode, text: string): string {
  return `${from}>${to}:${text}`;
}

function notify() {
  snapshot = new Map(cache);
  for (const listener of listeners) listener();
}

/*
 * Why a failed lookup is not simply asked for again on the next render:
 * see lib/offline/annotationBackoff. This store reaches /api/text-translate,
 * which spends model quota on a cache miss, so the loop it prevents was
 * costing more here than a warm phone.
 */
const backoff = createAnnotationBackoff(notify);

async function flush() {
  timer = null;

  await hydrateOnce();

  const batches = [...pending];
  pending.clear();

  for (const [pair, texts] of batches) {
    const [from, to] = pair.split(">") as [LanguageCode, LanguageCode];

    for (const text of [...texts]) {
      if (cache.has(key(from, to, text))) {
        texts.delete(text);
        inFlight.delete(key(from, to, text));
      }
    }
  }

  if (!isOnline()) {
    /*
     * Held back for the same reason a failed request is, and it matters more
     * here: there is no network call to be slow about it. Without the hold
     * this branch is a pure loop — clear, notify, re-render, queue, flush —
     * spinning the tree twenty times a second on a device that is offline
     * and therefore probably also trying to save its battery.
     */
    for (const [pair, texts] of batches) {
      const [from, to] = pair.split(">") as [LanguageCode, LanguageCode];
      for (const text of texts) {
        inFlight.delete(key(from, to, text));
        backoff.note(key(from, to, text));
      }
    }

    notify();
    backoff.scheduleWake();
    return;
  }

  await Promise.all(
    batches.map(async ([pair, texts]) => {
      const [from, to] = pair.split(">") as [LanguageCode, LanguageCode];
      const list = [...texts];

      for (let start = 0; start < list.length; start += CHUNK) {
        const chunk = list.slice(start, start + CHUNK);

        try {
          const response = await fetch("/api/text-translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ texts: chunk, from, to }),
          });

          if (response.ok) {
            const result = (await response.json()) as {
              texts?: Record<string, string>;
              unavailable?: string[];
              quotaExhausted?: boolean;
            };

            // Left out of the cache so a later render asks again: a busy
            // model is not evidence that a phrase cannot be translated.
            const unreachable = new Set(result.unavailable ?? []);

            const learned: Array<[string, string]> = [];

            for (const text of chunk) {
              if (unreachable.has(text)) {
                /*
                 * Held for the hour rather than the usual second, when the
                 * answer was "there is nothing left to spend today". What the
                 * cache did answer is still in `texts` above and is kept.
                 */
                if (result.quotaExhausted) {
                  backoff.holdFor(key(from, to, text), QUOTA_HOLD_MS);
                } else {
                  backoff.note(key(from, to, text));
                }

                continue;
              }

              backoff.clear(key(from, to, text));

              const translated = result.texts?.[text]?.trim() ?? "";
              cache.set(key(from, to, text), translated);
              learned.push([key(from, to, text), translated]);
            }

            void persist(TRANSLATIONS_STORE, learned);
          } else {
            // Answered, and the answer was no — an expired session, a
            // rate-limited upstream. Nothing is cached, so the hold is the
            // only thing between this and asking again at once.
            for (const text of chunk) backoff.note(key(from, to, text));
          }
        } catch {
          // Same reasoning: a dropped connection leaves no entry behind. It
          // is evidence that asking again this instant will fail the same way.
          for (const text of chunk) backoff.note(key(from, to, text));
        } finally {
          for (const text of chunk) inFlight.delete(key(from, to, text));
        }
      }
    }),
  );

  notify();
  backoff.scheduleWake();
}

function request(from: LanguageCode, to: LanguageCode, text: string) {
  const id = key(from, to, text);
  if (cache.has(id) || inFlight.has(id)) return;

  /*
   * Recently failed, and not yet due. Returning without scheduling a timer
   * is the whole point: an unscheduled flush is a flush that does not
   * notify, and a notify that does not happen is the render that does not
   * ask again a fiftieth of a second later.
   */
  if (backoff.held(id)) return;

  inFlight.add(id);

  const pair = `${from}>${to}`;
  const queue = pending.get(pair) ?? new Set<string>();
  queue.add(text);
  pending.set(pair, queue);

  timer ??= setTimeout(() => void flush(), BATCH_WINDOW_MS);
}

export type TranslationRequest = {
  text: string | null | undefined;
  from: LanguageCode;
  to: LanguageCode;
};

/**
 * The translation of each entry, once it arrives.
 *
 * An empty string means "asked, and there is none" — render the original.
 * Undefined means "not known yet", which reads the same way: a card shows
 * what it has and gains the reader's language a moment later.
 */
export default function useTranslatedTexts(
  entries: TranslationRequest[],
): (entry: TranslationRequest) => string | undefined {
  const translations = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot,
  );

  const wanted = useMemo(
    () =>
      entries.flatMap((entry) => {
        const text = entry.text?.trim();
        if (!text || entry.from === entry.to) return [];
        return [{ text, from: entry.from, to: entry.to }];
      }),
    [entries],
  );

  for (const entry of wanted) request(entry.from, entry.to, entry.text);

  return useCallback(
    (entry: TranslationRequest) => {
      const text = entry.text?.trim();
      if (!text || entry.from === entry.to) return undefined;
      return translations.get(key(entry.from, entry.to, text));
    },
    [translations],
  );
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): ReadonlyMap<string, string> {
  return snapshot;
}
