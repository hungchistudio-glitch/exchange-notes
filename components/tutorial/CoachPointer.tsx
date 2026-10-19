"use client";

import { useEffect, useId, useRef, type CSSProperties, type RefObject } from "react";

import {
  NEEDLE_LENGTH,
  NEEDLE_PATH,
  NEEDLE_WIDTH,
  SHEEN_PATH,
  SPINE_PATH,
  STAR_CENTRE,
  STAR_PATH,
  TIP,
} from "./coachNeedle";
import styles from "./CoachPointer.module.css";

/* =========================================================
   The tour's arrow: a lit needle at the thing to press

   The tour's card says what to do. On a busy screen that still leaves the
   reader hunting for the key it means, so each step that asks for a press or
   a drag also names its target, and this points at it (Chi, 2026-10-18:
   "增加箭頭指示教學要按的鍵…像是 led light 科技感閃爍").

   A fine swash of a needle with a four-point star at its back (Chi's
   reference, 2026-10-18: a tapering hairline crossed by a slim star, "可以
   捲曲", "更有設計感"). It draws itself from the star to the target when it
   appears. Then, over and over, a cyan comet leaves the star — which flares
   as it goes — runs down the needle, and as it reaches the point the needle
   dips towards the target once and a small ring opens there: tap here.
   That is the LED part of the brief, kept "精緻簡約". Ink on Standard's
   cream, pale light on Cosmic's navy (coachNeedle.ts has the shape; the CSS
   has the colours and the timing).

   ── Finding and following the target ───────────────────────────────────

   A step names its target as selectors, in order of preference: the first
   one with a visible element on screen wins. That is how "turn to Search"
   points at the dial's Search key while the dial is out and at the search
   field when it is not.

   An `anchor` is a place rather than a thing: an element that marks where
   something is drawn by other means. Yumi is the case — `[data-yumi-figure]`
   says where she stands, and is hidden the moment the WebGL scene takes
   over drawing her — so an anchor counts if it has a size on screen,
   visible or not.

   Targets move — the dial turns, cookies float, Yumi breathes — so the
   arrow looks again every few frames' worth of time rather than once. It
   reads rects on a timer instead of every frame, because this runs on the
   home screen beside a WebGL scene, and a forced layout every frame is
   exactly the kind of cost the landing page was rid of. A short transition
   on its transform makes the steps between readings a glide.

   It never stands on the tour's own card, never leaves the screen, and
   steps aside entirely while the reader types or the card is hidden.
   ========================================================= */

/** The needle pointing down, before it is turned to face its target. */
const LONG = NEEDLE_LENGTH;
const SHORT = NEEDLE_WIDTH;
/** Between the arrow's tip and the target's edge. */
const GAP = 4;
/** Keeps the arrow off the screen's edges. */
const MARGIN = 6;
/** How often it looks again for where its target has gone. */
const REFRESH_MS = 140;

export type Side = "above" | "below" | "left" | "right";

/** Which way the arrow is turned for each side it can stand on. */
const ROTATION: Record<Side, number> = { above: 0, below: 180, left: -90, right: 90 };

export type Box = { left: number; top: number; width: number; height: number };

function overlaps(a: Box, b: DOMRect | null) {
  if (!b) return false;
  return (
    a.left < b.right &&
    a.left + a.width > b.left &&
    a.top < b.bottom &&
    a.top + a.height > b.top
  );
}

function onScreen(box: Box) {
  return (
    box.left >= MARGIN &&
    box.top >= MARGIN &&
    box.left + box.width <= window.innerWidth - MARGIN &&
    box.top + box.height <= window.innerHeight - MARGIN
  );
}

function shown(element: Element) {
  const check = (element as HTMLElement).checkVisibility;
  return typeof check === "function"
    ? check.call(element, { opacityProperty: true, visibilityProperty: true })
    : true;
}

/**
 * A selector, or one with options. `anchor` marks a place whose element may
 * itself be hidden (see above). `from` names the sides to try first, for a
 * target whose usual side would cover something worth seeing — below Yumi
 * is her voice line, below OmniLexicon's field are its mode keys.
 */
