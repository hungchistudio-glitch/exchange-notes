import type { LanguageCode } from "@/lib/languages";
import type { VocabularyItem as StoryWord } from "@/lib/types/dailyNews";

/* =========================================================
   The laser scan (Chi, 2026-11-28: 雷射掃描查字)

   A word held down in a story: Yumi's eye, the logo in the page's header,
   fires a beam at it, a scan line runs over it, and its meaning comes up
   beside it as a hologram tag, from the reader's own library first, the
   story's own word list next, and the instant dictionary last. The full
   lookup is one key away on the tag.

   One host draws it (components/discover/LaserScanHost.tsx); anything on
   the page asks through here. Where no host is listening (a story opened
   somewhere else), the caller does what it always did.
   ========================================================= */

export type LaserRequest = {
  word: string;
  rect: DOMRect;
  /** The language the word is in, and the one its meaning is wanted in. */
  language: LanguageCode;
  meaningLanguage: LanguageCode;
  /** The story's own key words, which carry their meanings with them. */
  storyWords?: readonly StoryWord[];
};

let current: LaserRequest | null = null;
const listeners = new Set<() => void>();

/** True when a host took it; false to fall back to the plain lookup. */
export function requestLaserScan(request: LaserRequest): boolean {
  if (listeners.size === 0) return false;
  current = request;
  for (const listener of listeners) listener();
  return true;
}

export function laserRequest() {
  return current;
}

export function clearLaserScan() {
  if (!current) return;
  current = null;
  for (const listener of listeners) listener();
}

export function subscribeLaserScan(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

const fold = (value: string) => value.normalize("NFKD").replace(/\p{Mark}/gu, "").toLocaleLowerCase().trim();

export type QuickMeaning = { meaning: string; partOfSpeech: string | null; source: "library" | "story" | "dictionary" };

/** A meaning found without asking the server: the library, then the story. */
export function meaningNearby(
  request: LaserRequest,
  library: ReadonlyArray<{ word: string; word_language: LanguageCode; translation: string; texts: Partial<Record<LanguageCode, string>>; part_of_speech: string | null }>,
): QuickMeaning | null {
  const word = fold(request.word);
  if (!word) return null;
  for (const item of library) {
    const own = item.texts?.[request.language] ?? (item.word_language === request.language ? item.word : "");
    if (own && fold(own) === word) {
      const meaning = item.texts?.[request.meaningLanguage] ?? item.translation;
      if (meaning) return { meaning, partOfSpeech: item.part_of_speech, source: "library" };
    }
  }
  for (const item of request.storyWords ?? []) {
    const own = item.texts?.[request.language];
    if (own && fold(own) === word) {
      const meaning = item.texts?.[request.meaningLanguage];
      if (meaning) return { meaning, partOfSpeech: item.partOfSpeech || null, source: "story" };
    }
  }
  return null;
}
