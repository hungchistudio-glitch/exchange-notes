/* =========================================================
   A page arrives under a rising liquid (Chi, 2026-11-12: 液體系)

   In Yumi Cosmic a new page comes up the way the voice sea comes up:
   a liquid surface, a line of ice light, rises from the bottom of the
   screen, and each block of the page floats up as the surface reaches it,
   with a small wobble, as something buoyant breaking a surface does. The
   rows inside (settings, stories, conversations) then stretch out of
   droplets into their full width, one after another (C1, the same motion
   a list of choices uses in a sheet: .settings-choice in app/cosmic.css).

   | moment                          | when                                |
   |---------------------------------|-------------------------------------|
   | the surface rises, bottom→top   | 0–300ms, linear (the clock below)   |
   | a block floats up               | when the surface reaches its foot,  |
   |                                 | over 520ms                          |
   | its rows become droplets, then  | 100ms after their block, 35ms apart |
   | rows                            | (eight at most), over 420ms each    |

   Standard Mode keeps the layered float-up (lib/motion/pageArrival.ts).
   Every motion is transform or opacity. A block holding a fixed element
   only fades, for the reason pageArrival.ts gives.
   ========================================================= */

/** How long the surface takes to cross the whole screen. */
export const LIQUID_SURFACE_MS = 300;
export const LIQUID_LAYER_MS = 520;
export const LIQUID_OPTION_MS = 420;
const OPTION_LAG_MS = 100;
const OPTION_STAGGER_MS = 35;
const MAX_OPTIONS = 8;

/** The page's rows that arrive as droplets. */
export const LIQUID_OPTIONS = ".settings-panel > *, [data-liquid-option]";

/**
 * When the rising surface reaches a block whose foot is at `bottom`: the
 * surface starts at the screen's bottom edge and crosses it linearly, so a
 * block at the foot of the screen starts at once and one at the top last.
 */
export function liquidDelay(bottom: number, viewportHeight: number) {
  if (viewportHeight <= 0) return 0;
  const fromFoot = (viewportHeight - Math.min(bottom, viewportHeight)) / viewportHeight;
  return Math.round(Math.max(0, Math.min(1, fromFoot)) * LIQUID_SURFACE_MS);
}

const ORIGIN = "50% 100%";
const FLOAT: Keyframe[] = [
  { opacity: 0, translate: "0 24px", scale: "1 0.92", transformOrigin: ORIGIN },
  { opacity: 1, translate: "0 -3px", scale: "1 1.025", transformOrigin: ORIGIN, offset: 0.58 },
  { translate: "0 1px", scale: "1 0.995", transformOrigin: ORIGIN, offset: 0.8 },
  { opacity: 1, translate: "0 0", scale: "1 1", transformOrigin: ORIGIN },
];
const FADE: Keyframe[] = [{ opacity: 0 }, { opacity: 1 }];
const DROPLET: Keyframe[] = [
  { opacity: 0, scale: "0.2 0.55" },
  { opacity: 1, scale: "1.03 1.02", offset: 0.6 },
  { opacity: 1, scale: "1 1" },
];

/** The line of light that is the liquid's surface. */
function riseSurface(viewportHeight: number) {
  const surface = document.createElement("div");
  surface.setAttribute("data-liquid-surface", "");
  surface.setAttribute("aria-hidden", "true");
  Object.assign(surface.style, {
    position: "fixed",
    left: "0",
    right: "0",
    bottom: "0",
    height: "2px",
    zIndex: "45",
    pointerEvents: "none",
    background: "linear-gradient(90deg, transparent, rgba(184, 232, 229, 0.9) 30%, rgba(184, 232, 229, 0.9) 70%, transparent)",
    boxShadow: "0 0 14px 2px rgba(184, 232, 229, 0.35), 0 10px 26px rgba(184, 232, 229, 0.12)",
  });
  document.body.appendChild(surface);
  const rise = surface.animate(
    [
      { transform: "translateY(0)", opacity: 0.95 },
      { transform: `translateY(-${viewportHeight}px)`, opacity: 0.7, offset: 0.92 },
      { transform: `translateY(-${viewportHeight + 8}px)`, opacity: 0 },
    ],
    { duration: LIQUID_SURFACE_MS + 60, easing: "linear", fill: "forwards" },
  );
  rise.onfinish = () => surface.remove();
  // Whatever happens to the animation, the line does not outstay the page.
  window.setTimeout(() => surface.remove(), LIQUID_SURFACE_MS + 600);
}

/**
 * Plays the arrival over the page's layers (already chosen and in view;
 * see RouteStage). `holdsFixed` says which may only fade.
 */
export function playLiquidArrival(layers: HTMLElement[], holdsFixed: (layer: Element) => boolean) {
  const viewportHeight = window.innerHeight;
  riseSurface(viewportHeight);
  layers.forEach((layer) => {
    const delay = liquidDelay(layer.getBoundingClientRect().bottom, viewportHeight);
    const float = !holdsFixed(layer);
    layer.animate(float ? FLOAT : FADE, {
      duration: LIQUID_LAYER_MS,
      delay,
      easing: "ease-out",
      fill: "backwards",
    });
    const options = Array.from(layer.querySelectorAll<HTMLElement>(LIQUID_OPTIONS))
      .filter((option) => option.getBoundingClientRect().top < viewportHeight)
      .slice(0, MAX_OPTIONS);
    options.forEach((option, index) => {
      option.animate(DROPLET, {
        duration: LIQUID_OPTION_MS,
        delay: delay + OPTION_LAG_MS + index * OPTION_STAGGER_MS,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "backwards",
      });
    });
  });
}
