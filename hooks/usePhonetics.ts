"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

import type { LanguageCode } from "@/lib/languages";
import { PHONETICS_STORE, hydrate, persist } from "@/lib/offline/annotations";
import { isOnline } from "@/hooks/useOnline";

/* =========================================================
   The phonetics for whatever is on screen

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

/*
 * Everything the route knows about one piece of text.
 *
 * It used to keep only the IPA and throw the rest away, so zhuyin and pinyin
 * were recomputed on the client from pinyin-pro — 640KB of dictionary on the
 * critical path of the home and vocabulary screens, to derive something the
 * server had already put in the same response.
 *
 * An absent field means "asked, and there is none"; an absent entry means
 * "not asked yet". That distinction is why misses are cached.
 */
export type WordPhonetics = {
  ipa?: string;
  pinyin?: string;
  zhuyin?: string;
};

const cache = new Map<string, WordPhonetics>();
const inFlight = new Set<string>();
const pending = new Map<LanguageCode, Set<string>>();
const listeners = new Set<() => void>();

let timer: ReturnType<typeof setTimeout> | null = null;

/*
 * The device's own copy, read once per session.
 *
 * Without it a reader with no signal sees unannotated cards even for words
 * they have looked at a hundred times. It is a few hundred short strings,
 * which is nothing next to being useful on a train.
 */
let hydrated: Promise<void> | null = null;

function hydrateOnce(): Promise<void> {
  hydrated ??= hydrate(PHONETICS_STORE).then((stored) => {
    for (const [id, value] of stored) {
      // Never over anything this session already learned: a fresh answer
      // outranks a remembered one.
      if (!cache.has(id)) cache.set(id, parseStored(value));
    }

    notify();
  });

  return hydrated;
}

/*
 * What subscribers read. Replaced rather than mutated on every resolved
 * batch, because useSyncExternalStore compares snapshots by identity — a map
 * that is only ever mutated in place looks unchanged forever, and callers
 * that memoise on it would render the rows they built before the data
 * existed.
 */
let snapshot: ReadonlyMap<string, WordPhonetics> = new Map();

function key(language: LanguageCode, text: string): string {
  return `${language}:${text}`;
}

/*
 * Reads both shapes the device may be holding.
 *
 * The store kept a bare IPA string before this; a record written by an older
 * build is that string and nothing else. Treating an unparseable value as the
 * IPA means nobody has to clear their cache, and the zhuyin simply arrives on
 * the next lookup.
 */
function parseStored(value: string): WordPhonetics {
  if (!value) return {};

  try {
    const parsed: unknown = JSON.parse(value);

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as WordPhonetics;
    }
  } catch {
    // Not JSON, so it is the old bare-IPA format.
  }

  return { ipa: value };
}

function trimmed(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function notify() {
  snapshot = new Map(cache);
  for (const listener of listeners) listener();
}

async function flush() {
  timer = null;

  await hydrateOnce();

  const batches = [...pending];
  pending.clear();

  /*
   * Anything the local copy already answers is answered, and not asked
   * for. Offline that is the only answer there will be, and online it is
   * still a request saved.
   */
  for (const [language, texts] of batches) {
    for (const text of [...texts]) {
      if (cache.has(key(language, text))) {
        texts.delete(text);
        inFlight.delete(key(language, text));
      }
    }
  }

  if (!isOnline()) {
    for (const [language, texts] of batches) {
      for (const text of texts) inFlight.delete(key(language, text));
    }

    notify();
    return;
  }

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
              phonetics?: Record<string, WordPhonetics>;
              unavailable?: string[];
            };

            /*
             * Words the server could not look up at all — a busy model, a
             * dropped upstream. Left out of the cache so a later render
             * asks again; caching them would turn one busy minute into a
             * word that is never annotated for the rest of the session.
             */
            const unreachable = new Set(result.unavailable ?? []);

            const learned: Array<[string, string]> = [];

            for (const text of chunk) {
              if (unreachable.has(text)) continue;

              const answer = result.phonetics?.[text];
              /*
               * A genuine miss is cached as an empty record, not left absent.
               * The alternative is asking again for every word the sources
               * cannot transcribe, once per render, forever.
               *
               * Zhuyin and pinyin come back in the same response and are kept
               * with the IPA rather than discarded — see WordPhonetics.
               */
              const phonetics: WordPhonetics = {
                ipa: trimmed(answer?.ipa),
                pinyin: trimmed(answer?.pinyin),
                zhuyin: trimmed(answer?.zhuyin),
              };

              cache.set(key(language, text), phonetics);
              learned.push([key(language, text), JSON.stringify(phonetics)]);
            }

            // Kept on the device, so the next cold start with no signal
            // still has them.
            void persist(PHONETICS_STORE, learned);
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

function getSnapshot(): ReadonlyMap<string, WordPhonetics> {
  return snapshot;
}

export type PhoneticRequest = {
  text: string | null | undefined;
  language: LanguageCode;
};

/**
 * The phonetics for each entry, once they arrive.
 *
 * Returns what is known now and re-renders when more lands, so a card draws
 * immediately with its text and gains its annotations a moment later rather
 * than waiting on the network to show anything at all.
 *
 * An absent field means "asked, and there is none" — render nothing. An
 * undefined result means "not known yet".
 */
export default function usePhonetics(
  entries: PhoneticRequest[],
): (entry: PhoneticRequest) => WordPhonetics | undefined {
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
