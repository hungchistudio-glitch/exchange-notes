import type { YumiLookTarget } from "@/hooks/pet/useYumiOrbitMenu";

/*
 * The Yumi Cosmic Command Halo — where things go, and why.
 *
 * The old expanded state placed its three keys at hand-tuned pixel offsets
 * inside a fixed 356x250 box. That worked exactly once, at the size Yumi
 * happened to be that week: when the hero grew, the keys stayed put and ended
 * up sitting on top of the character. There was no rule to violate, which is
 * the actual defect — not the overlap.
 *
 * So the layout is a rule now, and it lives here rather than in a stylesheet
 * because it is arithmetic, not paint. Three things decide a node's position:
 * its rank on the current surface, the tier that rank puts it in, and the
 * station its tier assigns. Nothing is placed by eye.
 */

/*
 * The safe radius, in multiples of Yumi's own radius R.
 *
 * The brief asks for no node centre inside 1.25R–1.4R. Both orbits sit in or
 * past that band, and the sizes below are chosen so the *inner edge* of a node
 * clears R as well — at the smallest hero the page renders (208px, so R = 104)
 * a primary node's inner edge lands at 113px and a utility's at 137px.
 *
 * The outer orbit is 1.5R rather than the 1.7–1.8R that would separate the two
 * rings more clearly, and that ceiling is measured rather than chosen: at 1.5R
 * a utility node's outer edge lands 3px inside a 320px viewport. Past that it
 * leaves the screen. The two rings are told apart by size and brightness
 * instead, which costs nothing and works at every width.
 */
export const PRIMARY_ORBIT = 1.32;
export const UTILITY_ORBIT = 1.5;

/*
 * The 270° halo, and the two bands inside it that nodes may actually occupy.
 *
 * Angles are degrees from 12 o'clock, positive clockwise.
 *
 * The gap at the bottom is the brief's, and its reasons are good: it gives the
 * expanded state an exit instead of caging the character, and it keeps the
 * halo off the Learning Core tray directly below.
 *
 * The gap at the *top* is measured. On the vocabulary page Yumi's centre sits
 * 154px below the top of the viewport with R = 109, so a node at 12 o'clock
 * would need 1.32R + half a node = 168px of headroom and has 154. It is not
 * close, and it does not get better on a smaller phone. So the top 80° is out
 * too, and what remains is two flanks — which is also where the room genuinely
 * is: 1.72R to either side against 1.42R above.
 *
 * Stations are listed in fill order, so a surface with two capabilities gets a
 * balanced pair rather than the first two of five.
 */
const PRIMARY_STATIONS = [-62, 62, 118];
const UTILITY_STATIONS = [-118, 118, -95];

/*
 * How many capabilities get the larger node.
 *
 * The brief says two or three. Roughly the top 60%, capped at three: three
 * capabilities split 2/1, five split 3/2, and a surface with two gets two
 * primaries rather than one of each, which is right — a hierarchy needs
 * something to be lower than, and one-of-each has nothing to say.
 */
function primaryCount(total: number) {
  return Math.min(3, Math.max(1, Math.ceil(total * 0.6)));
}

/*
 * The five capability categories and their colours, from the design's own
 * legend. Only the three the app can actually perform are here — assist
 * (詢問/幫助, blue) and memory (記憶/強化, teal) join this union on the day
 * there is something behind them to open, and not before. A category with no
 * capability is a colour looking for a meaning, which is the failure mode the
 * Learning Core palette was built to avoid.
 */
export type HaloCategory = "active" | "practice" | "create";

export type HaloTier = "primary" | "utility";

export type HaloCapabilityKey = "review" | "add" | "camera";

/** Which surface the halo was opened from. Decides the ranking below. */
export type HaloSurface = "vocabulary";

/*
 * Context ranking.
 *
 * The halo is not a fixed menu — the first orbit is supposed to carry whatever
 * matters where the user currently is. Today there is one surface, so there is
 * one row; the shape is what matters, because a Messages halo leading with
 * Decode and Reply Coach is a new row here and nothing else anywhere.
 */
const RANKING: Record<HaloSurface, HaloCapabilityKey[]> = {
  vocabulary: ["review", "add", "camera"],
};

const CATEGORY: Record<HaloCapabilityKey, HaloCategory> = {
  review: "practice",
  add: "create",
  camera: "active",
};

/* The eye's station for each capability. See .shell[data-look] in
   YumiMark.module.css — these are the directions Yumi already knows to look
   in, so the halo reuses them rather than inventing a parallel set. */
const LOOK: Record<HaloCapabilityKey, YumiLookTarget> = {
  review: "review",
  add: "add",
  camera: "camera",
};

export type HaloPlacement = {
  key: HaloCapabilityKey;
  category: HaloCategory;
  tier: HaloTier;
  look: YumiLookTarget;
  /** Degrees from 12 o'clock, clockwise. Drives the connector's rotation. */
  angle: number;
  /*
   * The station as a unit vector, so the stylesheet can multiply it by an
   * orbit radius expressed in Yumi's own size and never needs to know an
   * angle. Y is negative upward, matching screen coordinates.
   */
  x: number;
  y: number;
  /** Which orbit this tier rides, in multiples of R. */
  orbit: number;
};

/**
 * Places the capabilities a surface offers onto the halo.
 *
 * Ranked by surface, split into tiers, then assigned stations from that
 * tier's list. The result is fully determined by the input — there is no
 * state, no measurement and no per-screen special case, which is what makes
 * it something the CSS can simply follow.
 */
export function placeCapabilities(surface: HaloSurface): HaloPlacement[] {
  const ranked = RANKING[surface];
  const primaries = primaryCount(ranked.length);

  let primaryIndex = 0;
  let utilityIndex = 0;

  return ranked.map((key, rank) => {
    const tier: HaloTier = rank < primaries ? "primary" : "utility";
    const angle =
      tier === "primary"
        ? PRIMARY_STATIONS[primaryIndex++ % PRIMARY_STATIONS.length]
        : UTILITY_STATIONS[utilityIndex++ % UTILITY_STATIONS.length];

    const radians = (angle * Math.PI) / 180;

    return {
      key,
      category: CATEGORY[key],
      tier,
      look: LOOK[key],
      angle,
      x: Number(Math.sin(radians).toFixed(4)),
      // Negative, because 0° is straight up and screen Y grows downward.
      y: Number((-Math.cos(radians)).toFixed(4)),
      orbit: tier === "primary" ? PRIMARY_ORBIT : UTILITY_ORBIT,
    };
  });
}
