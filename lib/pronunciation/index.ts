import { chineseReadings } from "@/lib/chinese/taiwanReadings";
import { hasPhonetics, type LanguageCode } from "@/lib/languages";

export type PronunciationData = {
  english: string | null;
  pinyin: string | null;
  zhuyin: string | null;
};

/**
 * Phonetic annotations for one piece of text, keyed by system.
 *
 * A system is absent when the language does not use it — not empty. Spanish
 * has no pinyin key at all rather than an empty one, so a caller cannot
 * render a blank pinyin row for a language that has never had pinyin.
 */
export type Phonetics = Partial<Record<"pinyin" | "zhuyin", string>>;

/**
 * The annotations this app can compute locally for a language.
 *
 * Gated on the language first and the text second. The text check is not
 * redundant: a Chinese vocabulary row can hold a Latin loanword, and the
 * converters have nothing to say about it. IPA is not here — it comes from a
 * network dictionary, not from a local table.
 */
export function getPhonetics(text: string, code: LanguageCode): Phonetics {
  const trimmed = text.trim();
  if (!trimmed) return {};

  if (!hasPhonetics(code, "pinyin") && !hasPhonetics(code, "zhuyin")) {
    return {};
  }

  const { pinyin: pinyinText, zhuyin: zhuyinText } =
    computeChinesePronunciation(trimmed);

  const phonetics: Phonetics = {};
  if (pinyinText && hasPhonetics(code, "pinyin")) phonetics.pinyin = pinyinText;
  if (zhuyinText && hasPhonetics(code, "zhuyin")) phonetics.zhuyin = zhuyinText;

  return phonetics;
}

type GetPronunciationDataInput = {
  english?: string | null;
  chinese?: string | null;
};

/**
 * Pinyin and zhuyin for Chinese text. Chinese-specific by construction, and
 * deliberately not generalized into a "phonetic system" abstraction — what
 * Spanish, French and Italian need is stress placement and liaison, which is
 * not an analogue of pinyin.
 */
/*
 * The conversions are pure, so the same string is converted once.
 *
 * Both halves are dictionary lookups over every character, and the callers are
 * render paths that ask for the same few hundred words over and over — the
 * cookie tray rebuilding a library's glyphs, a word list re-rendering, a card
 * re-reading the word it is already showing. Measured at 0.056ms a call, which
 * is nothing once and 17ms across a 300-word library, every render.
 *
 * Bounded because this is a long-lived tab and the key is arbitrary user text.
 * The eviction is deliberately the crudest one that cannot leak: at the limit
 * the map is dropped whole. A vocabulary is far smaller than the cap, so in
 * practice this never fires; it exists so that a pathological input cannot
 * grow the map without end.
 */
const MAX_PRONUNCIATION_CACHE = 4_000;

let pronunciationCache = new Map<
  string,
  { pinyin: string | null; zhuyin: string | null }
>();

function computeChinesePronunciation(text: string): {
  pinyin: string | null;
  zhuyin: string | null;
} {
  const cached = pronunciationCache.get(text);
  if (cached) return cached;

  const computed = convertChinesePronunciation(text);

  if (pronunciationCache.size >= MAX_PRONUNCIATION_CACHE) {
    pronunciationCache = new Map();
  }
  pronunciationCache.set(text, computed);

  return computed;
}

function convertChinesePronunciation(text: string): {
  pinyin: string | null;
  zhuyin: string | null;
} {
  if (!/[\u4e00-\u9fff]/.test(text)) return { pinyin: null, zhuyin: null };

  /*
   * Taiwan's readings, from Traditional text (lib/chinese/taiwanReadings.ts).
   * This used to call pinyin-pro twice — once for pinyin, once numbered for
   * zhuyin — without its Traditional table, so a Traditional word lost its
   * context and 銀行 read yín xíng in both.
   */
  try {
    const readings = chineseReadings(text);
    return { pinyin: readings.pinyin || null, zhuyin: readings.zhuyin || null };
  } catch (error) {
    console.error("Failed to compute Chinese readings:", error);
    return { pinyin: null, zhuyin: null };
  }
}

/**
 * Legacy entry point: the Chinese half of a pair, named by language.
 *
 * Kept while the callers that pass `{ chinese }` are migrated to text plus a
 * language code. The field name is the declaration — `chinese` can only ever
 * have been zh-TW.
 */
export function getPronunciationData({
  english,
  chinese,
}: GetPronunciationDataInput): PronunciationData {
  const { pinyin: pinyinText, zhuyin: zhuyinText } =
    computeChinesePronunciation(chinese?.trim() ?? "");

  return {
    english: english?.trim() || null,
    pinyin: pinyinText,
    zhuyin: zhuyinText,
  };
}
