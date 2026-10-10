import type { InterfaceMode } from "@/lib/appPreferences";

/*
 * Crossing between the two homes (Chi, 2026-10-09: "極致完美絲滑").
 *
 * One veil, in the colour of the home being entered, fades over the screen;
 * the mode commits only once it is opaque; the veil holds until the new home
 * has actually drawn everything a reader would see; then it lifts. Nothing
 * the reader can see moves while the shells are swapped underneath.
 *
 * "Drawn" is not one event. Yumi's first frame arrives before the cookies
 * that float around her in Standard (they mount once the scene is live), so
 * lifting on her frame alone revealed a home whose cookies and star then
 * popped in a beat later. Each home lists what it needs; each part reports
 * itself once it is on screen.
 */

/** Something a home has to have painted before the veil may lift. */
export type HomeReadyPart = "scene" | "field";

export type HomeModeTransition = {
  target: InterfaceMode;
  step: "covering" | "waiting" | "revealing";
  /** The parts of the target home that have reported themselves drawn. */
  ready: readonly HomeReadyPart[];
};

/* Out of the old home quickly, into the new one unhurried. */
export const HOME_COVER_MS = 200;
export const HOME_REVEAL_MS = 320;
/** Only a safety net for a part that never reports, never the reveal clock. */
export const HOME_READY_TIMEOUT_MS = 1500;

const REQUIRED: Record<InterfaceMode, readonly HomeReadyPart[]> = {
  // Yumi's scene, then the floating cookies the scene's arrival mounts.
  standard: ["scene", "field"],
  "yumi-cosmic": ["scene"],
};

export function isHomeModeReady(transition: HomeModeTransition) {
  return REQUIRED[transition.target].every(part => transition.ready.includes(part));
}
