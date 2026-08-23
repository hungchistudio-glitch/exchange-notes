"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

import type { LanguageCode } from "@/lib/languages";

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

const cache = new Map<string, string>();
const inFlight = new Set<string>();
const pending = new Map<string, Set<string>>();
const listeners = new Set<() => void>();

let timer: ReturnType<typeof setTimeout> | null = null;
let snapshot: ReadonlyMap<string, string> = new Map();

function key(from: LanguageCode, to: LanguageCode, text: string): string {
  return `${from}>${to}:${text}`;
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
            };

            // Left out of the cache so a later render asks again: a busy
            // model is not evidence that a phrase cannot be translated.
            const unreachable = new Set(result.unavailable ?? []);

            for (const text of chunk) {
              if (unreachable.has(text)) continue;
              cache.set(key(from, to, text), result.texts?.[text]?.trim() ?? "");
            }
          }
        } catch {
          // Same reasoning: a dropped connection leaves no entry behind.
        } finally {
          for (const text of chunk) inFlight.delete(key(from, to, text));
        }
      }
    }),
  );

  notify();
}

function request(from: LanguageCode, to: LanguageCode, text: string) {
  const id = key(from, to, text);
  if (cache.has(id) || inFlight.has(id)) return;

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
