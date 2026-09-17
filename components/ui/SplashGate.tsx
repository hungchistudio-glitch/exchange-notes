"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useState } from "react";

import ActiveLaunch, { ACTIVE_LAUNCH } from "@/components/launch/activeLaunch";
import { setLaunching } from "@/lib/launchState";

/*
 * How long after the opening should have ended before the gate stops waiting
 * to be told and simply opens.
 */
const LAUNCH_GRACE_MS = 1200;

/** Versioned, so a new opening is always worth watching once. */
export const LAUNCH_SESSION_KEY = `exchange-notes:launch:${ACTIVE_LAUNCH.id}`;

/**
 * How long the app has to have been away before the opening plays again.
 *
 * ── Why this is a clock and not a flag ─────────────────────────────────
 *
 * The obvious implementation is a sessionStorage boolean: played, don't play
 * again. That shipped once and was removed, because in an installed PWA the
 * unit is wrong. iOS keeps a web app's session alive across backgrounding,
 * so the flag survived the app being closed and reopened and the opening
 * played exactly once ever, then was silently skipped for the life of the
 * install — and reopening the app is precisely when an opening is supposed
 * to run.
 *
 * A boolean cannot tell those two cases apart, because the question it
 * answers is "has this played" when the question worth asking is "has this
 * reader been away long enough for it to be worth seeing". So the marker is
 * a timestamp written every time the reader leaves, rather than only when
 * the opening ends — which is what makes the gate measure time away from the
 * app instead of time since the last opening.
 *
 * Half an hour: long enough that moving between tabs, following a link out
 * and coming back, or reloading after a change never replays it; short
 * enough that opening the app in the morning does.
 */
export const LAUNCH_REPLAY_AFTER_MS = 30 * 60 * 1000;

/**
 * Whether the app was in use recently enough to go straight in.
 *
 * Deliberately strict about what counts. A missing key, a value from an
 * older build that stored the word "complete", and a stamp from the future —
 * a clock that has been moved back — all read as "not recently", because
 * every one of them is a reason to play the opening rather than to skip it.
 */
function seenRecently() {
  try {
    const stamp = Number(window.sessionStorage.getItem(LAUNCH_SESSION_KEY));
    const now = Date.now();
    return stamp > 0 && now >= stamp && now - stamp < LAUNCH_REPLAY_AFTER_MS;
  } catch {
    // Private browsing or storage policy must never prevent entering the app.
    return false;
  }
}

/*
 * Set by the review harness, and by nothing else.
 *
 * The gate writes its marker on the way out of every document, which is
 * exactly what a reload is — so a harness that clears the marker and reloads
 * has its clear overwritten on the way out and can never ask for a replay.
 * Suspending the write is the only thing that makes the behaviour reviewable
 * in a real browser rather than only in jsdom.
 */
let markerSuspended = false;

function markLeaving() {
  if (markerSuspended) return;
  try {
    window.sessionStorage.setItem(LAUNCH_SESSION_KEY, `${Date.now()}`);
  } catch {
    // Finishing still releases the page when storage is unavailable.
  }
}

/** Development review only: play the opening on the next document load. */
export function forgetLaunchMarker() {
  markerSuspended = true;
  try {
    window.sessionStorage.removeItem(LAUNCH_SESSION_KEY);
  } catch {
    // An unwritable store already replays the opening.
  }
}

/** Development review only: pretend the app was last left `awayFor` ago. */
export function ageLaunchMarker(awayFor: number) {
  markerSuspended = true;
  try {
    window.sessionStorage.setItem(LAUNCH_SESSION_KEY, `${Date.now() - awayFor}`);
  } catch {
    // As above.
  }
}

/** Escape values for an inline script, including the HTML script terminator. */
function scriptValue(value: string) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

/** The opening, once per stretch of use, on every document load. */
export default function SplashGate() {
  const gateId = useId();
  // Identical server and hydrating renders; browser storage is read at commit.
  const [visible, setVisible] = useState(true);

  const finish = useCallback(() => {
    markLeaving();
    setVisible(false);
  }, []);

  useLayoutEffect(() => {
    const root = document.documentElement;

    if (!visible || seenRecently()) {
      setLaunching(false);
      delete root.dataset.launching;
      // This storage reconciliation must finish before the hydration paint.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (visible) setVisible(false);
      return;
    }

    // A replay was asked for and is now being given; the request is spent.
    markerSuspended = false;

    // Let the app load underneath, but pause its decorative motion and route
    // transitions so they do not compete with or paint above the opening.
    setLaunching(true);
    root.dataset.launching = "true";

    // Keep keyboard focus out of controls hidden beneath the opening. Retain
    // an existing inert state owned by another overlay when this one leaves.
    const viewport = document.querySelector<HTMLElement>("[data-app-viewport]");
    const previousInert = viewport?.getAttribute("inert") ?? null;
    viewport?.setAttribute("inert", "");

    return () => {
      setLaunching(false);
      delete root.dataset.launching;
      if (previousInert === null) viewport?.removeAttribute("inert");
      else viewport?.setAttribute("inert", previousInert);
    };
  }, [visible]);

  useEffect(() => {
    if (visible) return;

    /*
     * The marker records when the reader *left*, and only that.
     *
     * Recording their return as well is the obvious symmetry and it is wrong:
     * iOS keeps an installed web app's document alive across backgrounding, so
     * a resume after two hours fires visibilitychange on a document that is
     * still running. Writing "now" there would stamp the marker fresh without
     * anything having asked whether the opening was due — and the reload that
     * eventually comes would then find a marker a few minutes old and skip an
     * opening the reader had been away all afternoon from.
     *
     * pagehide covers the reload and the navigation away; the hidden half of
     * visibilitychange covers backgrounding, which is the signal an installed
     * app actually gets.
     */
    const onHidden = () => {
      if (document.visibilityState === "hidden") markLeaving();
    };
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", markLeaving);

    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", markLeaving);
    };
  }, [visible]);

  useEffect(() => {
    if (!visible) return;

    // A suspended or failed animation must never leave an opaque overlay up.
    const timer = window.setTimeout(
      finish,
      ACTIVE_LAUNCH.durationMs + LAUNCH_GRACE_MS,
    );

    return () => window.clearTimeout(timer);
  }, [finish, visible]);

  if (!visible) return null;

  return (
    <div id={gateId} suppressHydrationWarning>
      {/* Runs while HTML is parsed, before the overlay below can be painted.
          The layout effect handles client navigation, where scripts are inert.
          It has to reach the same verdict as seenRecently() above, which is
          why both are this short. */}
      <script
        dangerouslySetInnerHTML={{
          __html: `try{var s=+sessionStorage.getItem(${scriptValue(LAUNCH_SESSION_KEY)}),n=Date.now();if(s>0&&n>=s&&n-s<${LAUNCH_REPLAY_AFTER_MS}){document.getElementById(${scriptValue(gateId)}).hidden=true}}catch{}`,
        }}
      />
      <ActiveLaunch onComplete={finish} />
    </div>
  );
}
