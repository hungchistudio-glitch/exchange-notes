/* =========================================================
   One set of six at a time (Chi, 2026-11-12)

   The Cosmic home's orbit of six features and the star core's rail at the
   foot of the screen are two ways to the same places. Only one is ever
   open: opening either closes the other. Each says when it opens and who
   it is; neither says anything when it closes, so the two can never set
   each other off.
   ========================================================= */

export type DisclosureSource = "home-orbit" | "core-rail";

const listeners = new Set<(source: DisclosureSource) => void>();

/** Say that this one has just been opened by the reader. */
export function announceOpened(source: DisclosureSource) {
  for (const listener of [...listeners]) listener(source);
}

/** Close this one whenever the other opens. Returns the unsubscribe. */
export function closeWhenOtherOpens(self: DisclosureSource, close: () => void) {
  const listener = (source: DisclosureSource) => {
    if (source !== self) close();
  };
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
