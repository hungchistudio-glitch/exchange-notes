import type { CoachWord } from "@/lib/coach/types";
import type { VocabularyItem } from "@/lib/types/app";

const PRIORITY: Record<VocabularyItem["status"], number> = {
  new: 0,
  learning: 1,
  mastered: 2,
};

const retention = (item: VocabularyItem) =>
  item.retention_score ??
  (item.status === "mastered" ? 100 : 0);

const mapWord = (item: VocabularyItem): CoachWord => ({
  id: item.id,
  word: item.word,
  translation: item.translation,
  language: item.language,
  partOfSpeech: item.part_of_speech,
  exampleSentence: item.example_sentence,
  status: item.status,
  retentionScore: item.retention_score ?? null,
});

export function selectCoachWords(
  items: VocabularyItem[],
  limit = 8
): CoachWord[] {
  return items
    .toSorted(
      (a, b) =>
        PRIORITY[a.status] - PRIORITY[b.status] ||
        retention(a) - retention(b) ||
        Date.parse(b.created_at) - Date.parse(a.created_at)
    )
    .slice(0, limit)
    .map(mapWord);
}
