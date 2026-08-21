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
