/* =========================================================
   A Cosmic page arrives through a warp, then assembles
   (Chi, 2026-11-14: 更科幻風格, 先躍遷再組裝)

   Yumi Cosmic's star chart (idea D) and its HUD (idea A) meet here, and
   the two take over from the rising liquid of 2026-11-12. Starlight
   streaks out from the middle of the screen, as if the deck had jumped.
   A scan line then passes down the screen, and each block of the page
   switches on as the line reaches its top, flickering on as an
   instrument does. The rows inside the blocks (settings, stories,
   conversations) slide in from the left one after another, as a HUD fills
   a list.

   | moment                                | when                          |
   |---------------------------------------|-------------------------------|
   | starlight streaks out of the middle   | 0–280ms                       |
   | a scan line passes top→foot           | 120–440ms                     |
   | a block switches on                   | when the line reaches its top,|
   |                                       | over 380ms                    |
   | its rows slide in                     | 80ms after the block, 35ms    |
   |                                       | apart, eight at most          |

   Standard settles under a passing lamp instead (playLampArrival in
   lib/motion/pageArrival.ts). Every motion is transform or opacity. A
   block holding a fixed element only flickers, for the reason
   pageArrival.ts gives.
   ========================================================= */

export const WARP_MS = 280;
export const SCAN_START_MS = 120;
export const SCAN_MS = 320;
export const ASSEMBLE_MS = 380;
export const ROW_MS = 360;
const ROW_LAG_MS = 80;
const ROW_STAGGER_MS = 35;
const MAX_ROWS = 8;
const STREAKS = 22;

/**
 * The page's rows that arrive one by one. `data-liquid-option` keeps its
 * name from the liquid it was made for; it means "a row of this page".
 */
export const ARRIVAL_ROWS = ".settings-panel > *, [data-liquid-option]";

/**
 * When the scan line reaches a block whose top is at `top`: the line
 * starts at the top of the screen once the warp is under way and crosses
 * it linearly, so the top block switches on first and a block at the foot
 * last.
 */
export function scanDelay(top: number, viewportHeight: number) {
  if (viewportHeight <= 0) return SCAN_START_MS;
  const down = Math.max(0, Math.min(1, top / viewportHeight));
  return SCAN_START_MS + Math.round(down * SCAN_MS);
}

const ORIGIN = "50% 0%";
const SWITCH_ON: Keyframe[] = [
  { opacity: 0, scale: "0.985", transformOrigin: ORIGIN },
  { opacity: 0.85, offset: 0.22 },
  { opacity: 0.3, offset: 0.36 },
  { opacity: 1, scale: "1", transformOrigin: ORIGIN, offset: 0.62 },
  { opacity: 1, scale: "1", transformOrigin: ORIGIN },
];
const FLICKER: Keyframe[] = [
  { opacity: 0 },
  { opacity: 0.85, offset: 0.22 },
  { opacity: 0.3, offset: 0.36 },
  { opacity: 1, offset: 0.62 },
  { opacity: 1 },
];
const ROW_IN: Keyframe[] = [
  { opacity: 0, translate: "-10px 0" },
  { opacity: 1, translate: "0 0" },
];

function overlay(name: string) {
  const element = document.createElement("div");
  element.setAttribute(name, "");
  element.setAttribute("aria-hidden", "true");
  Object.assign(element.style, {
    position: "fixed",
    inset: "0",
    zIndex: "45",
    pointerEvents: "none",
    overflow: "hidden",
  });
  document.body.appendChild(element);
  return element;
}

/**
 * A new arrival takes over from one still playing (2026-11-21, the
 * review-animations skill: motion a reader can set off quickly must be
 * interruptible). Pages changed in quick succession, back, back, used to
 * leave each arrival's starlight, scan line or lamp light running over the
 * next page's, two or three at once.
 */
export function clearArrivalOverlays() {
  document
    .querySelectorAll("[data-warp], [data-scan], [data-lamp-light]")
    .forEach((element) => element.remove());
}

/** Starlight streaking out from just above the middle of the screen. */
function warp(viewportWidth: number, viewportHeight: number) {
  const field = overlay("data-warp");
  const reach = Math.hypot(viewportWidth, viewportHeight) * 0.62;
  for (let i = 0; i < STREAKS; i++) {
    const angle = (360 / STREAKS) * i + Math.random() * 12;
    const length = reach * (0.18 + Math.random() * 0.22);
    const streak = document.createElement("span");
    Object.assign(streak.style, {
      position: "absolute",
      left: "50%",
      top: "44%",
      width: `${Math.round(length)}px`,
      height: i % 3 === 0 ? "1.5px" : "1px",
      transformOrigin: "0 50%",
      background: "linear-gradient(90deg, rgba(184, 232, 229, 0), rgba(220, 244, 242, 0.95))",
    });
    field.appendChild(streak);
    streak.animate(
      [
        { transform: `rotate(${angle}deg) translateX(18px) scaleX(0.08)`, opacity: 0 },
        { opacity: 0.95, offset: 0.3 },
        { transform: `rotate(${angle}deg) translateX(${Math.round(reach)}px) scaleX(1)`, opacity: 0 },
      ],
      { duration: WARP_MS, delay: Math.random() * 40, easing: "cubic-bezier(0.55, 0, 0.9, 0.4)", fill: "both" },
    );
  }
  window.setTimeout(() => field.remove(), WARP_MS + 120);
}

/** The scan line, with a faint wake of ice light above it. */
function scan(viewportHeight: number) {
  const layer = overlay("data-scan");
  const line = document.createElement("span");
  Object.assign(line.style, {
    position: "absolute",
    left: "0",
    right: "0",
    top: "-28px",
    height: "28px",
    background: "linear-gradient(180deg, rgba(184, 232, 229, 0), rgba(184, 232, 229, 0.1) 80%, rgba(220, 244, 242, 0.9) 96%, rgba(184, 232, 229, 0))",
  });
  layer.appendChild(line);
  line.animate(
    [
      { transform: "translateY(0)", opacity: 1 },
      { transform: `translateY(${viewportHeight + 28}px)`, opacity: 0.6 },
    ],
    { duration: SCAN_MS, delay: SCAN_START_MS, easing: "linear", fill: "both" },
  );
  window.setTimeout(() => layer.remove(), SCAN_START_MS + SCAN_MS + 200);
}

/**
 * Plays the arrival over the page's layers (already chosen and in view;
 * see RouteStage). `holdsFixed` says which may only flicker.
 */
export function playWarpArrival(layers: HTMLElement[], holdsFixed: (layer: Element) => boolean) {
  const viewportHeight = window.innerHeight;
  clearArrivalOverlays();
  warp(window.innerWidth, viewportHeight);
  scan(viewportHeight);
  layers.forEach((layer) => {
    const delay = scanDelay(layer.getBoundingClientRect().top, viewportHeight);
    layer.animate(holdsFixed(layer) ? FLICKER : SWITCH_ON, {
      duration: ASSEMBLE_MS,
      delay,
      easing: "linear",
      fill: "backwards",
    });
    const rows = Array.from(layer.querySelectorAll<HTMLElement>(ARRIVAL_ROWS))
      .filter((row) => row.getBoundingClientRect().top < viewportHeight)
      .slice(0, MAX_ROWS);
    rows.forEach((row, index) => {
      row.animate(ROW_IN, {
        duration: ROW_MS,
        delay: delay + ROW_LAG_MS + index * ROW_STAGGER_MS,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "backwards",
      });
    });
  });
}