export type CoachTarget =
  | string
  | {
      readonly selector: string;
      readonly anchor?: boolean;
      readonly from?: readonly Side[];
    };

/** The first element any of the targets finds on screen, with its target. */
export function findTargetWithin(
  targets: readonly CoachTarget[],
): { rect: DOMRect; target: CoachTarget; element: Element } | null {
  for (const target of targets) {
    const selector = typeof target === "string" ? target : target.selector;
    const anchor = typeof target !== "string" && Boolean(target.anchor);

    for (const element of document.querySelectorAll(selector)) {
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;
      if (rect.bottom <= 0 || rect.right <= 0) continue;
      if (rect.top >= window.innerHeight || rect.left >= window.innerWidth) continue;
      if (!anchor && !shown(element)) continue;
      return { rect, target, element };
    }
  }
  return null;
}

/** The first element any of the targets finds on screen, as a rect. */
export function findTarget(targets: readonly CoachTarget[]): DOMRect | null {
  return findTargetWithin(targets)?.rect ?? null;
}

/**
 * Where the arrow stands for a target: on the side with the most room that
 * keeps it on screen and off the card. Above or below first, because a
 * vertical arrow reads fastest; beside only when neither fits.
 */
/** Things the needle should not lie across, if it has a choice. */
const CONTENT = 'a, button, input, textarea, select, label, p, h1, h2, h3, h4, li, [role="button"]';

/**
 * How much other content a box would cover: three points down its middle,
 * each counting if it lands on a control or a line of text that is not the
 * target itself. Reads the page, so only the live component passes it in.
 */
export function crowding(target: Element) {
  return (box: Box) => {
    let crowded = 0;
    const lengthwise = box.height >= box.width;
    for (const share of [0.2, 0.5, 0.8]) {
      const x = lengthwise ? box.left + box.width / 2 : box.left + box.width * share;
      const y = lengthwise ? box.top + box.height * share : box.top + box.height / 2;
      const hit = document.elementFromPoint(x, y);
      if (!hit || target.contains(hit) || hit.contains(target)) continue;
      if (hit.closest(CONTENT)) crowded += 1;
    }
    return crowded;
  };
}

export function placeArrow(
  target: DOMRect,
  avoid: DOMRect | null,
  prefer: readonly Side[] = [],
  /** Scores a box by what it would cover; the least covered side wins. */
  crowded?: (box: Box) => number,
): { side: Side; x: number; y: number } | null {
  const cx = target.left + target.width / 2;
  const cy = target.top + target.height / 2;

  const boxes: Record<Side, Box> = {
    above: { left: cx - SHORT / 2, top: target.top - GAP - LONG, width: SHORT, height: LONG },
    below: { left: cx - SHORT / 2, top: target.bottom + GAP, width: SHORT, height: LONG },
    left: { left: target.left - GAP - LONG, top: cy - SHORT / 2, width: LONG, height: SHORT },
    right: { left: target.right + GAP, top: cy - SHORT / 2, width: LONG, height: SHORT },
  };

  const room: Record<Side, number> = {
    above: target.top,
    below: window.innerHeight - target.bottom,
    left: target.left,
    right: window.innerWidth - target.right,
  };

  const vertical: Side[] = room.above >= room.below ? ["above", "below"] : ["below", "above"];
  const horizontal: Side[] = room.left >= room.right ? ["left", "right"] : ["right", "left"];

  const order = [...prefer, ...vertical, ...horizontal].filter(
    (side, index, all) => all.indexOf(side) === index,
  );

  /*
   * The first side that fits, unless another that fits covers less: a long
   * needle laid across a neighbouring key and its label reads as a mess,
   * however right its point is.
   */
  let best: { side: Side; box: Box; score: number } | null = null;
  for (const side of order) {
    const box = boxes[side];
    if (!onScreen(box) || overlaps(box, avoid)) continue;
    const score = crowded ? crowded(box) : 0;
    if (!best || score < best.score) best = { side, box, score };
    if (score === 0) break;
  }

  if (!best) return null;
  const { side, box } = best;
  return { side, x: box.left + box.width / 2, y: box.top + box.height / 2 };
}

