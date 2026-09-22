/*
 * Whether Yumi's ring is actually on screen.
 *
 * Standard Mode's home screen hides the dock, because the ring she opens
 * carries every key the dock has and she is the one it does not. But the ring
 * is drawn by the WebGL scene — on a device that cannot start one there is no
 * ring at all. That was survivable while the home still carried ten modules
 * with links of their own. It is not survivable now that the screen is only
 * Yumi: no dock and no ring is a screen with no way off it.
 *
 * So the dock asks this before hiding itself.
 *
 * Three states rather than a boolean, and the third is the point. "pending"
 * hides the dock exactly as before, which is what stops a dock flashing in
 * during the moment the scene is starting; only a real failure — the import
 * rejecting, the context refusing, or the scene simply never arriving —
 * brings it back. The normal path never sees a dock at all.
 */
export type YumiRingState = "pending" | "live" | "failed";

let state: YumiRingState = "pending";
const listeners = new Set<() => void>();

export function setYumiRingState(next: YumiRingState) {
  if (state === next) return;
  state = next;
  for (const listener of listeners) listener();
}

export function subscribeToYumiRing(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getYumiRingState(): YumiRingState {
  return state;
}

/*
 * The server has no WebGL and no opinion. Both renders agree on "pending",
 * so hydration has nothing to disagree about, and the real answer arrives a
 * frame later the same way the reader's own clock used to.
 */
export function getServerYumiRingState(): YumiRingState {
  return "pending";
}
