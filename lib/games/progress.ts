import type { SupabaseClient } from "@supabase/supabase-js";

/* =========================================================
   The games hub's progress row (Chi, 2026-11-12: "你的收藏進度")

   One read for the three cards on /games, public.games_progress
   (supabase/migrations/*_games_progress.sql): how far the reader is towards
   each game's next piece. It only reads; every award is still decided by
   private.hangyumi_guess.

   - hangyumi    Nightscale: three wins to a piece, 24 pieces.
   - starweaver  Seven voyages to a relic, 17 relics.
   - wordvault   The streak towards the chests: the 4th word a medium one,
                 the 7th a premium one, after which it starts again.
   ========================================================= */

export type CollectionProgress = {
  /** Where the reader stands in this cycle: 0 right after a piece. */
  cycleProgress: number;
  cycleLength: number;
  collectedCount: number;
  collectionSize: number;
  collectionComplete: boolean;
};

export type GamesProgress = {
  hangyumi: CollectionProgress;
  starweaver: CollectionProgress;
  wordvault: { streak: number; streakLength: number };
};

/** The words in a Wordvault streak that hold a chest: the 4th and the 7th. */
export const WORDVAULT_CHEST_AT = [4, 7] as const;

function count(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}

function readCollection(value: unknown, cycle: number, size: number): CollectionProgress {
  const row = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const cycleLength = count(row.cycleLength) || cycle;
  const collectionSize = count(row.collectionSize) || size;
  const collectedCount = Math.min(collectionSize, count(row.collectedCount));
  return {
    cycleProgress: Math.min(cycleLength - 1, count(row.cycleProgress)),
    cycleLength,
    collectedCount,
    collectionSize,
    collectionComplete: row.collectionComplete === true || collectedCount >= collectionSize,
  };
}

/** What public.games_progress answers, read defensively. */
export function readGamesProgress(value: unknown): GamesProgress {
  const row = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const vault = (row.wordvault && typeof row.wordvault === "object" ? row.wordvault : {}) as Record<string, unknown>;
  const streakLength = count(vault.streakLength) || 7;
  return {
    /* The sizes the shop ships (tests/gamesHub.test.tsx holds them to the
       collections), for a row that leaves them out. */
    hangyumi: readCollection(row.hangyumi, 3, 24),
    starweaver: readCollection(row.starweaver, 7, 17),
    wordvault: { streak: Math.min(streakLength - 1, count(vault.streak)), streakLength },
  };
}

/** The signed-in reader's progress, or null while the function is not on this database yet. */
export async function loadGamesProgress(supabase: SupabaseClient): Promise<GamesProgress | null> {
  const { data, error } = await supabase.rpc("games_progress");
  if (error?.code === "PGRST202" || error?.code === "42883") return null;
  if (error) throw new Error(error.message);
  return readGamesProgress(data);
}
