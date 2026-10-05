import { decodeNewsCardMessage, NEWS_CARD_MARKER } from "./newsCard";
import { decodeWordCardMessage, WORD_CARD_MARKER } from "./wordCard";

/** One readable preview for the inbox and push; never show encoded JSON. */
export function messagePreview(body: string): string {
  const word = decodeWordCardMessage(body);
  if (word) return word.word;
  const news = decodeNewsCardMessage(body);
  if (news) return Object.values(news.titles).find(Boolean) ?? news.sourceName;
  if (body.startsWith(WORD_CARD_MARKER)) return "Shared a vocabulary card.";
  if (body.startsWith(NEWS_CARD_MARKER)) return "Shared a news card.";
  return body;
}
