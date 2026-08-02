export const WORD_CARD_MARKER = "\u27E7EXCHANGE_NOTES_WORD\u27E8";

export type SharedWordCard = {
  word: string;
  translation: string;
  partOfSpeech?: string | null;
  englishExample?: string | null;
  chineseExample?: string | null;
};

export function encodeWordCardMessage(card: SharedWordCard): string {
  return WORD_CARD_MARKER + JSON.stringify(card);
}

export function decodeWordCardMessage(body: string): SharedWordCard | null {
  if (!body.startsWith(WORD_CARD_MARKER)) return null;

  try {
    const parsed = JSON.parse(
      body.slice(WORD_CARD_MARKER.length),
    ) as Partial<SharedWordCard>;

    if (typeof parsed.word !== "string" || typeof parsed.translation !== "string") {
      return null;
    }

    return {
      word: parsed.word,
      translation: parsed.translation,
      partOfSpeech: parsed.partOfSpeech ?? null,
      englishExample: parsed.englishExample ?? null,
      chineseExample: parsed.chineseExample ?? null,
    };
  } catch {
    return null;
  }
}
