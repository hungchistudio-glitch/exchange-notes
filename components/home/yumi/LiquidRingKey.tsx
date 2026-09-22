"use client";

import { useCallback, useEffect, useRef, type PointerEvent, type ReactNode } from "react";

/* =========================================================
   A ring key that answers the finger

   The keys are 62px discs on a circle, and a disc that does not move under a
   finger reads as a picture of a button. This one lags behind the pointer
   with resistance and deforms along the drag axis — stretched the way it is
   being pulled, narrowed across it — and springs back on release.

   Three things this is careful about, because it runs on the one screen in
   the app with a WebGL loop already asking for every frame:

   1. Nothing is written during the pointer event. A `pointermove` fires as
      often as the digitiser reports, which on a 120Hz phone is twice a frame,
      and writing a custom property there is a style invalidation per event
      rather than per frame. The event stores numbers in a ref; one rAF reads
      them and writes once.

   2. `prefers-reduced-motion` is answered once, from a listener, not by
      calling `matchMedia` inside the move handler. A synchronous media query
      per pointer event is a layout-adjacent read on the hot path.

   3. The hit area never moves. Only the inner surface is transformed, so a
      finger that presses and slides slightly still lifts inside the key it
      pressed — the target is where the reader aimed, not where the animation
      has since gone.
   ========================================================= */

/** Past this, the gesture was a drag and must not also navigate. */
const DRAG_THRESHOLD_PX = 10;

/** How far the surface may trail the finger, and how hard it resists. */
const MAX_TRAIL_PX = 18;
const RESISTANCE = 0.3;

/** Full deformation is reached at this drag distance. */
const PULL_FULL_PX = 220;

/*
 * Answered once per document rather than per key per move.
 *
 * Eight keys × a move event each digitiser tick × a synchronous matchMedia is
 * the sort of thing that does not show up in a profile as one bad line, only
 * as a frame budget that is quietly gone.
 */
let reducedMotion: boolean | null = null;

function prefersReducedMotion() {
  if (reducedMotion === null) {
    if (typeof window === "undefined") return true;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotion = query.matches;
    query.addEventListener("change", event => {
      reducedMotion = event.matches;
    });
  }
  return reducedMotion;
}

type Gesture = {
  pointerId: number;
  startX: number;
  startY: number;
  dx: number;
  dy: number;
  moved: boolean;
};

export type LiquidRingKeyProps = {
  label: string;
  /** False while the ring is shut: the key is present but not a target. */
  enabled: boolean;
  onChoose: () => void;
  children: ReactNode;
};

export default function LiquidRingKey({
  label,
  enabled,
  onChoose,
  children,
}: LiquidRingKeyProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const frame = useRef(0);

  const paint = useCallback(() => {
    frame.current = 0;

    const button = buttonRef.current;
    const current = gesture.current;
    if (!button) return;

    if (!current) {
      for (const name of ["--liquid-x", "--liquid-y", "--liquid-angle", "--liquid-pull"]) {
        button.style.removeProperty(name);
      }
      return;
    }

    const { dx, dy } = current;
    const distance = Math.hypot(dx, dy);
    /* Resistance, not a follow: the surface gives a little and then stops,
       so a long drag does not drag the key off its own circle. */
    const trail = distance ? Math.min(MAX_TRAIL_PX, distance * RESISTANCE) / distance : 0;

    button.style.setProperty("--liquid-x", `${dx * trail}px`);
    button.style.setProperty("--liquid-y", `${dy * trail}px`);
    button.style.setProperty("--liquid-angle", `${Math.atan2(dy, dx)}rad`);
    button.style.setProperty("--liquid-pull", `${Math.min(1, distance / PULL_FULL_PX)}`);
  }, []);

  const schedule = useCallback(() => {
    if (frame.current) return;
    frame.current = requestAnimationFrame(paint);
  }, [paint]);

  const release = useCallback(() => {
    gesture.current = null;
    buttonRef.current?.removeAttribute("data-dragging");
    schedule();
  }, [schedule]);

  /* A key unmounted mid-drag must not leave a frame queued against it. */
  useEffect(
    () => () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    },
    [],
  );

  function onPointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (!enabled || event.button !== 0 || gesture.current) return;

    gesture.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      dx: 0,
      dy: 0,
      moved: false,
    };

    if (!prefersReducedMotion()) {
      event.currentTarget.setAttribute("data-dragging", "true");
    }
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLButtonElement>) {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;

    current.dx = event.clientX - current.startX;
    current.dy = event.clientY - current.startY;
    /* Latched: a gesture that ever passed the threshold stays a drag, even
       if the finger wanders back over where it started. */
    current.moved ||= Math.hypot(current.dx, current.dy) > DRAG_THRESHOLD_PX;

    if (!prefersReducedMotion()) schedule();
  }

  function onPointerUp(event: PointerEvent<HTMLButtonElement>) {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;

    /*
     * Lifting inside the key is what chooses it.
     *
     * Tested against the button's own box rather than against the drag
     * distance, because the box is where the reader is looking: a finger that
     * slid 12px and is still on the key meant to press it, and one that slid
     * 12px off the edge did not.
     */
    const box = event.currentTarget.getBoundingClientRect();
    const inside =
      event.clientX >= box.left &&
      event.clientX <= box.right &&
      event.clientY >= box.top &&
      event.clientY <= box.bottom;
    const choose = enabled && !current.moved && inside;

    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    release();

    if (choose) onChoose();
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label={label}
      tabIndex={enabled ? 0 : -1}
      /*
       * Only a keyboard activation comes through here.
       *
       * A pointer press already ends in onPointerUp above, and letting the
       * synthesised click through as well would navigate twice. `detail === 0`
       * is the activation that had no pointer behind it — Enter, Space, or an
       * assistive technology — which is exactly the one this handler is for.
       */
      onClick={event => {
        if (enabled && event.detail === 0) onChoose();
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onBlur={release}
    >
      {children}
    </button>
  );
}
