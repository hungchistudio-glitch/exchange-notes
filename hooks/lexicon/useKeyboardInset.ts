"use client";

import { useMemo, useSyncExternalStore } from "react";

/* =========================================================
   How much of the screen the keyboard is standing on

   A fixed, full-height panel does not shrink when the on-screen keyboard
   opens — on iOS the layout viewport is unchanged and the keyboard is simply
   drawn on top of it. So the last result in a scrolling list sits underneath
   the keys, reachable only by scrolling to a position the list will not
   scroll to, because as far as the layout is concerned it is already at the
   bottom.

   `visualViewport` is what actually knows. The difference between it and the
   layout viewport is the covered strip, and padding the scroll area by that
   much gives the list somewhere to scroll to.

   Read through useSyncExternalStore rather than an effect: the keyboard is
   an external system that this subscribes to, which is exactly what that
   hook is for, and it keeps the server render and the hydrating one agreeing
   on zero.
   ========================================================= */

function readInset(): number {
  const viewport = window.visualViewport;
  if (!viewport) return 0;

  /*
   * offsetTop matters as much as the height: when the page is scrolled under
   * a focused field, iOS shifts the visual viewport down rather than
   * shortening it, and reading height alone reports no keyboard at all.
   *
   * Rounded so a sub-pixel wobble during the open animation does not produce
   * a new value on every frame, and floored at zero because a negative
   * padding is not a thing.
   */
  return Math.max(
    0,
    Math.round(window.innerHeight - viewport.height - viewport.offsetTop),
  );
}

const noSubscription = () => () => {};
const zero = () => 0;

export default function useKeyboardInset(active: boolean): number {
  const subscribe = useMemo(() => {
    if (!active) return noSubscription;

    return (onChange: () => void) => {
      const viewport = window.visualViewport;
      if (!viewport) return () => {};

      viewport.addEventListener("resize", onChange);
      viewport.addEventListener("scroll", onChange);

      return () => {
        viewport.removeEventListener("resize", onChange);
        viewport.removeEventListener("scroll", onChange);
      };
    };
  }, [active]);

  const getSnapshot = active ? readInset : zero;

  return useSyncExternalStore(subscribe, getSnapshot, zero);
}
