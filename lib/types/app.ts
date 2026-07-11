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

export type VocabularyItem = {
  id: string;
  word: string;
  translation: string;
  language: AppLanguage;
  part_of_speech: string | null;
  example_sentence: string | null;
  image_url: string | null;
  status: "new" | "learning" | "mastered";
  created_at: string;
};

export type MessageType =
  | "text"
  | "image"
  | "vocabulary"
  | "grammar";
