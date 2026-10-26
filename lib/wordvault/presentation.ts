import type { HangyumiGuessResult, HangyumiPiece, HangyumiRound } from "@/lib/hangyumi/rules";

/* =========================================================
   Yumi Wordvault｜詞語秘藏: what each guess looks like

   The same round as Hangyumi, from the same server: one word from the
   graded bank, the same cookies, the same 333 a day shared between the two
   games (Chi, 2026-10-26). Only the stage differs. Yumi walks a path to a
   chest: each place a right letter fills is a step, so the P of APPLE is
   two steps, though it is paid once. A wrong guess sends out an energy
   copy of one of the letters of her name, U, then I, then O (Hangyumi
   hangs them O, I, U), which strikes the chest and falls to the floor;
   Yumi herself stays whole. Won, the copies come home, the word's letters
   gather into a key and the chest opens; lost, the copies come home and
   she sets off again.

   This file only plans the show. Nothing here, skipped or replayed, can
   pay: what a guess paid is what the server said.
   ========================================================= */

/** The copies a wrong guess sends out, in order: U, I, O. */
export const VAULT_PIECES: readonly HangyumiPiece[] = ["body", "arm", "eye"];

export type VaultPhase = "step" | "projectile" | "restore" | "key" | "unlock" | "celebrate" | "recover";

export type VaultBeat = {
  phase: VaultPhase;
  seconds: number;
  /** How far along the path Yumi stands at the beat's end, 0 to 1. */
  progress: number;
  /** For a projectile: which copy, 0 (U) to 2 (O). */
  piece?: number;
};

/**
 * How far along the path the round has taken her: the places filled by a
 * guess. A lost round shows the whole answer, which must not carry her to
 * the chest.
 */
export function progress(round: HangyumiRound) {
  const places = round.slots.filter(slot => slot.letter);
  const revealed = places.filter(slot =>
    slot.char !== null && round.guessed.includes(slot.char.normalize("NFC").toLocaleLowerCase()),
  ).length;
  return { total: places.length, revealed, fraction: places.length ? revealed / places.length : 0 };
}

/** The beats one guess plays, from the round before it to the one after. */
export function plan(before: HangyumiRound, after: HangyumiGuessResult | HangyumiRound): VaultBeat[] {
  if ("repeat" in after && after.repeat) return [];
  const from = progress(before);
  const to = progress(after);
  const beats: VaultBeat[] = [];
  const hit = to.revealed > from.revealed;
  if (hit) {
    for (let place = from.revealed + 1; place <= to.revealed; place++) {
      beats.push({ phase: "step", seconds: 0.28, progress: place / to.total });
    }
  } else if (after.misses > before.misses) {
    beats.push({ phase: "projectile", seconds: 1.3, progress: from.fraction, piece: after.misses - 1 });
  }
  if (after.status !== "playing") {
    if (after.misses > 0) beats.push({ phase: "restore", seconds: 0.95, progress: to.fraction });
    if (after.status === "won") {
      beats.push(
        { phase: "key", seconds: 1.4, progress: 1 },
        { phase: "unlock", seconds: 1.1, progress: 1 },
        { phase: "celebrate", seconds: 0.9, progress: 1 },
      );
    } else {
      beats.push({ phase: "recover", seconds: 0.7, progress: to.fraction });
    }
  }
  return beats;
}
