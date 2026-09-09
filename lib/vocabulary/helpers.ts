import type { VocabularyItem } from "@/lib/types/app";

const INTERACTION_STORAGE_KEY = "vocabulary-interactions-v1";

export type InteractionType =
  "view" | "search" | "speak" | "share" | "send" | "status";

export type InteractionRecord = {
  word: string;
  translation: string;
  view: number;
  search: number;
  speak: number;
  share: number;
  send: number;
  status: number;
  lastInteractedAt: string;
};

export type InteractionMap = Record<string, InteractionRecord>;

/*
 * The parsed map, and the exact text it was parsed from.
 *
 * Reading this used to mean parsing the whole thing every time, and at 400
 * words it is 62KB — 0.34ms of parsing per call, measured. That is affordable
 * for a tap and ruinous anywhere it repeats, which is precisely where it had
 * ended up: see the sort in useVisibleVocabularyItems.
 *
 * Keyed on the raw text rather than trusted blindly, so it cannot go stale.
 * A write from another tab, a sign-out, a cleared store — all change the text
 * and all force a re-parse. Comparing 62KB of string costs 0.05ms against
 * 0.34ms to parse it, so the cheap path is the common one and the correct
 * path is the only one.
 *
 * The map is handed out by reference, not copied. Nothing outside this file
 * may mutate it; the two writers below do, and they put the cache straight in
 * the same breath.
 */
let cachedRaw: string | null = null;
let cachedMap: InteractionMap | null = null;

/** Keeps the cache honest after a write, so the next read parses nothing. */
function remember(raw: string | null, map: InteractionMap) {
  cachedRaw = raw;
  cachedMap = map;
}

export function readInteractionMap(): InteractionMap {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(INTERACTION_STORAGE_KEY);

    if (raw === cachedRaw && cachedMap) return cachedMap;

    const parsed = raw ? (JSON.parse(raw) as unknown) : {};
    const map =
      parsed && typeof parsed === "object" ? (parsed as InteractionMap) : {};

    remember(raw, map);

    return map;
  } catch {
    return {};
  }
}

export function recordInteraction(item: VocabularyItem, type: InteractionType) {
  if (typeof window === "undefined") return;

  try {
    const map = readInteractionMap();

    const current = map[item.id] ?? {
      word: item.word,
      translation: item.translation,
      view: 0,
      search: 0,
      speak: 0,
      share: 0,
      send: 0,
      status: 0,
      lastInteractedAt: new Date(0).toISOString(),
    };

    map[item.id] = {
      ...current,
      word: item.word,
      translation: item.translation,
      [type]: current[type] + 1,
      lastInteractedAt: new Date().toISOString(),
    };

    const serialised = JSON.stringify(map);
    window.localStorage.setItem(INTERACTION_STORAGE_KEY, serialised);
    remember(serialised, map);
  } catch {
    // Private browsing or storage quota can block localStorage.
  }
}

/**
 * The same thing for many words at once, in one read and one write.
 *
 * recordInteraction re-reads and re-serialises the entire map on every call,
 * which is fine for a tap and ruinous in a loop: the search tracker calls it
 * once per matching word, so typing a single common letter against a large
 * library was hundreds of full-map rewrites, synchronously, every time the
 * reader paused.
 *
 * Records exactly what the loop recorded — this is a change of cost, not of
 * meaning.
 */
export function recordInteractions(
  items: readonly VocabularyItem[],
  type: InteractionType,
) {
  if (typeof window === "undefined" || items.length === 0) return;

  try {
    const map = readInteractionMap();
    const at = new Date().toISOString();

    for (const item of items) {
      const current = map[item.id] ?? {
        word: item.word,
        translation: item.translation,
        view: 0,
        search: 0,
        speak: 0,
        share: 0,
        send: 0,
        status: 0,
        lastInteractedAt: new Date(0).toISOString(),
      };

      map[item.id] = {
        ...current,
        word: item.word,
        translation: item.translation,
        [type]: current[type] + 1,
        lastInteractedAt: at,
      };
    }

    const serialised = JSON.stringify(map);
    window.localStorage.setItem(INTERACTION_STORAGE_KEY, serialised);
    remember(serialised, map);
  } catch {
    // Private browsing or storage quota can block localStorage.
  }
}

export function normalizeVocabularyText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase();
}

export function getVocabularyKey(
  word: string | null | undefined,
  translation: string | null | undefined,
) {
  return `${normalizeVocabularyText(word)}::${normalizeVocabularyText(
    translation,
  )}`;
}
