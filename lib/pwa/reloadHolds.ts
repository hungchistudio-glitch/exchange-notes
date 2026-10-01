import { useEffect } from "react";

/* =========================================================
   Things a reload would throw away

   The app reloads itself onto a newer build when it comes back from the
   background (lib/pwa/appUpdate.ts) — but not while one of these is held:
   a camera is open, the microphone is live, a menu is on screen.

   Its own small file, with no imports of its own beyond React, because the
   voice key that holds it sits on the home screen and the word list, whose
   first-render graphs are kept short (tests/routeImportWeight.test.ts).
   ========================================================= */

const holds = new Set<symbol>();

/** Keep the app from reloading itself until the returned function is called. */
export function holdReload(): () => void {
  const token = Symbol("reload hold");
  holds.add(token);
  return () => {
    holds.delete(token);
  };
}

export function reloadHeld(): boolean {
  return holds.size > 0;
}

/** Holds while `active` — for a component's whole life by default. */
export function useReloadHold(active = true) {
  useEffect(() => {
    if (!active) return;
    return holdReload();
  }, [active]);
}
