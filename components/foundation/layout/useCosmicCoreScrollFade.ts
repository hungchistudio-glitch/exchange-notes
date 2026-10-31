"use client";

import { useEffect, type RefObject } from "react";

/* =========================================================
   The closed core rests while the reader reads

   Scrolling down dims the closed core over 120px of travel, to 35%
   opacity (Chi chose 35%, 2026-10-30); scrolling up, touching or focusing
   it, or 700ms without scrolling brings it straight back. Its size and
   hit target never change, only its light.

   It watches the app's own scroll layer ([data-app-scroll-viewport]),
   or the window where there is none (the review page), and nothing else:
   a sheet or a list scrolling inside the page is not reading.

   The result is one CSS variable, --core-opacity, written at most once a
   frame. Scroll events can arrive several times a frame on a fast flick;
   writing a style on each made the page recalculate styles that many
   times for one visible change. No React state either: a re-render per
   scroll tick is the jank this avoids.
   ========================================================= */

/** Travel over which the core dims, and the floor it dims to. */
const FADE_DISTANCE = 120;
const RESTING_OPACITY = 0.35;
/** Stillness after which the core wakes on its own. */
const WAKE_AFTER_MS = 700;

export default function useCosmicCoreScrollFade(
  root: RefObject<HTMLDivElement | null>,
  /** Open, mid-gesture or navigating: the core stays at full strength. */
  suspended: boolean,
  routeKey?: string,
  /**
   * Where --core-opacity is written: the core itself, so a scroll restyles
   * the core and not the whole dock (its rail, keys and label). The dock
   * when none is given.
   */
  paintTarget?: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const dock = root.current;
    if (!dock) return;
    const viewport = document.querySelector<HTMLElement>("[data-app-scroll-viewport]");
    const scroller: HTMLElement | Window = viewport ?? window;
    const position = () => Math.max(0, viewport ? viewport.scrollTop : window.scrollY);

    let previous = position();
    let travelled = 0;
    let frame = 0;
    let wake: ReturnType<typeof setTimeout> | undefined;

    const target = paintTarget?.current ?? dock;
    const paint = (opacity: number) => target.style.setProperty("--core-opacity", String(opacity));
    const restore = () => {
      clearTimeout(wake);
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      travelled = 0;
      paint(1);
    };

    restore();
    if (suspended) return restore;

    const onScroll = () => {
      const now = position();
      const delta = now - previous;
      previous = now;
      if (delta === 0) return;
      if (delta < 0 || now <= 0) {
        restore();
        return;
      }
      travelled = Math.min(FADE_DISTANCE, travelled + delta);
      clearTimeout(wake);
      wake = setTimeout(restore, WAKE_AFTER_MS);
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        paint(1 - (1 - RESTING_OPACITY) * (travelled / FADE_DISTANCE));
      });
    };

    scroller.addEventListener("scroll", onScroll, { passive: true });
    dock.addEventListener("pointerdown", restore);
    dock.addEventListener("pointerenter", restore);
    dock.addEventListener("focusin", restore);
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      dock.removeEventListener("pointerdown", restore);
      dock.removeEventListener("pointerenter", restore);
      dock.removeEventListener("focusin", restore);
      restore();
    };
  }, [root, suspended, routeKey, paintTarget]);
}
