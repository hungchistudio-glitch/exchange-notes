/* =========================================================
   Which readings are shown (Chi, 2026-11-16: 讀音顯示)

   One group per language that has readings to show, so a reader can take
   them away as they learn and the screen gets quieter with them:

     Japanese  furigana   always · on word cards only · off
               romaji     on · off (word cards only, never in long text)
     Korean    reading    romanization · IPA · off (a tap on the line
                          swaps romanization and IPA, and is remembered)
     Chinese   zhuyin     on · off
               pinyin     on · off

   Kept on this device, like the word-by-word switch: a reading is about
   the screen in front of the reader, and a phone and a laptop can want
   different ones. Defaults are everything on — the app as it was before
   this setting existed, for Chinese, and the fullest help for a beginner.
   ========================================================= */

export type FuriganaMode = "always" | "cards" | "off";
export type KoreanReadingMode = "rr" | "ipa" | "off";

export type ReadingDisplay = {
  furigana: FuriganaMode;
  romaji: boolean;
  korean: KoreanReadingMode;
  zhuyin: boolean;
  pinyin: boolean;
};

export const DEFAULT_READING_DISPLAY: ReadingDisplay = {
  furigana: "always",
  romaji: true,
  korean: "rr",
  zhuyin: true,
  pinyin: true,
};

const KEY = "reading-display-v1";
let current: ReadingDisplay | null = null;
const listeners = new Set<() => void>();

function parse(raw: string | null): ReadingDisplay {
  if (!raw) return DEFAULT_READING_DISPLAY;
  try {
    const value = JSON.parse(raw) as Partial<ReadingDisplay>;
    return {
      furigana: value.furigana === "cards" || value.furigana === "off" ? value.furigana : "always",
      romaji: value.romaji !== false,
      korean: value.korean === "ipa" || value.korean === "off" ? value.korean : "rr",
      zhuyin: value.zhuyin !== false,
      pinyin: value.pinyin !== false,
    };
  } catch {
    return DEFAULT_READING_DISPLAY;
  }
}

export function getReadingDisplay(): ReadingDisplay {
  if (current === null) {
    try {
      current = parse(window.localStorage.getItem(KEY));
    } catch {
      current = DEFAULT_READING_DISPLAY;
    }
  }
  return current;
}

/** The server render and hydration see the defaults; the device's own
 *  choice follows a tick later, which only ever hides a reading. */
export function getServerReadingDisplay(): ReadingDisplay {
  return DEFAULT_READING_DISPLAY;
}

export function setReadingDisplay(patch: Partial<ReadingDisplay>): void {
  current = { ...getReadingDisplay(), ...patch };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    /* Private mode: it holds for this visit. */
  }
  for (const listener of [...listeners]) listener();
}

export function subscribeToReadingDisplay(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== KEY) return;
    current = parse(event.newValue);
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

/** Where a piece of Japanese sits, which decides whether it gets furigana. */
export type FuriganaPlace = "card" | "text";

export function showsFurigana(display: ReadingDisplay, place: FuriganaPlace): boolean {
  if (display.furigana === "off") return false;
  return place === "card" || display.furigana === "always";
}

/** A word's readings, from wherever they came: a card written ahead, or a lookup. */
export type ReadingParts = {
  ipa?: string;
  pinyin?: string;
  zhuyin?: string;
  kana?: string;
  romaji?: string;
  rr?: string;
};

/**
 * The reading lines a word in this language shows on a card, in order, as
 * the reader has set them: romaji for Japanese (its kana goes over the
 * kanji as furigana); romanization or IPA for Korean; zhuyin and pinyin for
 * Chinese; IPA for everything else.
 */
export function readingLines(language: string, reading: ReadingParts | undefined, display: ReadingDisplay): string[] {
  if (!reading) return [];
  const lines =
    language === "ja"
      ? [display.romaji ? reading.romaji : undefined]
      : language === "ko"
        ? [display.korean === "ipa" ? reading.ipa : display.korean === "rr" ? reading.rr : undefined]
        : [display.zhuyin ? reading.zhuyin : undefined, display.pinyin ? reading.pinyin : undefined, reading.ipa];
  return lines.filter((line): line is string => Boolean(line));
}
