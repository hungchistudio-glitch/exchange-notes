/* =========================================================
   A press answered (Chi, 2026-11-22: 按壓＋漣漪的觸控回饋)

   Two parts, and neither touches the pressed element's own layout:

   - The squish is CSS (app/globals.css, "Press"): `scale` on :active, which
     composes with any transform the element already has, quick going in
     and released on the pop spring, so it gives a little on the way back.
   - The ripple is here: one delegated pointerdown for the whole app. A
     clip the shape of the pressed thing (its box and border radius) is laid
     in a top layer over it, and a soft circle of the thing's own ink grows
     out of the finger inside it and fades. Nothing is inserted into the
     element, so no `overflow` or `position` is changed under anyone.

   Skipped: the games, which keep their own feel and sounds; anything inside
   [data-no-press]; text fields; disabled controls; inline text links;
   things too small to hold a ripple; reduced motion.
   ========================================================= */

const PRESSABLE = 'button, [role="button"], [role="tab"], [role="switch"], [role="menuitem"], [role="radio"], a[href]';
const SKIP = "[data-no-press], input, textarea, select, [contenteditable='true']";
const OWN_FEEL = /^\/(hangyumi|wordvault|starweaver)(\/|$)/;
const RIPPLE_MS = 560;

let layer: HTMLElement | null = null;

function rippleLayer() {
  if (layer?.isConnected) return layer;
  layer = document.createElement("div");
  layer.setAttribute("aria-hidden", "true");
  layer.setAttribute("data-press-ripples", "");
  Object.assign(layer.style, { position: "fixed", inset: "0", pointerEvents: "none", zIndex: "9000" });
  document.body.appendChild(layer);
  return layer;
}

const mixes = typeof CSS !== "undefined" && typeof CSS.supports === "function"
  && CSS.supports("background-color", "color-mix(in srgb, red 10%, transparent)");

/** The pressed element, if a ripple belongs on it. */
export function pressTarget(from: EventTarget | null): HTMLElement | null {
  const element = (from as Element | null)?.closest?.(PRESSABLE) as HTMLElement | null;
  if (!element || element.closest(SKIP)) return null;
  if (element.matches(":disabled, [aria-disabled='true']")) return null;
  return element;
}

export function ripple(element: HTMLElement, x: number, y: number) {
  const box = element.getBoundingClientRect();
  if (box.width < 28 || box.height < 20) return;
  /* A whole-screen surface pressed is not a key. */
  if (box.width * box.height > innerWidth * innerHeight * 0.45) return;
  const look = getComputedStyle(element);
  if (look.display === "inline" || look.visibility === "hidden") return;

  const clip = document.createElement("span");
  Object.assign(clip.style, {
    position: "fixed",
    left: `${box.left}px`,
    top: `${box.top}px`,
    width: `${box.width}px`,
    height: `${box.height}px`,
    borderRadius: look.borderRadius,
    overflow: "hidden",
    color: look.color,
  });
  const size = Math.ceil(Math.hypot(box.width, box.height) * 2);
  const wave = document.createElement("span");
  Object.assign(wave.style, {
    position: "absolute",
    left: `${x - box.left - size / 2}px`,
    top: `${y - box.top - size / 2}px`,
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: "50%",
    /* The thing's own ink, faint: white on a black key, ink on paper. */
    background: mixes
      ? "radial-gradient(circle, color-mix(in srgb, currentColor 22%, transparent) 0%, color-mix(in srgb, currentColor 14%, transparent) 45%, transparent 70%)"
      : "radial-gradient(circle, rgba(128, 128, 128, 0.2) 0%, rgba(128, 128, 128, 0) 70%)",
    transform: "scale(0.08)",
  });
  clip.appendChild(wave);
  rippleLayer().appendChild(clip);
  wave.animate(
    [
      { transform: "scale(0.08)", opacity: 1 },
      { transform: "scale(1)", opacity: 0 },
    ],
    { duration: RIPPLE_MS, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "forwards" },
  );
  window.setTimeout(() => clip.remove(), RIPPLE_MS + 40);
}

/** Installs the ripple for the whole document; returns its removal. */
export function installPressFeedback() {
  if (typeof window === "undefined" || typeof document.body.animate !== "function") return () => {};
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const onDown = (event: PointerEvent) => {
    if (event.button !== 0 || reduce.matches || OWN_FEEL.test(window.location.pathname)) return;
    const element = pressTarget(event.target);
    if (element) ripple(element, event.clientX, event.clientY);
  };
  /* A ripple is drawn where the key was; scrolling would leave it behind. */
  const onScroll = () => layer?.replaceChildren();
  document.addEventListener("pointerdown", onDown, { capture: true, passive: true });
  document.addEventListener("scroll", onScroll, { capture: true, passive: true });
  return () => {
    document.removeEventListener("pointerdown", onDown, { capture: true });
    document.removeEventListener("scroll", onScroll, { capture: true });
    layer?.remove();
    layer = null;
  };
}
