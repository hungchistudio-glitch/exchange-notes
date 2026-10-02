// Deterministic local review data. Never imported by the signed-in home.
import type { VocabularyItem } from "@/lib/types/app";
import type { LanguageCode } from "@/lib/languages";
const words: [string, string, LanguageCode, string][] = [
  ["serendipity", "美好的巧遇", "en", "It was a moment of serendipity."],
  ["lumière", "光", "fr", "La lumière entre par la fenêtre."],
  ["ciao", "你好", "it", "Ciao, come stai?"],
  ["你好", "hello", "zh-TW", "你好，很高興認識你。"],
  ["mariposa", "蝴蝶", "es", "Una mariposa en el jardín."],
  ["bloom", "綻放", "en", "The flowers bloom in spring."],
  ["nuvola", "雲", "it", "Una nuvola nel cielo."],
  ["bonjour", "早安", "fr", "Bonjour, mon ami."],
  ["慢慢", "slowly", "zh-TW", "我們慢慢走。"],
  ["alegría", "喜悅", "es", "Qué alegría verte."],
  ["wonder", "驚奇", "en", "A sense of wonder."],
  ["sogno", "夢", "it", "Un sogno bellissimo."],
];
export const reviewWords: VocabularyItem[] = words.map(([word, translation, language, example], index) => ({
  id: `review-${index}`, user_id: "review", word, translation, language,
  word_language: language, translation_language: language === "zh-TW" ? "en" : "zh-TW",
  texts: {}, examples: {}, category: "other", favorite: false, part_of_speech: null,
  example_sentence: example, translated_example: null, image_url: null, confidence: null,
  status: "learning", created_at: "2026-10-01T00:00:00Z", updated_at: "2026-10-01T00:00:00Z",
}));
