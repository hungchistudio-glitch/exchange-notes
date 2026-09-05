"use client";

import { useEffect, useState } from "react";

import ActiveLaunch from "@/components/launch/activeLaunch";

/**
 * The opening, on every load of a signed-in page.
 *
 * There used to be a sessionStorage flag here so it played "once per
 * session". In an installed PWA that is the wrong unit: iOS keeps the web
 * app's session alive across backgrounding, so the flag survived the app
 * being closed and reopened, and the opening played exactly once ever and
 * was silently skipped from then on. Reopening the app is precisely when an
 * opening animation is supposed to run.
 *
 * There is no gate now. It plays whenever this layout mounts, which is once
 * per document load — soft navigation between protected pages keeps the
 * layout, so moving around inside the app does not replay it.
 */
export default function SplashGate() {
  const [visible, setVisible] = useState(true);

  /*
   * Everything under the opening holds still while it plays.
   *
   * The opening is a fixed, opaque overlay at z-index 1000, and the whole app
   * mounts underneath it: the home stage starts its wake, its own nineteen
   * infinite animations and the mark's twenty-eight, the library loads, the
   * preferences sync — all at once, all behind something nobody can see
   * through, all competing for the frames the opening needs to be smooth.
   * That is why it stuttered.
   *
   * animation-play-state rather than unmounting: the app carries on loading,
   * hydrating and fetching, which is the part that has to happen during these
   * 2.8 seconds. Only the drawing of things nobody can see stops, and it
   * resumes the moment the overlay goes.
   */
  useEffect(() => {
    if (!visible) return;

    const root = document.documentElement;
    root.dataset.launching = "true";

    return () => {
      delete root.dataset.launching;
    };
  }, [visible]);

  if (!visible) return null;

  return <ActiveLaunch onComplete={() => setVisible(false)} />;
}
