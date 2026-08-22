import {
  DEFAULT_LEARNING_PAIR,
  compactByLanguage,
  type ByLanguage,
} from "@/lib/languages";

export type VocabularyItem = {
  /**
   * The word itself, in each language the card carries.
   *
   * Was `word` and `translation` — two slots, which is why a card generated
   * for one pairing was useless to a reader with a different one.
   */
  texts: ByLanguage;
  partOfSpeech: string;
  /** The example sentence in each language it exists in. */
  examples: ByLanguage;
};

/**
 * A Daily News card, in one place.
 *
 * There were three of these — this file, lib/dailyNews.ts and
 * components/discover/types.ts — with the same fields written out three
 * times. Keying titles by language in three independent definitions is how
 * two of them end up disagreeing, so they became one; the other two re-export
 * from here.
 */
export type DailyNewsCard = {
  id: string;
  /*
   * The pool row this card came from, which is what the seen table keys on.
   * Absent on cards read from anywhere but the pool, which is why it is
   * optional rather than required.
   */
  itemId?: string;
  category: string;
  titles: ByLanguage;
  summaries: ByLanguage;
  captions: ByLanguage;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string;
  imageUrl: string | null;
  vocabulary: VocabularyItem[];
};

/*
 * The shape these cards were stored in before the language moved out of the
 * field names.
 *
 * Sixty-nine of them are sitting in daily_news_items as jsonb, and one batch
 * more in the cache table the pool replaced. The pool prunes on a fourteen-day
 * retention, so this reader has an end date rather than being permanent the
 * way the word cards are — but it has to exist until then, or every reader's
 * feed goes blank on deploy.
 */
type LegacyVocabularyItem = {
  word?: string;
  translation?: string;
  partOfSpeech?: string;
  englishExample?: string;
  chineseExample?: string;
  examples?: ByLanguage;
  texts?: ByLanguage;
};

type LegacyNewsCard = {
  englishTitle?: string;
  chineseTitle?: string;
  englishSummary?: string;
  chineseSummary?: string;
  englishCaption?: string | null;
  chineseCaption?: string | null;
  vocabulary?: LegacyVocabularyItem[];
};

const [FIRST, SECOND] = DEFAULT_LEARNING_PAIR;

/**
 * Reads a stored card in either shape.
 *
 * A card that already has `titles` is taken as-is; anything else is read
 * through the pair the app taught when it was written, which is the only
 * pair it can have been.
 */
export function readDailyNewsCard(value: unknown): DailyNewsCard | null {
  if (!value || typeof value !== "object") return null;

  const raw = value as Partial<DailyNewsCard> & LegacyNewsCard;

  const titles = raw.titles
    ? compactByLanguage(raw.titles)
    : compactByLanguage({
        [FIRST]: raw.englishTitle ?? "",
        [SECOND]: raw.chineseTitle ?? "",
      });

  if (Object.keys(titles).length === 0) return null;

  const summaries = raw.summaries
    ? compactByLanguage(raw.summaries)
    : compactByLanguage({
        [FIRST]: raw.englishSummary ?? "",
        [SECOND]: raw.chineseSummary ?? "",
      });

  const captions = raw.captions
    ? compactByLanguage(raw.captions)
    : compactByLanguage({
        [FIRST]: raw.englishCaption ?? "",
        [SECOND]: raw.chineseCaption ?? "",
      });

  // Read off the raw value rather than the intersection: the new and legacy
  // vocabulary shapes share a field name, and letting the union collapse to
  // one of them is how the other silently stops being read.
  const rawVocabulary = Array.isArray(raw.vocabulary)
    ? (raw.vocabulary as LegacyVocabularyItem[])
    : [];

  const vocabulary = rawVocabulary
    .filter(
      (item) =>
        !!item &&
        typeof item.word === "string" &&
        typeof item.translation === "string",
    )
    .map((item) => ({
      texts: item.texts
        ? compactByLanguage(item.texts)
        : compactByLanguage({
            [FIRST]: item.word ?? "",
            [SECOND]: item.translation ?? "",
          }),
      partOfSpeech: item.partOfSpeech ?? "",
      examples: item.examples
        ? compactByLanguage(item.examples)
        : compactByLanguage({
            [FIRST]: item.englishExample ?? "",
            [SECOND]: item.chineseExample ?? "",
          }),
    }));

  return {
    id: typeof raw.id === "string" ? raw.id : "",
    ...(typeof raw.itemId === "string" ? { itemId: raw.itemId } : {}),
    category: typeof raw.category === "string" ? raw.category : "",
    titles,
    summaries,
    captions,
    sourceName: typeof raw.sourceName === "string" ? raw.sourceName : "",
    sourceUrl: typeof raw.sourceUrl === "string" ? raw.sourceUrl : "",
    publishedAt: typeof raw.publishedAt === "string" ? raw.publishedAt : "",
    imageUrl: typeof raw.imageUrl === "string" ? raw.imageUrl : null,
    vocabulary,
  };
}
