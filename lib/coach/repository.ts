import type { SupabaseClient } from "@supabase/supabase-js";

import type { CoachLesson } from "@/lib/coach/types";
import type { VocabularyItem } from "@/lib/types/app";

export async function getCoachVocabulary(
  supabase: SupabaseClient,
  userId: string
): Promise<VocabularyItem[]> {
  const { data, error } = await supabase
    .from("vocabulary_items")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;

  return (data ?? []) as VocabularyItem[];
}

export async function saveCoachLesson(
  supabase: SupabaseClient,
  userId: string,
  lesson: CoachLesson
): Promise<void> {
  const { error } = await supabase
    .from("ai_lessons")
    .insert({
      user_id: userId,
      title: lesson.title,
      introduction: lesson.introduction,
      selected_words: lesson.words,
      story: lesson.story,
      story_translation: lesson.storyTranslation,
      dialogue: lesson.dialogue,
      grammar_notes: lesson.grammarNotes,
      quiz: lesson.quiz,
      status: "generated",
    });

  if (error) throw error;
}
