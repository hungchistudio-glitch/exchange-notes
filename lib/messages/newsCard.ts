import { compactByLanguage, type ByLanguage } from "@/lib/languages";
import { readDailyNewsCard } from "@/lib/types/dailyNews";

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
  examples?: ByLanguage;
};

export type SharedNewsCard = {
  titles: ByLanguage;
  summaries: ByLanguage;
  vocabulary: SharedNewsVocabularyItem[];
  sourceName: string;
  sourceUrl: string;
};

export function encodeNewsCardMessage(card: SharedNewsCard): string {
  const titles = compactByLanguage(card.titles);
  const summaries = compactByLanguage(card.summaries);

  return (
    NEWS_CARD_MARKER +
    JSON.stringify({
      titles,
      summaries,
      vocabulary: card.vocabulary,
      sourceName: card.sourceName,
      sourceUrl: card.sourceUrl,
      /*
       * Written for the same reason the word card writes its old fields: a
       * copy of this app from before today can still be open on a phone, and
       * it reads a news card from these four keys and refuses to render one
       * without them. Write-only — nothing below reads them back.
       */
      englishTitle: titles.en ?? "",
      chineseTitle: titles["zh-TW"] ?? "",
      englishSummary: summaries.en ?? "",
      chineseSummary: summaries["zh-TW"] ?? "",
    })
  );
}

export function decodeNewsCardMessage(body: string): SharedNewsCard | null {
  if (!body.startsWith(NEWS_CARD_MARKER)) return null;

  try {
    const parsed = JSON.parse(body.slice(NEWS_CARD_MARKER.length)) as unknown;

    /*
     * The stored shape is a Daily News card minus the fields a shared one
     * does not carry, so the same reader handles both encodings here — the
     * two cards already in people's conversations included.
     */
    const card = readDailyNewsCard(parsed);
    if (!card || Object.keys(card.titles).length === 0) return null;

    const raw = parsed as { sourceName?: unknown; sourceUrl?: unknown };

    return {
      titles: card.titles,
      summaries: card.summaries,
      vocabulary: card.vocabulary.map((item) => ({
        word: item.word,
        translation: item.translation,
        partOfSpeech: item.partOfSpeech || null,
        examples: item.examples,
      })),
      sourceName: typeof raw.sourceName === "string" ? raw.sourceName : "",
      sourceUrl: typeof raw.sourceUrl === "string" ? raw.sourceUrl : "",
    };
  } catch {
    return null;
  }
}
