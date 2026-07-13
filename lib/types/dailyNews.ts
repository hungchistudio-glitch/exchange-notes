export type VocabularyItem = {
  word: string;
  translation: string;
  partOfSpeech: string;
  englishExample: string;
  chineseExample: string;
};

export type DailyNewsCard = {
  id: string;
  category: string;
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