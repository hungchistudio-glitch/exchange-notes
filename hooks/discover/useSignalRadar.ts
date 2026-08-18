"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  resolveMotionPolicy,
  resolveVisualState,
  type RadarMotionPolicy,
  type RadarVisualState,
} from "@/lib/discover/signalRadar";

/*
 * The three windows the radar owns that the feed does not.
 *
 * Success and error are confirmations rather than conditions — the feed has
 * no "just succeeded" state and should not grow one, so the radar holds them
 * for long enough to be seen and then lets go. The cooldown is what stops a
 * second tap from firing a duplicate request while the first is still in
 * flight, per §51.
 */
const SUCCESS_HOLD_MS = 520;
const ERROR_HOLD_MS = 2200;
const SCAN_COOLDOWN_MS = 1100;

type UseSignalRadarOptions = {
  refreshing: boolean;
  loading: boolean;
  error: boolean;
  onScan: () => void;
};

export type SignalRadarController = {
  state: RadarVisualState;
  policy: RadarMotionPolicy;
  /** Fires a scan, or absorbs the tap if one is already running or cooling. */
  scan: () => void;
};

/**
 * Turns what DailyNews knows into what the radar shows.
 *
 * Everything here is either a browser signal the feed has no reason to track
 * (online, reduced motion, save-data) or a transient window the feed should
 * not have to hold open (success, error, cooldown). The feed's own state is
 * read, never written.
 */
export default function useSignalRadar({
  refreshing,
  loading,
  error,
  onScan,
}: UseSignalRadarOptions): SignalRadarController {
  const [online, setOnline] = useState(true);
  const [policy, setPolicy] = useState<RadarMotionPolicy>({
    tier: "high",
    reducedMotion: false,
  });

  /*
   * The outcome of the last scan.
   *
   * One value rather than a succeeded/failed pair, because the two are
   * mutually exclusive and holding them separately is how a radar ends up
   * briefly showing both.
   *
   * Held as an object rather than a bare string so that a second scan landing
   * on the same outcome is still a new identity: React bails out of a state
   * update only on Object.is equality, so "success" after "success" would be
   * dropped and the window below would never be restarted. A fresh object
   * never is. That is also why there is no timestamp here — the identity
   * already does the job a timestamp was doing, and reading the clock during
   * render is not something a component may do.
   */
  const [outcome, setOutcome] = useState<{
    kind: "success" | "error";
  } | null>(null);

  const cooldownUntilRef = useRef(0);

  /*
   * Connection, and the motion policy that depends on the same environment.
   *
   * Both are read once on mount and then only when the browser says they
   * changed. navigator.onLine is a weak signal — it reports the link, not
   * whether anything is reachable — which is exactly why a failed refresh
   * outranks it in the priority list rather than the other way round.
   */
  useEffect(() => {
    const nav = navigator as Navigator & {
      connection?: { saveData?: boolean };
    };

    function readEnvironment() {
      setOnline(nav.onLine);
      setPolicy(
        resolveMotionPolicy({
          reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches,
          saveData: Boolean(nav.connection?.saveData),
          hardwareConcurrency: nav.hardwareConcurrency,
        }),
      );
    }

    readEnvironment();

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    window.addEventListener("online", readEnvironment);
    window.addEventListener("offline", readEnvironment);
    motionQuery.addEventListener("change", readEnvironment);

    return () => {
      window.removeEventListener("online", readEnvironment);
      window.removeEventListener("offline", readEnvironment);
      motionQuery.removeEventListener("change", readEnvironment);
    };
  }, []);

  /*
   * The edge where a scan ends, which is the only moment success or failure
   * can be known.
   *
   * Detected during render by comparing against the previous value rather than
   * in an effect. That is React's documented way to adjust state when an input
   * changes, and here it is also the correct one: an effect that writes state
   * synchronously re-renders the tree a second time for every scan, and the
   * edge is knowable without waiting for a commit.
   *
   * Watching `refreshing` fall rather than taking a completion callback is what
   * keeps the radar out of the feed's request path — it cannot delay, retry or
   * swallow anything, because it is only ever looking.
   */
  const [seenRefreshing, setSeenRefreshing] = useState(refreshing);

  if (seenRefreshing !== refreshing) {
    setSeenRefreshing(refreshing);

    if (seenRefreshing && !refreshing) {
      setOutcome({ kind: error ? "error" : "success" });
    }
  }

  /*
   * The window that outcome is held open for. The write happens in the timer,
   * never in the effect body — the effect's job is to schedule and to clean up
   * after itself, not to change anything on the spot.
   */
  useEffect(() => {
    if (!outcome) return;

    const timer = setTimeout(
      () => setOutcome(null),
      outcome.kind === "error" ? ERROR_HOLD_MS : SUCCESS_HOLD_MS,
    );

    return () => clearTimeout(timer);
  }, [outcome]);

  const scan = useCallback(() => {
    const now = Date.now();

    // Absorbed rather than queued. A second tap during a scan is the user
    // asking for the thing already happening, and firing a duplicate request
    // would only make it finish later.
    if (refreshing || loading || now < cooldownUntilRef.current) return;

    cooldownUntilRef.current = now + SCAN_COOLDOWN_MS;
    setOutcome(null);
    onScan();
  }, [loading, onScan, refreshing]);

  const state = useMemo(
    () =>
      resolveVisualState({
        online,
        refreshing,
        loading,
        failed: outcome?.kind === "error",
        succeeded: outcome?.kind === "success",
      }),
    [loading, online, outcome, refreshing],
  );

  return { state, policy, scan };
}
