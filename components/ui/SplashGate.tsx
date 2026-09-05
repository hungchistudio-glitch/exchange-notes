"use client";

import { useEffect, useState } from "react";

import ActiveLaunch, { ACTIVE_LAUNCH } from "@/components/launch/activeLaunch";
import { setLaunching } from "@/lib/launchState";

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
/*
 * How long after the opening should have ended before the gate stops waiting
 * to be told and simply opens.
 */
const LAUNCH_GRACE_MS = 1200;

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
    if (!visible) {
      setLaunching(false);
      return;
    }

    setLaunching(true);

    const root = document.documentElement;
    root.dataset.launching = "true";

    /*
     * Cleared on the way out as well as on completion. Unmounting while the
     * overlay is still up — a sign-out, a route that leaves the protected
     * app — would otherwise leave both signals set for the life of the
     * document: the app's animations paused, and every route transition
     * suppressed, by an opening that is no longer on screen.
     */
    return () => {
      setLaunching(false);
      delete root.dataset.launching;
    };
  }, [visible]);

  /*
   * The overlay leaves on its own, whatever the animation does.
   *
   * Until this, the only way out was the opening reporting that it had
   * finished — so anything that stopped it finishing left an opaque sheet
   * over the whole app for the life of the document. That is not
   * hypothetical: browsers suspend animations in a backgrounded tab, and
   * opening the app and immediately switching away is an ordinary thing to
   * do. It is the likeliest explanation for the opening "getting stuck".
   *
   * A ceiling rather than a race with the animation: the grace is long
   * enough that a smooth run always reports in first and this never fires,
   * and short enough that a stalled one is measured in a moment rather than
   * for as long as the reader keeps the tab open.
   */
  useEffect(() => {
    if (!visible) return;

    const timer = window.setTimeout(
      () => setVisible(false),
      ACTIVE_LAUNCH.durationMs + LAUNCH_GRACE_MS,
    );

    return () => window.clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

  return <ActiveLaunch onComplete={() => setVisible(false)} />;
}
