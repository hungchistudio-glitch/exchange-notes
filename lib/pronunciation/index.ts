import { pinyin } from "pinyin-pro";
import { p2z } from "pinyin-to-zhuyin";
import { toPinyin } from "@/lib/pinyin";
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
function computeChinesePronunciation(text: string): {
  pinyin: string | null;
  zhuyin: string | null;
} {
  const hasChinese = /[\u4e00-\u9fff]/.test(text);

  let pinyinText: string | null = null;
  let zhuyinText: string | null = null;

  if (hasChinese) {
    pinyinText = toPinyin(text);

    try {
      const numberedPinyin = pinyin(text, {
        toneType: "num",
        type: "string",
      });

      // pinyin-pro marks neutral tone as "0" (e.g. "de0" for 的), but the
      // pinyin-to-zhuyin converter only recognizes "5" (or no digit) as
      // neutral tone. Left as "0", it doesn't get converted to the
      // light-dot prefix and instead leaks a literal "0" into the output
      // (e.g. "˙ㄉㄜ0" instead of "˙ㄉㄜ") for every neutral-tone
      // character — which is extremely common (的/了/嗎/呢/嗎/著...).
      const normalizedPinyin = numberedPinyin.replace(/0\b/g, "5");

      zhuyinText = p2z(normalizedPinyin, { tonemarks: true });
    } catch (error) {
      console.error("Failed to convert pinyin to zhuyin:", error);
      zhuyinText = null;
    }
  }

  return { pinyin: pinyinText, zhuyin: zhuyinText };
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
