export type AppLanguage =
  | "english"
  | "traditional-chinese";

export type Profile = {
  id: string;
  display_name: string;
  exchange_id: string;
  avatar_url: string | null;
  native_language: AppLanguage;
  learning_language: AppLanguage;
  city: string | null;
  discoverable: boolean;
};

export type VocabularyStatus = "new" | "learning" | "mastered";

export type VocabularyCategory =
  | "people"
  | "objects"
  | "actions"
  | "other";

export type VocabularyItem = {
  id: string;
  user_id: string;
  word: string;
  translation: string;
  language: AppLanguage;
  category: VocabularyCategory;
  part_of_speech: string | null;
  example_sentence: string | null;
  translated_example: string | null;
  image_url: string | null;
  confidence: "high" | "medium" | "low" | null;
  status: VocabularyStatus;
  created_at: string;
  updated_at: string;
};

export type MessageType =
  | "text"
  | "image"
  | "vocabulary"
  | "grammar";
