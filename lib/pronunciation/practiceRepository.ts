import type { SupabaseClient } from "@supabase/supabase-js";

const TABLE = "pronunciation_practice_state";

export type UnitKind = "english" | "zhuyin";

// Best-effort, fire-and-forget increment of a sound's replay count —
// mirrors the same "optimistic, fail silently if not signed in or the
// table isn't there yet" pattern already used by lib/pet/repository.ts.
// Nothing in the UI blocks on this: the Pronunciation Lab works fully
// offline/signed-out, this just means practice history won't be
// remembered across visits until it resolves.
export async function recordPracticePlay(
  supabase: SupabaseClient,
  unitKind: UnitKind,
  unitId: string,
): Promise<void> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const now = new Date().toISOString();

    const { data: existing } = await supabase
      .from(TABLE)
      .select("replay_count")
      .eq("user_id", user.id)
      .eq("unit_kind", unitKind)
      .eq("unit_id", unitId)
      .maybeSingle();

    await supabase.from(TABLE).upsert({
      user_id: user.id,
      unit_kind: unitKind,
      unit_id: unitId,
      replay_count: ((existing as { replay_count: number } | null)?.replay_count ?? 0) + 1,
      last_practiced_at: now,
      updated_at: now,
    });
  } catch {
    // Non-critical — see comment above.
  }
}
