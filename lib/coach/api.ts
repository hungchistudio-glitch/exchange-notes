import type {
  CoachLesson,
  CoachWord,
} from "@/lib/coach/types";

type GenerateLessonResponse = {
  lesson?: CoachLesson;
  error?: string;
};

export async function generateCoachLesson(
  words: CoachWord[]
): Promise<CoachLesson> {
  const response = await fetch("/api/coach/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ words }),
  });

  const data =
    (await response.json()) as GenerateLessonResponse;

  if (!response.ok || !data.lesson) {
    throw new Error(
      data.error || "Could not generate lesson."
    );
  }

  return data.lesson;
}
