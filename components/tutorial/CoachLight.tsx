"use client";

import { useEffect, useRef, type RefObject } from "react";

import styles from "./CoachLight.module.css";

/* =========================================================
   The tour's light: a target lock on the key to press

   The tour's card says what to do. On a busy screen that still leaves the
   reader hunting for the key it means, so each step that asks for a press
   or a drag also names its target, and the key is locked on to, the way a
   heads-up display marks one (Chi, 2026-10-18: "光暈應該環繞按鍵形狀",
   "光圈加上「點這裡」漣漪", "高級科幻科技感" — after an arrow and a strip
   were tried and set aside):

     - four corner brackets close in from outside the key and settle round
       it — the lock;
     - an LED ring in the key's own shape, round keys round, pills a pill,
       cards a rounded card, brighter along the bottom, humming gently;
     - a ripple that leaves the ring every 1.8 s: tap here;
     - when the step is done, the ring flashes white and the brackets let
       go — confirmed.

   It outlines the key and glows outward; it never covers what the key says.

   ── Finding and following the target ───────────────────────────────────

   A step names its target as selectors, in order of preference: the first
   one with a visible element on screen wins. That is how "turn to Search"
   lights the dial's Search key while the dial is out and the search field
   when it is not.

   An `anchor` is a place rather than a thing: an element that marks where
   something is drawn by other means. Yumi is the case — `[data-yumi-figure]`
   says where she stands, and is hidden the moment the WebGL scene takes
   over drawing her — so an anchor counts if it has a size on screen,
   visible or not, and is ringed with an ellipse, having no corners of its
   own to follow.

   Targets move — the dial turns, cookies float — so the light looks again
   on a short timer rather than once. A timer, not every frame: this runs on
   the home screen beside a WebGL scene, and a forced layout every frame is
   exactly the kind of cost the landing page was rid of. A short transition
   makes the steps between readings a glide.

   It steps aside while the reader types, while the card is hidden, and when
   the key is under the card.
   ========================================================= */

/** How far outside the key's edge the ring sits; the brackets sit beyond it. */
const PAD = 3;
/** A key with square corners still gets softened ones. */
const MIN_RADIUS = 10;
/** How often it looks again for where its target has gone. */
const REFRESH_MS = 140;

/** A selector, or a place whose element may itself be hidden. */
export type CoachTarget = string | { readonly selector: string; readonly anchor?: boolean };

function shown(element: Element) {
  const check = (element as HTMLElement).checkVisibility;
  return typeof check === "function"
    ? check.call(element, { opacityProperty: true, visibilityProperty: true })
    : true;
}

/** The first element any of the targets finds on screen. */
export function findTarget(
  targets: readonly CoachTarget[],
): { element: Element; rect: DOMRect; anchor: boolean } | null {
  for (const target of targets) {
    const selector = typeof target === "string" ? target : target.selector;
    const anchor = typeof target !== "string" && Boolean(target.anchor);

    for (const element of document.querySelectorAll(selector)) {
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;
      if (rect.bottom <= 0 || rect.right <= 0) continue;
      if (rect.top >= window.innerHeight || rect.left >= window.innerWidth) continue;
      if (!anchor && !shown(element)) continue;
      return { element, rect, anchor };
    }
  }
  return null;
}

/**
 * The key's corner radius, in pixels, read from its own style: "999px" on a
 * pill and "50%" on a circle both come back as half its short side.
 */
export function cornerRadius(radius: string, width: number, height: number): number {
  const half = Math.min(width, height) / 2;
  const value = Number.parseFloat(radius);
  if (!Number.isFinite(value)) return MIN_RADIUS;
  const pixels = radius.trim().endsWith("%") ? (value / 100) * Math.min(width, height) : value;
  return Math.min(half, Math.max(MIN_RADIUS, pixels));
}

function overlaps(a: DOMRect, b: DOMRect | null) {
  if (!b) return false;
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

/**
 * The ring for a key: its box, a few pixels out from the key's edge, and the
 * radius that keeps it the key's shape. Null when the key is under the card,
 * where a ring would be lit on top of the card instead.
 */
export function placeHalo(
  target: DOMRect,
  radius: number | "ellipse",
  avoid: DOMRect | null,
): { left: number; top: number; width: number; height: number; radius: string } | null {
  if (overlaps(target, avoid)) return null;

  return {
    left: target.left - PAD,
    top: target.top - PAD,
    width: target.width + PAD * 2,
    height: target.height + PAD * 2,
    radius: radius === "ellipse" ? "50%" : `${radius + PAD}px`,
  };
}

type CoachLightProps = {
  /** The target, in order of preference. */
  targets: readonly CoachTarget[];
  /** The tour's card: never covered, and while it is hidden so is this. */
  avoid: RefObject<HTMLElement | null>;
  /** The step was just done: flash once and let go. */
  done?: boolean;
};

export default function CoachLight({ targets, avoid, done = false }: CoachLightProps) {
  const ref = useRef<HTMLDivElement>(null);
  const key = JSON.stringify(targets);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const wanted = JSON.parse(key) as CoachTarget[];
    let placedOnce = false;

    /* A new target: start dark, so the lock plays again on it rather than
       the old lock gliding across. The read in between restarts the CSS. */
    element.dataset.shown = "false";
    void element.offsetWidth;

    const hide = () => {
      element.dataset.shown = "false";
      placedOnce = false;
    };

    const update = () => {
      const card = avoid.current;

      /* The card collapses to a strip while the reader types, and is hidden
         while the dial is out for steps that are not about the dial. A
         light without its sentence is a stray light. */
      if (
        document.querySelector('[data-yumi-typing="true"]') ||
        (card && !shown(card))
      ) {
        hide();
        return;
      }

      const found = findTarget(wanted);
      const radius = found
        ? found.anchor
          ? "ellipse"
          : cornerRadius(
              getComputedStyle(found.element).borderTopLeftRadius,
              found.rect.width,
              found.rect.height,
            )
        : null;
      const halo =
        found && radius !== null
          ? placeHalo(found.rect, radius, card?.getBoundingClientRect() ?? null)
          : null;

      if (!halo) {
        hide();
        return;
      }

      /* No glide on the first reading: it should light up around the key,
         not slide in from wherever it last was. */
      element.dataset.glide = placedOnce ? "true" : "false";
      element.style.transform = `translate3d(${halo.left}px, ${halo.top}px, 0)`;
      element.style.width = `${halo.width}px`;
      element.style.height = `${halo.height}px`;
      element.style.setProperty("--light-radius", halo.radius);
      element.dataset.shown = "true";
      placedOnce = true;
    };

    update();
    const timer = window.setInterval(update, REFRESH_MS);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, { capture: true, passive: true });

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, { capture: true });
    };
  }, [avoid, key]);

  return (
    <div
      ref={ref}
      className={styles.light}
      data-coach-light=""
      data-shown="false"
      data-done={done ? "true" : undefined}
      aria-hidden="true"
    >
      <span className={styles.ripple} />
      <span className={styles.ring} />
      <span className={styles.corner} data-corner="tl" />
      <span className={styles.corner} data-corner="tr" />
      <span className={styles.corner} data-corner="bl" />
      <span className={styles.corner} data-corner="br" />
    </div>
  );
}
