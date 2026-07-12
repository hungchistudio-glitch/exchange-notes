import { pinyin } from "pinyin-pro";

/**
 * Convert a Traditional Chinese word into Hanyu Pinyin with tone marks.
 * Returns null if the input contains no Chinese characters (e.g. an
 * English vocabulary item), so callers can skip rendering pinyin for it.
 */
export function toPinyin(word: string): string | null {
  const hasChinese = /[\u4e00-\u9fff]/.test(word);
  if (!hasChinese) return null;

  return pinyin(word, { toneType: "symbol", type: "string" });
}
