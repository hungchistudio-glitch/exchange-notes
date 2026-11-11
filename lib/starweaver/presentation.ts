import { revealProgress, type HangyumiGuessResult, type HangyumiRound } from "@/lib/hangyumi/rules";

/* =========================================================
   Yumi Starweaver｜織星者: what each guess looks like (Chi, 2026-11-10)

   The same rounds as Hangyumi and Wordvault, from the same server; only the
   stage differs. The word is a star chart Yumi weaves: each place a right
   letter fills becomes a piece of light on the track to a star gate, so the
   P of APPLE lights two at once (paid once). A wrong guess sends an energy
   copy of her U, then her I, then her O out to the gate's orbit; she stays
   whole. Lost, the copies come home and the gate stays shut, though the
   answer is shown. Won, the copies come home, the track closes, the gate
   opens, she sails through and back; the seventh voyage brings a relic
   back with her.

   This file only plans the show, from the round before a guess and the
   round after it. Nothing here, skipped or replayed, can pay or award:
   what a guess paid, and any relic, is what the server said.

   Timings are the design book's (handoffs/yumi-starweaver/DESIGN.md §3),
   and none depends on the word's length or level: a C2 word never waits
   longer than a B1 one.
   ========================================================= */

export type WeavePhase =
  /** Letters become light and join the track. */
  | "weave"
  /** A copy of U, I or O leaves for the gate's orbit. */
  | "release"
  /** Every copy out comes home. */
  | "recall"
  /** The track closes into a loop at the gate. */
  | "close"
  /** The gate opens; she sails through and back. */
  | "voyage"
  /** A relic comes back with her, under a quiet light. */
  | "relic";

export type WeaveBeat = {
  phase: WeavePhase;
  seconds: number;
  /** How much of the track is lit at the beat's end, 0 to 1. */
  progress: number;
  /** For a weave: the places (in word order, letters only) it lights. */
  places?: number[];
  /** For a release: which copy, 0 (U) to 2 (O). */
  piece?: number;
};

/** The places a round's guesses have filled, in word order, letters only. */
export function litPlaces(round: Pick<HangyumiRound, "slots" | "guessed">): number[] {
  const lit: number[] = [];
  let place = 0;
  for (const slot of round.slots) {
    if (!slot.letter) continue;
    if (slot.char !== null && round.guessed.includes(slot.char.normalize("NFC").toLocaleLowerCase())) lit.push(place);
    place += 1;
  }
  return lit;
}

/* §3: a letter's light 280–420 ms; several places at once, one batch, at most 500 ms. */
const WEAVE_ONE_S = 0.36;
const WEAVE_MANY_S = 0.5;
/* The last letter of a won word, kept short so the whole win fits 1.6–2.2 s. */
const WEAVE_LAST_S = 0.3;
/* §3: a copy leaving 450–600 ms; the third and its return 900–1200 ms together. */
const RELEASE_S = 0.52;
const RELEASE_THIRD_S = 0.38;
const RECALL_LOST_S = 0.68;
const RECALL_WON_S = 0.4;
const CLOSE_S = 0.3;
const VOYAGE_S = 1.2;
/* §3: the seventh's relic, at most 900 ms more. */
const RELIC_S = 0.85;

/** The beats one guess plays, from the round before it to the one after. */
export function plan(before: HangyumiRound, after: HangyumiGuessResult | HangyumiRound): WeaveBeat[] {
  if ("repeat" in after && after.repeat) return [];
  const from = revealProgress(before);
  const to = revealProgress(after);
  const beats: WeaveBeat[] = [];
  const won = after.status === "won";
  const lost = after.status === "lost";

  /* Only places a guess filled: a lost round's answer, shown in full, is
     never woven. */
  const was = new Set(litPlaces(before));
  const fresh = litPlaces(after).filter(place => !was.has(place));
  if (fresh.length) {
    beats.push({
      phase: "weave",
      seconds: won ? WEAVE_LAST_S : fresh.length > 1 ? WEAVE_MANY_S : WEAVE_ONE_S,
      progress: to.fraction,
      places: fresh,
    });
  } else if (after.misses > before.misses) {
    beats.push({
      phase: "release",
      seconds: lost ? RELEASE_THIRD_S : RELEASE_S,
      progress: from.fraction,
      piece: Math.min(2, after.misses - 1),
    });
  }

  if (lost) {
    beats.push({ phase: "recall", seconds: RECALL_LOST_S, progress: from.fraction });
  } else if (won) {
    if (after.misses > 0) beats.push({ phase: "recall", seconds: RECALL_WON_S, progress: 1 });
    beats.push({ phase: "close", seconds: CLOSE_S, progress: 1 });
    beats.push({ phase: "voyage", seconds: VOYAGE_S, progress: 1 });
    if (after.starweaver?.award) beats.push({ phase: "relic", seconds: RELIC_S, progress: 1 });
  }
  return beats;
}

/** How long a plan takes, for tests and the skip button's promise. */
export function duration(beats: readonly WeaveBeat[]): number {
  return beats.reduce((sum, beat) => sum + beat.seconds, 0);
}
