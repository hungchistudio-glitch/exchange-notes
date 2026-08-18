"use client";

import { useEffect, useState } from "react";

/*
 * Sustained frame cost, sampled cheaply.
 *
 * This exists because the brief asks the radar to step down when the device is
 * thermally stressed, and no browser will tell us that. What a browser will
 * tell us is how long its frames are actually taking, which is the thing
 * thermal state was a proxy for in the first place: a hot device throttles,
 * a throttled device drops frames, and dropped frames are measurable.
 *
 * The measurement is a handful of numbers per second and stops as soon as it
 * has an answer, so it cannot itself become the thing making the page slow.
 */

/* 60Hz is 16.7ms. Sustained frames past 24ms are dropping roughly a third of
   them, which is where a continuous animation stops reading as smooth. */
const FRAME_BUDGET_MS = 24;
const SEVERE_BUDGET_MS = 38;

/* Long enough that a single stall — a route change, an image decoding —
   cannot condemn the device, short enough to react within a breath. */
const WINDOW_FRAMES = 90;

export type FrameHealth = "good" | "strained" | "poor";

/**
 * Watches frame pacing and reports how the device is coping.
 *
 * Deliberately one-way: it can downgrade what the radar spends but never
 * upgrades it back mid-session. A device that recovered would otherwise ramp
 * the animation back up, drop frames again, and oscillate — and the visible
 * result of that is worse than simply staying calm.
 */
export default function useFrameStability(enabled: boolean): FrameHealth {
  const [health, setHealth] = useState<FrameHealth>("good");

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;
    if (health === "poor") return;

    let frames = 0;
    let total = 0;
    let last = performance.now();
    let raf = 0;
    let cancelled = false;

    function tick(now: number) {
      if (cancelled) return;

      const delta = now - last;
      last = now;

      /*
       * A tab that was backgrounded reports one enormous frame on the way
       * back. That is not the device struggling, so it is thrown away rather
       * than allowed to poison the average.
       */
      if (delta < 500) {
        total += delta;
        frames += 1;
      }

      if (frames >= WINDOW_FRAMES) {
        const average = total / frames;

        if (average > SEVERE_BUDGET_MS) setHealth("poor");
        else if (average > FRAME_BUDGET_MS) setHealth("strained");

        return;
      }

      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [enabled, health]);

  return health;
}
