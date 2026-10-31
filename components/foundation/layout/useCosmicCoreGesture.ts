"use client";

import { useCallback, useEffect, useRef, type PointerEvent, type RefObject } from "react";

/* =========================================================
   Hold the core, slide to a key, lift to enter it

   Chi chose this (2026-10-29): a 180ms hold opens the rail under the
   finger; sliding across it lights each key in turn; lifting over a key
   enters it, and lifting anywhere else (the core, outside the rail)
   cancels. A short tap is left alone, to open the rail as a click.

   Pointer capture keeps the gesture with the core even as the finger
   leaves it, so the key under the finger is found by hit-testing the
   point, not by which element received the event. That also follows the
   keys while the rail is still animating in.

   The gesture ends, without entering anything, on Escape, a cancelled or
   lost pointer, the window losing focus or the page being hidden: each is
   a moment the reader did not choose a key.
   ========================================================= */

/** How long the core must be held before the rail opens under the finger. */
export const HOLD_MS = 180;
/** A finger that moves further than this before the hold has not held. */
const SLOP_PX = 12;
/** One short tick as the finger reaches a new key, where it is supported. */
const HAPTIC_MS = 8;
/** The keys' boxes are measured again no more often than this. */
const MEASURE_EVERY_MS = 150;

type Session = {
  pointerId: number;
  x: number;
  y: number;
  /** The hold has completed and the rail is open under the finger. */
  armed: boolean;
  hover: number | null;
};

type Options = {
  root: RefObject<HTMLDivElement | null>;
  core: RefObject<HTMLButtonElement | null>;
  /** The rail closes on a new route; so does any gesture in progress. */
  routeKey?: string;
  onOpen: () => void;
  onHover: (index: number | null) => void;
  onCancel: () => void;
  onCommit: (index: number) => void;
};

export default function useCosmicCoreGesture({ root, core, routeKey, onOpen, onHover, onCancel, onCommit }: Options) {
  const session = useRef<Session | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** The click that follows a completed gesture is not a tap. */
  const swallowClick = useRef(false);
  const callbacks = useRef({ onOpen, onHover, onCancel, onCommit });
  /** The keys' boxes, as last measured, and when. */
  const boxes = useRef<{ at: number; keys: { index: number; box: DOMRect }[] } | null>(null);
  useEffect(() => {
    callbacks.current = { onOpen, onHover, onCancel, onCommit };
  });

  /** Ends the gesture; tells the component only if the rail was open for it. */
  const stop = useCallback((cancelled: boolean) => {
    const ending = session.current;
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
    session.current = null;
    boxes.current = null;
    const pointer = ending?.pointerId;
    if (pointer !== undefined && core.current?.hasPointerCapture?.(pointer)) {
      core.current.releasePointerCapture(pointer);
    }
    if (cancelled && ending?.armed) callbacks.current.onCancel();
  }, [core]);

  useEffect(() => {
    const cancel = () => stop(true);
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") cancel(); };
    const hidden = () => { if (document.hidden) cancel(); };
    document.addEventListener("keydown", escape);
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("blur", cancel);
    return () => {
      document.removeEventListener("keydown", escape);
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("blur", cancel);
      stop(false);
    };
  }, [stop, routeKey]);

  /*
   * The key under a point, if it is one of this rail's. From the keys'
   * boxes rather than elementFromPoint: a hit test after every change of
   * state laid the page out again on each move (105 layouts in three
   * seconds under a phone's CPU). The boxes are measured afresh every
   * MEASURE_EVERY_MS, because the rail is still rising into place for the
   * first 280ms of a hold.
   */
  function keyAt(x: number, y: number): number | null {
    const now = performance.now();
    if (!boxes.current || now - boxes.current.at > MEASURE_EVERY_MS) {
      const keys = Array.from(root.current?.querySelectorAll<HTMLElement>("[data-core-item]") ?? []);
      boxes.current = { at: now, keys: keys.map(key => ({ index: Number(key.dataset.coreItem), box: key.getBoundingClientRect() })) };
    }
    const hit = boxes.current.keys.find(({ box }) => x >= box.left && x <= box.right && y >= box.top && y <= box.bottom);
    return hit ? hit.index : null;
  }

  function reach(gesture: Session, index: number | null) {
    if (gesture.hover === index) return;
    gesture.hover = index;
    callbacks.current.onHover(index);
    if (index === null || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    try {
      navigator.vibrate?.(HAPTIC_MS);
    } catch {
      // No vibration here (an iPhone among them): the light says it alone.
    }
  }

  return {
    /** Call from the core's click: true when that click ends a gesture. */
    consumeClick(detail: number) {
      const swallow = swallowClick.current && detail !== 0;
      swallowClick.current = false;
      return swallow;
    },
    onPointerDown(event: PointerEvent<HTMLButtonElement>) {
      if (event.button !== 0 || !event.isPrimary || session.current) return;
      swallowClick.current = false;
      const gesture: Session = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, armed: false, hover: null };
      session.current = gesture;
      core.current?.setPointerCapture?.(event.pointerId);
      holdTimer.current = setTimeout(() => {
        if (session.current !== gesture) return;
        holdTimer.current = null;
        gesture.armed = true;
        swallowClick.current = true;
        callbacks.current.onOpen();
      }, HOLD_MS);
    },
    onPointerMove(event: PointerEvent<HTMLButtonElement>) {
      const gesture = session.current;
      if (!gesture || gesture.pointerId !== event.pointerId) return;
      if (gesture.armed) {
        reach(gesture, keyAt(event.clientX, event.clientY));
      } else if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > SLOP_PX) {
        // Moved before the hold: neither a hold nor a tap.
        swallowClick.current = true;
        stop(true);
      }
    },
    onPointerUp(event: PointerEvent<HTMLButtonElement>) {
      const gesture = session.current;
      if (!gesture || gesture.pointerId !== event.pointerId) return;
      const index = gesture.armed ? keyAt(event.clientX, event.clientY) : null;
      stop(false);
      // Not held: an ordinary tap, which the click that follows handles.
      if (!gesture.armed) return;
      if (index === null) callbacks.current.onCancel();
      else callbacks.current.onCommit(index);
    },
    onPointerCancel: () => stop(true),
    onLostPointerCapture: () => stop(true),
  };
}
