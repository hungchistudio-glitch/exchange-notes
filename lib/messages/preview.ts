import { decodeNewsCardMessage, NEWS_CARD_MARKER } from "./newsCard";
import { decodeWordCardMessage, WORD_CARD_MARKER } from "./wordCard";

/**
 * What a preview may say in the reader's language: the languages they read,
 * best first, and the line for a card that could not be read. The English
 * defaults are for callers that have no reader yet.
 */
export type MessagePreviewOptions = {
  languages?: readonly string[];
  sharedWordCard?: string;
  sharedNewsCard?: string;
};

/** One readable preview for the inbox and push; never show encoded JSON. */
export function messagePreview(
  body: string,
  {
    languages = [],
    sharedWordCard = "Shared a vocabulary card.",
    sharedNewsCard = "Shared a news card.",
  }: MessagePreviewOptions = {},
): string {
  const word = decodeWordCardMessage(body);
  if (word) return word.word;
  const news = decodeNewsCardMessage(body);
  if (news) {
    /*
     * The headline in a language the reader reads, not whichever one the
     * card happens to list first: a Traditional Chinese reader was shown the
     * English title of every story a friend sent.
     */
    const titles = news.titles as Record<string, string | undefined>;
    const readable = languages.map((language) => titles[language]).find(Boolean);
    return readable ?? Object.values(titles).find(Boolean) ?? news.sourceName;
  }
  if (body.startsWith(WORD_CARD_MARKER)) return sharedWordCard;
  if (body.startsWith(NEWS_CARD_MARKER)) return sharedNewsCard;
  return body;
}
