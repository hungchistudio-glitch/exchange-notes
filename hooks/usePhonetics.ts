"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

import type { LanguageCode } from "@/lib/languages";

/* =========================================================
   IPA for whatever is on screen

   Word cards render two languages each and a list renders many cards, so
   the naive shape — one request per card per language — turns a scroll into
   a few hundred requests. Everything here exists to make that one request
   per language per tick instead.

   The store is module-level on purpose. A transcription does not depend on
   which card is asking, the same word appears on the vocabulary page and in
   the news drawer, and a cache that lives inside a component is thrown away
   every time that component unmounts.
   ========================================================= */

/** How long to gather requests before sending. One frame, near enough. */
const BATCH_WINDOW_MS = 50;

/** The server takes forty at a time; ask in the same size it answers. */
const CHUNK = 40;

const cache = new Map<string, string>();
const inFlight = new Set<string>();
const pending = new Map<LanguageCode, Set<string>>();
const listeners = new Set<() => void>();

let timer: ReturnType<typeof setTimeout> | null = null;

/*
 * What subscribers read. Replaced rather than mutated on every resolved
 * batch, because useSyncExternalStore compares snapshots by identity — a map
 * that is only ever mutated in place looks unchanged forever, and callers
 * that memoise on it would render the rows they built before the data
 * existed.
 */
let snapshot: ReadonlyMap<string, string> = new Map();

function key(language: LanguageCode, text: string): string {
  return `${language}:${text}`;
}

function notify() {
  snapshot = new Map(cache);
  for (const listener of listeners) listener();
}

async function flush() {
  timer = null;

  const batches = [...pending];
  pending.clear();

  await Promise.all(
    batches.map(async ([language, texts]) => {
      const list = [...texts];

      for (let start = 0; start < list.length; start += CHUNK) {
        const chunk = list.slice(start, start + CHUNK);

        try {
          const response = await fetch("/api/word-pronunciation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ texts: chunk, language }),
          });

          if (response.ok) {
            const result = (await response.json()) as {
              phonetics?: Record<string, { ipa?: string }>;
              unavailable?: string[];
            };

            /*
             * Words the server could not look up at all — a busy model, a
             * dropped upstream. Left out of the cache so a later render
             * asks again; caching them would turn one busy minute into a
             * word that is never annotated for the rest of the session.
             */
            const unreachable = new Set(result.unavailable ?? []);

            for (const text of chunk) {
              if (unreachable.has(text)) continue;

              const ipa = result.phonetics?.[text]?.ipa?.trim();
              /*
               * A genuine miss is cached as an empty string, not left
               * absent. The alternative is asking again for every word the
               * sources cannot transcribe, once per render, forever.
               */
              cache.set(key(language, text), ipa ?? "");
            }
          }
        } catch {
          // Leave these out of the cache so a later render may retry; a
          // dropped connection is not evidence the word has no IPA.
        } finally {
          for (const text of chunk) inFlight.delete(key(language, text));
        }
      }
    }),
  );

  notify();
}

function request(language: LanguageCode, text: string) {
  const id = key(language, text);
  if (cache.has(id) || inFlight.has(id)) return;

  inFlight.add(id);

  const queue = pending.get(language) ?? new Set<string>();
  queue.add(text);
  pending.set(language, queue);

  timer ??= setTimeout(() => void flush(), BATCH_WINDOW_MS);
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

export type PhoneticRequest = {
  text: string | null | undefined;
  language: LanguageCode;
};

/**
 * The IPA for each entry, once it arrives.
 *
 * Returns what is known now and re-renders when more lands, so a card draws
 * immediately with its text and gains the annotation a moment later rather
 * than waiting on the network to show anything at all.
 *
 * An empty string means "asked, and there is none" — render nothing.
 * Undefined means "not known yet".
 */
export default function usePhonetics(
  entries: PhoneticRequest[],
): (entry: PhoneticRequest) => string | undefined {
  /*
   * The snapshot is what the returned lookup closes over, and that is the
   * whole point of it.
   *
   * This used to subscribe for re-renders but return a lookup built with an
   * empty dependency list, so its identity never changed. Callers memoise
   * their rows on it — quite reasonably — and that memo therefore never
   * recomputed: the transcription arrived, the store notified, the component
   * re-rendered, and it rendered the same cached rows from before the data
   * existed. The annotation only ever appeared if something unrelated
   * happened to change a prop.
   *
   * Same value on the server and the first client render: the store starts
   * empty either way, so there is nothing to mismatch.
   */
  const phonetics = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const wanted = useMemo(
    () =>
      entries.flatMap((entry) => {
        const text = entry.text?.trim();
        return text ? [{ text, language: entry.language }] : [];
      }),
    [entries],
  );

  for (const entry of wanted) request(entry.language, entry.text);

  return useCallback(
    (entry: PhoneticRequest) => {
      const text = entry.text?.trim();
      if (!text) return undefined;
      return phonetics.get(key(entry.language, text));
    },
    [phonetics],
  );
}
