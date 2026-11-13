/* =========================================================
   A page arrives in layers (Chi, 2026-10-30)

   "進入每頁時應該要有種高級感，目前很尷尬地跳出": the stage faded a whole
   page from 60% over 150ms, which barely registers, and the moment that
   actually jumped was later, when a loading outline was swapped for the
   page in one frame. Chi chose the arrival: the page's layers float up
   one after another, the first at once, all of it inside about 0.35s.

   This file only decides. Which elements are the page's layers, which may
   move and which may only fade, and when each one starts. RouteStage plays
   it.

   Two things it is careful about:

   - **Movement can break fixed elements.** Any transform-like property on
     an element, `translate` included, makes it the containing block of
     every position: fixed element inside it for as long as it is set. A
     message composer or a floating button inside a moving layer would be
     laid out against the layer, not the screen, and jump when it ended
     (the reason RouteStage never moved the whole page). So a layer that
     holds a fixed element only fades.
   - **Arriving is not waiting.** The first layer starts at once, and the
     stagger shrinks as the layers grow in number, so the last one is under
     way by about 110ms whatever the page.
   ========================================================= */

/*
 * The layers' own timing. Since the lamp (below) and the liquid
 * (lib/motion/liquidArrival.ts) took over the two looks' arrivals, it
 * plays only where nothing may move: a page a feature's key is landing on
 * (lib/motion/featureFlight.ts), whose layers fade in, in turn.
 */
export const ARRIVAL_MS = 260;
/** The gap between layers, at most; and when the last of them must start by. */
const STAGGER_MAX_MS = 40;
const LAST_START_MS = 110;
/** More layers than this start together with the last. */
export const MAX_LAYERS = 7;
/** Past this many descendants a layer is not inspected: it only fades. */
const INSPECTION_BUDGET = 1500;

export const ARRIVAL_EASING = "cubic-bezier(0.22, 1, 0.36, 1)";

const NOT_CONTENT = new Set(["SCRIPT", "STYLE", "TEMPLATE", "LINK", "META", "NOSCRIPT"]);

function isRendered(element: Element) {
  return !NOT_CONTENT.has(element.tagName) && element.getClientRects().length > 0;
}

/**
 * The page's layers: down through the wrappers that hold one element each,
 * to the first element that holds several, whose children are the layers.
 * A page that is one block all the way down is one layer.
 */
export function arrivalLayers(stage: Element): HTMLElement[] {
  let node: Element = stage;
  for (let depth = 0; depth < 8; depth++) {
    const children = Array.from(node.children).filter(isRendered);
    if (children.length >= 2) return children as HTMLElement[];
    if (children.length === 0) break;
    node = children[0];
  }
  return node === stage ? [] : [node as HTMLElement];
}

/** Whether a layer is, or holds, a position: fixed element (see above). */
export function holdsFixed(layer: Element): boolean {
  if (getComputedStyle(layer).position === "fixed") return true;
  const walker = document.createTreeWalker(layer, NodeFilter.SHOW_ELEMENT);
  let seen = 0;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (++seen > INSPECTION_BUDGET) return true;
    const element = node as HTMLElement;
    // In normal flow, an element has an offset parent; a fixed one does not.
    // (Nor does one not displayed, or an SVG part: those cost one more read.)
    if (element.offsetParent !== null && element.offsetParent !== undefined) continue;
    if (getComputedStyle(element).position === "fixed") return true;
  }
  return false;
}

/** When the layer at `index` of `count` starts. */
export function arrivalDelay(index: number, count: number): number {
  if (count <= 1) return 0;
  const stagger = Math.min(STAGGER_MAX_MS, LAST_START_MS / (Math.min(count, MAX_LAYERS) - 1));
  return Math.round(Math.min(index, MAX_LAYERS - 1) * stagger);
}

/** A layer below the fold is not seen arriving: it is left alone. */
export function inView(layer: Element, viewportHeight: number) {
  return layer.getBoundingClientRect().top < viewportHeight;
}

/* =========================================================
   Standard's arrival: under the lamp (Chi, 2026-11-13: 暖光灑落)

   Standard Mode is a paper room lit from above (app/tactile.css), so a
   page comes in the way light reaches a desk: a band of warm lamp light
   passes down the screen, top to foot, and each block of the page settles
   onto the paper as the light reaches its top, coming down a few pixels
   and landing. The rows inside (settings, stories, conversations) then
   slide into place one after another, as index cards do. Yumi Cosmic's
   page rises under a liquid from the foot (lib/motion/liquidArrival.ts);
   this is its pair, at the same pace (Chi: 和 Cosmic 一樣明顯).

   | moment                          | when                                |
   |---------------------------------|-------------------------------------|
   | the light passes, top→foot      | 0–320ms, linear (the clock below)   |
   | a block settles                 | when the light reaches its top,     |
   |                                 | over 520ms                          |
   | its rows slide in               | 100ms after their block, 35ms apart |
   |                                 | (eight at most), over 420ms each    |

   Every motion is transform or opacity, and the light is painted once and
   only moved. A block holding a fixed element only fades (above).
   ========================================================= */

