// Mirrors lib/messages/wordCard.ts's marker-prefixed-JSON pattern: a "news
// card" message is just a plain messages.body string that starts with this
// marker followed by JSON. There is no separate `type` column on the
// messages table, so decoding is done by sniffing the body string at
// render time (see ConversationThread.tsx).
export const NEWS_CARD_MARKER = "⟧EXCHANGE_NOTES_NEWS⟨";

export type SharedNewsVocabularyItem = {
  word: string;
  translation: string;
  partOfSpeech?: string | null;
  englishExample?: string | null;
  chineseExample?: string | null;
};

export type SharedNewsCard = {
  englishTitle: string;
  chineseTitle: string;
  englishSummary: string;
  chineseSummary: string;
  vocabulary: SharedNewsVocabularyItem[];
  sourceName: string;
  sourceUrl: string;
};

export function encodeNewsCardMessage(card: SharedNewsCard): string {
  return NEWS_CARD_MARKER + JSON.stringify(card);
}

export function decodeNewsCardMessage(body: string): SharedNewsCard | null {
  if (!body.startsWith(NEWS_CARD_MARKER)) return null;

  try {
    const parsed = JSON.parse(
      body.slice(NEWS_CARD_MARKER.length)
    ) as Partial<SharedNewsCard>;

    if (
      typeof parsed.englishTitle !== "string" ||
      typeof parsed.chineseTitle !== "string" ||
      typeof parsed.englishSummary !== "string" ||
      typeof parsed.chineseSummary !== "string"
    ) {
      return null;
    }

    const vocabulary = Array.isArray(parsed.vocabulary)
      ? parsed.vocabulary.filter(
          (item): item is SharedNewsVocabularyItem =>
            !!item &&
            typeof item.word === "string" &&
            typeof item.translation === "string"
        )
      : [];

    return {
      englishTitle: parsed.englishTitle,
      chineseTitle: parsed.chineseTitle,
      englishSummary: parsed.englishSummary,
      chineseSummary: parsed.chineseSummary,
      vocabulary,
      sourceName: typeof parsed.sourceName === "string" ? parsed.sourceName : "",
      sourceUrl: typeof parsed.sourceUrl === "string" ? parsed.sourceUrl : "",
    };
  } catch {
    return null;
  }
}
