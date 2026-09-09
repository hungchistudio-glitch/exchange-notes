"use client";

/* =========================================================
   Whether the opening is on screen

   Two things need to agree about this and they are not near each other in
   the tree: SplashGate, which owns the overlay, and RouteStage, which must
   not run a route transition underneath it.

   It matters because a view transition's snapshots are rendered in the
   browser's top layer — above everything, including the overlay's
   z-index: 1000. A route transition running while the opening is up
   therefore paints the page *over* the opening, which is exactly the flash
   of the home screen this exists to prevent.

   A module-level store rather than a context: the two components sit on
   opposite sides of several providers, and threading a boolean through all
   of them to answer "is the opening up" would put that question in the props
   of things that have no other reason to know.
   ========================================================= */

let launching = true;

const listeners = new Set<() => void>();

export function setLaunching(value: boolean) {
  if (launching === value) return;

  launching = value;
  for (const listener of listeners) listener();
}

export function subscribeToLaunching(listener: () => void) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function isLaunching() {
  return launching;
}

/*
 * True on the server and for the hydrating render.
 *
 * The opening is up at that point by definition — it is rendered in the same
 * HTML — so answering anything else here would mean the first client render
 * disagreed with the server about whether to place a transition boundary.
 */
export function isLaunchingOnServer() {
  return true;
}
