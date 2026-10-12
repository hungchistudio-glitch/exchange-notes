"use client";

import { useEffect, type RefObject } from "react";

/** How far the page scrolls before a corner key has fully stepped away, in px. */
const TUCK_DISTANCE = 40;

/**
 * Home's top-corner keys step away as the page leaves the top.
 *
 * The deck scrolls, and a key pinned over it sat on whatever passed
 * underneath. So each writes --tuck (0 at the top, 1 forty pixels down) and
 * data-tucked straight onto its element, once a frame at most: a scroll is
 * sixty updates a second, and none of them is React's business.
 */
export default function useTuckOnScroll(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const element = ref.current;
    const scroller = document.querySelector<HTMLElement>("[data-app-scroll-viewport]");
    if (!element) return;
    let frame = 0;
    let shown = Number.NaN;
    const read = () => {
      frame = 0;
      const top = scroller ? scroller.scrollTop : window.scrollY;
      const tuck = Math.min(1, Math.max(0, top / TUCK_DISTANCE));
      if (tuck === shown) return;
      shown = tuck;
      element.style.setProperty("--tuck", tuck.toFixed(3));
      if (tuck > 0.5) element.setAttribute("data-tucked", "true");
      else element.removeAttribute("data-tucked");
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(read); };
    read();
    const target: HTMLElement | Window = scroller ?? window;
    target.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      target.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [ref]);
}
