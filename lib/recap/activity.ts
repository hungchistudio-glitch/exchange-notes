import { createClient } from "@/lib/supabase/client";
import { getSessionUser } from "@/lib/supabase/sessionUser";
import type { AttemptRow, ReviewRow } from "@/lib/recap/weekly";

const DAY_MS = 86_400_000;

/**
 * The reader's reviews and Lab practice over the last `days`, for the
 * weekly recap and the milestones (lib/recap/milestones.ts). Each table's
 * own-row policy keeps it to the reader's own.
 */
export async function loadActivity(days = 30): Promise<{ reviews: ReviewRow[]; attempts: AttemptRow[] }> {
  const supabase = createClient();
  const user = await getSessionUser(supabase);
  if (!user) return { reviews: [], attempts: [] };
  const since = new Date(Date.now() - days * DAY_MS).toISOString();
  const [reviews, attempts] = await Promise.all([
    supabase.from("review_events").select("vocabulary_item_id, grade, created_at").eq("user_id", user.id).gte("created_at", since),
    supabase.from("pronunciation_attempts").select("score, created_at").eq("user_id", user.id).gte("created_at", since),
  ]);
  return {
    reviews: (reviews.data ?? []) as ReviewRow[],
    attempts: (attempts.data ?? []) as AttemptRow[],
  };
}
