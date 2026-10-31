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

/** How far a layer rises, and over how long. */
export const ARRIVAL_RISE_PX = 10;
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
