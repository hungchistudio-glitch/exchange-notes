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

export function readInteractionMap(): InteractionMap {
  if (typeof window === "undefined") return {};

  try {
    const raw = window.localStorage.getItem(INTERACTION_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : {};

    return parsed && typeof parsed === "object"
      ? (parsed as InteractionMap)
      : {};
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

    window.localStorage.setItem(INTERACTION_STORAGE_KEY, JSON.stringify(map));
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

    window.localStorage.setItem(INTERACTION_STORAGE_KEY, JSON.stringify(map));
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
