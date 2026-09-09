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

/**
 * Phonetics for the two sides of one lookup, each asked for in its own
 * language.
 *
 * The pair form above names its fields `english` and `chinese`, which was
 * the truth when there were two languages. Callers that still hold a
 * primary/secondary pair should use this instead: it asks about Italian as
 * Italian rather than sending it to an English dictionary and rendering
 * whatever comes back.
 *
 * Merged into the flat shape those callers already render, with each system
 * taken from whichever side actually has it — a language contributes only
 * the annotations it uses, so the two never compete for the same field.
 */
export async function getPronunciationForPair(
  primary: { text: string; language: LanguageCode },
  secondary: { text: string; language: LanguageCode },
): Promise<PronunciationResult> {
  const [first, second] = await Promise.all([
    getPhoneticsFor(primary.text, primary.language),
    getPhoneticsFor(secondary.text, secondary.language),
  ]);

  const phonetics = { ...second, ...first };

  return {
    phonetics,
    englishPronunciation: phonetics.ipa ?? "",
    pinyin: phonetics.pinyin ?? "",
    zhuyin: phonetics.zhuyin ?? "",
  };
}
