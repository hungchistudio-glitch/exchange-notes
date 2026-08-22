import type { LanguageCode } from "@/lib/languages";

export type PronunciationResult = {
  /**
   * Annotations keyed by system, absent for a system the language does not
   * use. Prefer this over the three fields below, which are the same answer
   * flattened into English/Chinese field names.
   */
  phonetics: Partial<Record<"ipa" | "pinyin" | "zhuyin", string>>;
  englishPronunciation: string;
  pinyin: string;
  zhuyin: string;
};

export async function getPronunciation(
  english: string,
  chinese: string,
): Promise<PronunciationResult | null> {
  try {
    const response = await fetch("/api/word-pronunciation", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        english,
        chinese,
      }),
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as PronunciationResult;
  } catch (error) {
    console.error(error);
    return null;
  }
}

/**
 * Phonetics for one piece of text, in the language it is actually in.
 *
 * The pair above asks in two languages at once and names its fields after
 * them; this asks about one and gets back only the systems that language
 * uses. Absent means "this language has no such annotation", which a
 * renderer should skip rather than draw empty.
 */
export async function getPhoneticsFor(
  text: string,
  language: LanguageCode,
): Promise<PronunciationResult["phonetics"]> {
  if (!text.trim()) return {};

  try {
    const response = await fetch("/api/word-pronunciation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, language }),
    });

    if (!response.ok) return {};

    const result = (await response.json()) as Partial<PronunciationResult>;
    return result.phonetics ?? {};
  } catch (error) {
    console.error(error);
    return {};
  }
}
