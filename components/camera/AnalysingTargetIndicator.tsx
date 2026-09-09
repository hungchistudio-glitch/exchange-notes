"use client";

import { useEffect, useState } from "react";

import styles from "@/components/camera/AnalysingTargetIndicator.module.css";

/* =========================================================
   "Analysing target…", while the model reads the frame

   One indicator, shared by every surface that waits on recognition, so the
   camera and the imported-photo viewer say the same thing the same way.

   The two timings here are about *whether* it appears, which is a different
   question from how it looks — that lives in the stylesheet beside this
   file, where every duration is a custom property at the top.

   The pill deliberately has no success state. Every caller navigates the
   moment recognition returns: the search sheet closes the camera, the
   capture screen swaps to its review. A "Target found" held for a third of
   a second would be a message shown on a screen that is already leaving.
   ========================================================= */

/**
 * How long analysis has to be running before the pill is worth showing.
 *
 * Recognition is usually seconds, but it can be served from the client-side
 * cache in a few milliseconds — photographing the same thing twice. Showing
 * a loader for one frame in that case is worse than showing nothing.
 */
const SHOW_AFTER_MS = 250;

/**
 * How long it stays once it has appeared.
 *
 * Without this a request that lands just after the delay produces a flash:
 * in, and straight back out. The floor costs a moment on an unusually quick
 * read and removes the flicker on all of them.
 */
const MIN_VISIBLE_MS = 500;

/** Must match --exit-duration in the stylesheet. */
const EXIT_MS = 180;

type Phase = "hidden" | "visible" | "leaving";

type AnalysingTargetIndicatorProps = {
  /**
   * The caller's existing analysis state — `busy`, `reading`, whatever it
   * is already called there. Nothing here duplicates it.
   */
  active: boolean;
  /** "Analysing target", without the dots. Those are drawn below. */
  label: string;
  className?: string;
};

export default function AnalysingTargetIndicator({
  active,
  label,
  className = "",
}: AnalysingTargetIndicatorProps) {
  const [phase, setPhase] = useState<Phase>("hidden");
  const [shownAt, setShownAt] = useState<number | null>(null);

  useEffect(() => {
    if (active) {
      if (phase !== "hidden") return;

      const timer = window.setTimeout(() => {
        setShownAt(Date.now());
        setPhase("visible");
      }, SHOW_AFTER_MS);

      return () => window.clearTimeout(timer);
    }

    if (phase === "hidden") return;

    if (phase === "visible") {
      // Whatever is left of the floor, which is often nothing at all.
      const held = Date.now() - (shownAt ?? 0);
      const remaining = Math.max(0, MIN_VISIBLE_MS - held);

      const timer = window.setTimeout(() => setPhase("leaving"), remaining);

      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(() => setPhase("hidden"), EXIT_MS);

    return () => window.clearTimeout(timer);
    /*
     * Every setState above is inside a timer callback rather than the effect
     * body, which is what keeps this off the cascading-render rule this
     * project enforces.
     */
  }, [active, phase, shownAt]);

  if (phase === "hidden") return null;

  return (
    <div
      className={`${styles.pill} ${phase === "leaving" ? styles.leaving : ""} ${className}`}
      role="status"
      aria-live="polite"
    >
      {/*
        Behind the text and inside the pill's overflow, so it passes through
        rather than spilling onto the picture.
      */}
      <span className={styles.sweep} aria-hidden="true" />

      <span className="relative">
        {label}
        {/*
          Read as one phrase by assistive technology — "Analysing target" —
          rather than as a label followed by three dots that change three
          times a second in a live region.
        */}
        <span className={styles.dots} aria-hidden="true">
          <span className={styles.dot}>.</span>
          <span className={styles.dot}>.</span>
          <span className={styles.dot}>.</span>
        </span>
      </span>
    </div>
  );
}
