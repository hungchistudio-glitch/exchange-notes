import { compactByLanguage, type ByLanguage } from "@/lib/languages";
import { readDailyNewsCard } from "@/lib/types/dailyNews";

// Mirrors lib/messages/wordCard.ts's marker-prefixed-JSON pattern: a "news
// card" message is just a plain messages.body string that starts with this
// marker followed by JSON. There is no separate `type` column on the
// messages table, so decoding is done by sniffing the body string at
// render time (see ConversationThread.tsx).
export const NEWS_CARD_MARKER = "⟧EXCHANGE_NOTES_NEWS⟨";

export type SharedNewsVocabularyItem = {
  /** The word in each language the card carries — not a pair. */
  texts: ByLanguage;
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
  const trimMap = (values: ByLanguage, limit: number) => Object.fromEntries(
    Object.entries(compactByLanguage(values)).map(([language, text]) => [language, text!.slice(0, limit)]),
  ) as ByLanguage;
  const payload = {
    titles: trimMap(card.titles, 100),
    summaries: trimMap(card.summaries, 160),
    vocabulary: card.vocabulary.slice(0, 2).map(item => ({ texts: trimMap(item.texts, 40), partOfSpeech: item.partOfSpeech?.slice(0, 30) })),
    sourceName: card.sourceName.slice(0, 100),
    sourceUrl: card.sourceUrl.length <= 800 ? card.sourceUrl : "",
  };
  const encode = () => NEWS_CARD_MARKER + JSON.stringify(payload);
  // messages.body has a 2,000-character database constraint. Preserve all
  // five titles and the source; trim optional detail before sending.
  while (encode().length > 2000 && payload.vocabulary.length) payload.vocabulary.pop();
  for (const limit of [100, 60, 30, 0]) {
    if (encode().length <= 2000) break;
    payload.summaries = limit ? trimMap(card.summaries, limit) : {};
  }
  if (encode().length > 2000) payload.sourceUrl = "";
  if (encode().length > 2000) payload.titles = trimMap(card.titles, 30);
  return encode();
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
        texts: item.texts,
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
