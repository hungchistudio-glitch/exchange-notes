export type VocabularyItem = {
  word: string;
  translation: string;
  partOfSpeech: "noun" | "verb" | "adjective" | "adverb" | "phrase";
  englishExample: string;
  chineseExample: string;
};

export type DailyNewsCard = {
  id: string;

  category:
    | "World"
    | "Politics"
    | "Business"
    | "Technology"
    | "Science"
    | "Climate"
    | "Health"
    | "Culture";

  englishTitle: string;
  chineseTitle: string;

  englishSummary: string;
  chineseSummary: string;

  sourceName: string;
  sourceUrl: string;

  publishedAt: string;

  imageUrl: string | null;

  vocabulary: VocabularyItem[];

  aiEnhanced: boolean;
};

export type CachedNews = {
  cards: DailyNewsCard[];

  generatedAt: string;

  freshUntil: string;

  staleUntil: string;
};