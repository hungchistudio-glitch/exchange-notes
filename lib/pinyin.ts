import { chineseReadings } from "@/lib/chinese/taiwanReadings";

/**
 * Convert a Traditional Chinese word into Hanyu Pinyin with tone marks, as
 * Taiwan reads it (lib/chinese/taiwanReadings.ts).
 * Returns null if the input contains no Chinese characters (e.g. an
 * English vocabulary item), so callers can skip rendering pinyin for it.
 */
export function toPinyin(word: string): string | null {
  const hasChinese = /[一-鿿]/.test(word);
  if (!hasChinese) return null;

  return chineseReadings(word).pinyin;
}
