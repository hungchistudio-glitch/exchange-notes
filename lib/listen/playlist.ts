import { getLanguage, type LanguageCode } from "@/lib/languages";
import type { SpokenPart } from "@/lib/spokenWords";
import type { VocabularyItem } from "@/lib/types/app";
import type { DailyNewsCard } from "@/lib/types/dailyNews";

/* =========================================================
   What listening mode reads, in order (Chi, 2026-11-15: 通勤收聽模式)

   Today's due words first, each as the word, what it means and its example,
   so a walk or a ride is a review session with no screen to tap. Then the
   day's news, each story's title and summary. Everything in the reader's
   pair: the language they are learning, glossed in their own.
   ========================================================= */

export type ListenItem = {
  id: string;
  kind: "word" | "news";
  parts: SpokenPart[];
};

/** A session long enough for a ride, short enough to finish. */
export const MAX_WORDS = 20;
export const MAX_NEWS = 6;

const isDue = (item: VocabularyItem, now: number) =>
  !item.next_review_at || Date.parse(item.next_review_at) <= now;

const textIn = (texts: Record<string, string | undefined> | undefined, code: LanguageCode) =>
  texts?.[code]?.trim() ?? "";

export function wordItems(
  items: readonly VocabularyItem[],
  learning: LanguageCode,
  support: LanguageCode,
  now = Date.now(),
): ListenItem[] {
  const learningTag = getLanguage(learning).speechTag;
  const supportTag = getLanguage(support).speechTag;

  return items
    .filter((item) => isDue(item, now))
    .sort((a, b) => (Date.parse(a.next_review_at ?? "") || 0) - (Date.parse(b.next_review_at ?? "") || 0))
    .flatMap((item) => {
      const texts = item.texts as Record<string, string | undefined> | undefined;
      const word = textIn(texts, learning) || (item.word_language === learning ? item.word : "");
      if (!word) return [];
      const meaning = textIn(texts, support) || (item.translation_language === support ? item.translation : "");
      const examples = item.examples as Record<string, string | undefined> | undefined;
      const example = textIn(examples, learning) || (item.word_language === learning ? item.example_sentence ?? "" : "");
      const parts: SpokenPart[] = [{ text: word, lang: learningTag }];
      if (meaning) parts.push({ text: meaning, lang: supportTag });
      if (example.trim()) parts.push({ text: example.trim(), lang: learningTag });
      return [{ id: `word:${item.id}`, kind: "word" as const, parts }];
    })
    .slice(0, MAX_WORDS);
}

export function newsItems(cards: readonly DailyNewsCard[], learning: LanguageCode): ListenItem[] {
  const tag = getLanguage(learning).speechTag;
  return cards
    .flatMap((card) => {
      const title = card.titles[learning]?.trim() ?? "";
      const summary = card.summaries[learning]?.trim() ?? "";
      if (!title && !summary) return [];
      const parts: SpokenPart[] = [];
      if (title) parts.push({ text: title, lang: tag });
      if (summary) parts.push({ text: summary, lang: tag });
      return [{ id: `news:${card.id}`, kind: "news" as const, parts }];
    })
    .slice(0, MAX_NEWS);
}