type CoachPointerProps = {
  /** The target, in order of preference. */
  targets: readonly CoachTarget[];
  /** The tour's card: never covered, and while it is hidden so is this. */
  avoid: RefObject<HTMLElement | null>;
};

export default function CoachPointer({ targets, avoid }: CoachPointerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const maskId = `coach-needle-${useId().replace(/:/g, "")}`;
  const key = JSON.stringify(targets);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const wanted = JSON.parse(key) as CoachTarget[];
    let placedOnce = false;

    const hide = () => {
      element.dataset.shown = "false";
      placedOnce = false;
    };

    const update = () => {
      const card = avoid.current;

      /* The card collapses to a strip while the reader types, and is hidden
         while the dial is out for steps that are not about the dial. An
         arrow without its sentence is a stray light. */
      if (
        document.querySelector('[data-yumi-typing="true"]') ||
        (card && !shown(card))
      ) {
        hide();
        return;
      }

      const found = findTargetWithin(wanted);
      const prefer = found && typeof found.target !== "string" ? (found.target.from ?? []) : [];
      const place =
        found &&
        placeArrow(
          found.rect,
          card?.getBoundingClientRect() ?? null,
          prefer,
          crowding(found.element),
        );
      if (!place) {
        hide();
        return;
      }

      /* No glide on the first reading: it should appear at the target, not
         fly in from wherever it last was. */
      element.dataset.glide = placedOnce ? "true" : "false";
      element.style.transform = `translate3d(${place.x}px, ${place.y}px, 0)`;
      element.dataset.side = place.side;
      element.style.setProperty("--turn", `${ROTATION[place.side]}deg`);
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
      className={styles.pointer}
      data-coach-pointer=""
      data-shown="false"
      aria-hidden="true"
    >
      <svg
        className={styles.needle}
        width={NEEDLE_WIDTH}
        height={NEEDLE_LENGTH}
        viewBox={`0 0 ${NEEDLE_WIDTH} ${NEEDLE_LENGTH}`}
        style={
          {
            "--star-x": `${STAR_CENTRE[0]}px`,
            "--star-y": `${STAR_CENTRE[1]}px`,
            "--tip-x": `${TIP[0]}px`,
            "--tip-y": `${TIP[1]}px`,
          } as CSSProperties
        }
      >
        <defs>
          {/* The draw-in: the star first, then the needle from it to the tip. */}
          <mask id={maskId} maskUnits="userSpaceOnUse">
            <circle cx={STAR_CENTRE[0]} cy={STAR_CENTRE[1]} r={12} fill="white" />
            <path className={styles.reveal} d={SPINE_PATH} pathLength={100} />
          </mask>
        </defs>

        {/* Where the point lands, a ring opens as the light arrives. */}
        <circle className={styles.ripple} cx={TIP[0]} cy={TIP[1]} r={3} />

        <g className={styles.nudge}>
          <g mask={`url(#${maskId})`}>
            <path className={styles.body} d={NEEDLE_PATH} />
            <path className={styles.sheen} d={SHEEN_PATH} />
          </g>

          {/* The comet: a soft tail, a brighter middle, a white-hot head. */}
          <path className={`${styles.light} ${styles.tail}`} d={SPINE_PATH} pathLength={100} />
          <path className={`${styles.light} ${styles.trail}`} d={SPINE_PATH} pathLength={100} />
          <path className={`${styles.light} ${styles.head}`} d={SPINE_PATH} pathLength={100} />

          <path className={styles.star} d={STAR_PATH} />
          <circle className={styles.core} cx={STAR_CENTRE[0]} cy={STAR_CENTRE[1]} r={1.5} />
        </g>
      </svg>
    </div>
  );
}
