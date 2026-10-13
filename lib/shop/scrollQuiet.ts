/* =========================================================
   Hold the animations while the catalogue scrolls

   On a phone, scrolling is the thing the reader is doing, and the stand's
   two canvases drawing underneath it were what made the shop feel sticky
   (Chi, 2026-10-13: "手機版的商店介面還是卡卡的"). The shop marks every scroll
   here; the stand and the sky skip their frames until it has been still for
   a moment. Nothing visible is lost: a held frame is still on screen.
   ========================================================= */

const QUIET_MS = 160;
let scrollingUntil = 0;

export function markScrolling(now = performance.now()) {
  scrollingUntil = now + QUIET_MS;
}

export function isScrolling(now: number): boolean {
  return now < scrollingUntil;
}
