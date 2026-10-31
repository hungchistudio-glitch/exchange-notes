"use client";

import { useCallback, useEffect, useRef, type MouseEvent, type PointerEvent, type RefObject } from "react";

/* =========================================================
   Slide a finger along the bar; lift to go there

   Chi, 2026-10-30: "下面的控制bar並不能手指滑動各功能，幫我升級為高級可滑式".
   Both bars (Standard mode's dock, Cosmic mode's open rail) now follow a
   finger: press anywhere on the bar and slide sideways, and the selection
   light glides under the finger, the key in reach is named, and a device
   that can gives a short tick at each key. Lift over the bar to go to the
   key nearest the finger; lift away from it (above or off its ends) and
   nothing happens, the light returning to the page you are on.

   A tap is left exactly as it was. Only a sideways movement past SLOP_PX
   starts a slide; until then the press is an ordinary click on the key
   under it.

   Going to a key is that key's own click, so a Link navigates as a Link and
   an action key (search, the features sheet) runs its action. The click
   the browser sends after the finger lifts would land on whatever key the
   finger started on, so it is swallowed.
   ========================================================= */

/** Sideways travel before a press becomes a slide. */
const SLOP_PX = 8;
/** How far off the bar the finger may lift and still go somewhere. */
const LIFT_TOLERANCE_PX = 24;
/** One short tick at each key, where vibration exists. */
const HAPTIC_MS = 8;
/** The browser's own click after a slide arrives well within this. */
const SWALLOW_MS = 400;

type Slide = { pointerId: number; x: number; y: number; sliding: boolean; index: number | null };

export type RailScrubState = {
  /** The finger's position along the keys, as a fractional key index. */
  position: number;
  /** The key nearest the finger. */
  index: number;
};

type Options = {
  /** The bar: its bounds decide whether a lift goes anywhere. */
  rail: RefObject<HTMLElement | null>;
  /** The keys, in order. */
  keys: () => HTMLElement[];
  onStart: () => void;
  onMove: (state: RailScrubState) => void;
  /** Lifted over the bar (the key it will click), or cancelled (null). */
  onEnd: (index: number | null) => void;
  enabled?: boolean;
};

function centres(keys: HTMLElement[]) {
  return keys.map(key => {
    const box = key.getBoundingClientRect();
    return box.left + box.width / 2;
  });
}

/** Where x falls along the keys' centres, as a fractional index. */
export function positionAlong(x: number, keyCentres: number[]): RailScrubState {
  const last = keyCentres.length - 1;
  if (last <= 0) return { position: 0, index: 0 };
  if (x <= keyCentres[0]) return { position: 0, index: 0 };
  if (x >= keyCentres[last]) return { position: last, index: last };
  let i = 0;
  while (x > keyCentres[i + 1]) i++;
  const position = i + (x - keyCentres[i]) / (keyCentres[i + 1] - keyCentres[i]);
  return { position, index: Math.round(position) };
}

export default function useRailScrub({ rail, keys, onStart, onMove, onEnd, enabled = true }: Options) {
  const slide = useRef<Slide | null>(null);
  const committing = useRef<HTMLElement | null>(null);
  const swallowUntil = useRef(0);
  const callbacks = useRef({ keys, onStart, onMove, onEnd });
  useEffect(() => {
    callbacks.current = { keys, onStart, onMove, onEnd };
  });

  const finish = useCallback((index: number | null) => {
    const ending = slide.current;
    slide.current = null;
    if (!ending?.sliding) return;
    const bar = rail.current;
    if (bar?.hasPointerCapture?.(ending.pointerId)) bar.releasePointerCapture(ending.pointerId);
    swallowUntil.current = performance.now() + SWALLOW_MS;
    callbacks.current.onEnd(index);
    if (index === null) return;
    const key = callbacks.current.keys()[index];
    if (!key) return;
    committing.current = key;
    key.click();
    committing.current = null;
  }, [rail]);

  // A slide is not left hanging by a window that loses focus or a page hidden.
  useEffect(() => {
    const cancel = () => finish(null);
    const hidden = () => { if (document.hidden) cancel(); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") cancel(); };
    window.addEventListener("blur", cancel);
    document.addEventListener("visibilitychange", hidden);
    document.addEventListener("keydown", escape);
    return () => {
      window.removeEventListener("blur", cancel);
      document.removeEventListener("visibilitychange", hidden);
      document.removeEventListener("keydown", escape);
    };
  }, [finish]);

  function track(gesture: Slide, x: number) {
    const state = positionAlong(x, centres(callbacks.current.keys()));
    if (state.index !== gesture.index) {
      gesture.index = state.index;
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        try {
          navigator.vibrate?.(HAPTIC_MS);
        } catch {
          // No vibration here (an iPhone among them): the light says it alone.
        }
      }
    }
    callbacks.current.onMove(state);
  }

  return {
    onPointerDown(event: PointerEvent<HTMLElement>) {
      if (!enabled || event.button !== 0 || !event.isPrimary || slide.current) return;
      slide.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, sliding: false, index: null };
    },
    onPointerMove(event: PointerEvent<HTMLElement>) {
      const gesture = slide.current;
      if (!gesture || gesture.pointerId !== event.pointerId) return;
      if (!gesture.sliding) {
        const dx = Math.abs(event.clientX - gesture.x);
        const dy = Math.abs(event.clientY - gesture.y);
        if (dx <= SLOP_PX || dx < dy) return;
        gesture.sliding = true;
        rail.current?.setPointerCapture?.(event.pointerId);
        callbacks.current.onStart();
      }
      track(gesture, event.clientX);
    },
    onPointerUp(event: PointerEvent<HTMLElement>) {
      const gesture = slide.current;
      if (!gesture || gesture.pointerId !== event.pointerId) return;
      if (!gesture.sliding) {
        // A tap: the key's own click follows, untouched.
        slide.current = null;
        return;
      }
      const box = rail.current?.getBoundingClientRect();
      const onBar = !!box
        && event.clientY >= box.top - LIFT_TOLERANCE_PX && event.clientY <= box.bottom + LIFT_TOLERANCE_PX
        && event.clientX >= box.left - LIFT_TOLERANCE_PX && event.clientX <= box.right + LIFT_TOLERANCE_PX;
      finish(onBar ? gesture.index : null);
    },
    onPointerCancel: () => finish(null),
    /*
     * Only the bar's own capture ending ends a slide. A touch is captured
     * by the browser to the element first pressed (an icon's path, say);
     * taking the capture for the bar fires lostpointercapture on that
     * element, which bubbles here, and read as ours it cancelled every slide
     * on a phone as it began (seen in headless Chrome with touch input).
     */
    onLostPointerCapture: (event: PointerEvent<HTMLElement>) => {
      if (event.target === rail.current) finish(null);
    },
    /** On the bar's click capture: lets the slide's own click through, swallows the browser's. */
    onClickCapture(event: MouseEvent<HTMLElement>) {
      if (committing.current && event.target instanceof Node && committing.current.contains(event.target)) return;
      if (performance.now() < swallowUntil.current) {
        swallowUntil.current = 0;
        event.preventDefault();
        event.stopPropagation();
      }
    },
  };
}