/** How long the light's leading edge takes to cross the whole screen. */
export const LAMP_SWEEP_MS = 320;
export const LAMP_LAYER_MS = 520;
export const LAMP_ROW_MS = 420;
const LAMP_ROW_LAG_MS = 100;
const LAMP_ROW_STAGGER_MS = 35;
const LAMP_MAX_ROWS = 8;
/** The band of light, as a share of the screen's height. */
const LAMP_BAND = 0.26;

/**
 * When the light reaches a block whose top is at `top`: its leading edge
 * starts at the top of the screen and crosses it linearly, so a block at
 * the top settles at once and one at the foot last.
 */
export function lampDelay(top: number, viewportHeight: number) {
  if (viewportHeight <= 0) return 0;
  const reached = Math.max(0, Math.min(top, viewportHeight)) / viewportHeight;
  return Math.round(reached * LAMP_SWEEP_MS);
}

const SETTLE: Keyframe[] = [
  { opacity: 0, translate: "0 -10px" },
  { opacity: 1, translate: "0 1px", offset: 0.62 },
  { opacity: 1, translate: "0 0" },
];
const FADE_IN: Keyframe[] = [{ opacity: 0 }, { opacity: 1 }];
const SLIDE_IN: Keyframe[] = [
  { opacity: 0, translate: "-14px 0" },
  { opacity: 1, translate: "0 0" },
];

/** The band of lamp light, warm and brightest at its leading edge. */
function passLight(viewportHeight: number) {
  const band = Math.round(viewportHeight * LAMP_BAND);
  const light = document.createElement("div");
  light.setAttribute("data-lamp-light", "");
  light.setAttribute("aria-hidden", "true");
  Object.assign(light.style, {
    position: "fixed",
    left: "0",
    right: "0",
    top: `${-band}px`,
    height: `${band}px`,
    zIndex: "45",
    pointerEvents: "none",
    background:
      "linear-gradient(180deg, rgba(255, 236, 196, 0) 0%, rgba(255, 228, 170, 0.22) 70%, rgba(255, 244, 214, 0.5) 94%, rgba(255, 244, 214, 0) 100%)",
  });
  document.body.appendChild(light);
  // Linear all the way, so the leading edge is where lampDelay says.
  const travel = viewportHeight + band;
  const at = (offset: number) => `translateY(${Math.round(travel * offset)}px)`;
  const pass = light.animate(
    [
      { transform: at(0), opacity: 0 },
      { transform: at(0.06), opacity: 1, offset: 0.06 },
      { transform: at(0.85), opacity: 1, offset: 0.85 },
      { transform: at(1), opacity: 0 },
    ],
    { duration: Math.round(LAMP_SWEEP_MS * (1 + LAMP_BAND)), easing: "linear", fill: "forwards" },
  );
  pass.onfinish = () => light.remove();
  // Whatever happens to the animation, the light does not outstay the page.
  window.setTimeout(() => light.remove(), LAMP_SWEEP_MS + 700);
}

/**
 * Plays Standard's arrival over the page's layers (already chosen and in
 * view; see RouteStage). `rows` names the rows that slide in after their
 * block: the same rows Cosmic turns into droplets.
 */
export function playLampArrival(layers: HTMLElement[], rows: string) {
  const viewportHeight = window.innerHeight;
  passLight(viewportHeight);
  layers.forEach((layer) => {
    const delay = lampDelay(layer.getBoundingClientRect().top, viewportHeight);
    layer.animate(holdsFixed(layer) ? FADE_IN : SETTLE, {
      duration: LAMP_LAYER_MS,
      delay,
      easing: ARRIVAL_EASING,
      fill: "backwards",
    });
    Array.from(layer.querySelectorAll<HTMLElement>(rows))
      .filter((row) => row.getBoundingClientRect().top < viewportHeight)
      .slice(0, LAMP_MAX_ROWS)
      .forEach((row, index) => {
        row.animate(SLIDE_IN, {
          duration: LAMP_ROW_MS,
          delay: delay + LAMP_ROW_LAG_MS + index * LAMP_ROW_STAGGER_MS,
          easing: ARRIVAL_EASING,
          fill: "backwards",
        });
      });
  });
}
