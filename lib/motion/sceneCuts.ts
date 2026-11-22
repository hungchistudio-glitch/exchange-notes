/* =========================================================
   Designed cuts between pages (Chi, 2026-11-22: 推進卡片變成下一頁,
   Yumi 的 C 環穿過鏡頭)

   Two match cuts, from the "premium animations" notes, each ending on the
   ground of the page being opened so the cut lands on its background:

   - Card push. A tapped card grows into a panel that fills the screen, its
     own colour giving way to the page ground as it goes, as an app opens
     out of its icon. Used by a note's card into the note.
   - Through Yumi's ring. Her C flies out of the key that was pressed,
     toward the reader and past them; through its hole the next page's
     ground opens until it is all there is. Used by Home's games key.

   Either one asks for the page once the screen is covered, holds the
   ground while the page renders under it, then lifts. While it is up,
   `html[data-scene-cut]` tells RouteStage that the page should only fade in
   (no warp, no lamp, which would play under the cover and be half over by
   the time it lifts). Both finish before navigating, so the page's own
   render never lands on a moving frame. Reduced motion: straight there.
   ========================================================= */

const CUT = "data-scene-cut";

const EASE_IN_OUT = "cubic-bezier(0.77, 0, 0.175, 1)";
const LIFT_MS = 240;
const GIVE_UP_MS = 4000;

function still() {
  return typeof window.matchMedia !== "function" || window.matchMedia("(prefers-reduced-motion: reduce)").matches
    || typeof document.body.animate !== "function";
}

/** The page ground in the current mode: what the next page stands on. */
function ground() {
  /* The app's paper (or Cosmic's night), as the theme names it. */
  const surface = getComputedStyle(document.documentElement).getPropertyValue("--surface").trim();
  if (surface) return surface;
  const viewport = document.querySelector<HTMLElement>("[data-app-scroll-viewport]");
  for (const element of [viewport, document.body, document.documentElement]) {
    if (!element) continue;
    const colour = getComputedStyle(element).backgroundColor;
    if (colour && colour !== "transparent" && !/rgba\(\s*0,\s*0,\s*0,\s*0\s*\)/.test(colour)) return colour;
  }
  return document.documentElement.dataset.interfaceMode === "yumi-cosmic" ? "#08090b" : "#f4f1ea";
}

function cover(z = "1500") {
  const element = document.createElement("div");
  element.setAttribute("aria-hidden", "true");
  element.setAttribute(CUT, "");
  Object.assign(element.style, { position: "fixed", inset: "0", zIndex: z, pointerEvents: "none" });
  return element;
}

/**
 * Asks for the page, then lifts the cover once a page has been drawn under
 * it (three frames after the path changes, to wherever it went: a redirect
 * counts), or after GIVE_UP_MS whatever happens.
 */
function goThenLift(layer: HTMLElement, navigate: () => void) {
  const leaving = window.location.pathname;
  const root = document.documentElement;
  root.setAttribute(CUT, "");
  navigate();
  const started = performance.now();
  let lifted = false;
  const lift = () => {
    if (lifted) return;
    lifted = true;
    const fade = layer.animate([{ opacity: 1 }, { opacity: 0 }], { duration: LIFT_MS, easing: "cubic-bezier(0.23, 1, 0.32, 1)", fill: "forwards" });
    const done = () => {
      layer.remove();
      if (!document.querySelector(`body > [${CUT}]`)) root.removeAttribute(CUT);
    };
    fade.onfinish = done;
    window.setTimeout(done, LIFT_MS + 100);
  };
  let frames = 0;
  const watch = () => {
    if (lifted) return;
    if (window.location.pathname !== leaving) frames += 1;
    if (frames >= 3 || performance.now() - started > GIVE_UP_MS) lift();
    else requestAnimationFrame(watch);
  };
  requestAnimationFrame(watch);
  /* A hidden tab runs no frames. */
  window.setTimeout(lift, GIVE_UP_MS + 200);
}

/** A card opening into its page; `navigate` goes there. */
export function playCardPush(card: HTMLElement, navigate: () => void) {
  if (still()) {
    navigate();
    return;
  }
  const box = card.getBoundingClientRect();
  const look = getComputedStyle(card);
  const radius = parseFloat(look.borderTopLeftRadius) || 0;
  const from = `inset(${box.top}px ${innerWidth - box.right}px ${innerHeight - box.bottom}px ${box.left}px round ${radius}px)`;
  const layer = cover();
  const panel = document.createElement("div");
  Object.assign(panel.style, { position: "absolute", inset: "0", background: ground(), clipPath: from });
  /* The card's own face on top, fading into the ground as it grows. */
  const face = document.createElement("div");
  Object.assign(face.style, { position: "absolute", inset: "0", background: look.backgroundColor, boxShadow: look.boxShadow });
  panel.appendChild(face);
  layer.appendChild(panel);
  document.body.appendChild(layer);

  const grow = panel.animate(
    [{ clipPath: from }, { clipPath: "inset(0px 0px 0px 0px round 0px)" }],
    { duration: 340, easing: EASE_IN_OUT, fill: "forwards" },
  );
  face.animate([{ opacity: 1 }, { opacity: 1, offset: 0.25 }, { opacity: 0 }], { duration: 340, easing: "linear", fill: "forwards" });
  card.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 120, easing: "linear", fill: "forwards" });
  let gone = false;
  const go = () => {
    if (gone) return;
    gone = true;
    goThenLift(layer, navigate);
    card.getAnimations().forEach(animation => animation.cancel());
  };
  grow.onfinish = go;
  window.setTimeout(go, 420);
}

/**
 * Through Yumi's ring, out of `from` (the key pressed), into the page
 * `navigate` goes to. Her C
 * is drawn on a canvas each frame: as a vector blown up thirty times it
 * would be a huge raster, or a blurred one.
 */
export function playRingThrough(from: HTMLElement, navigate: () => void) {
  if (still()) {
    navigate();
    return;
  }
  const vw = innerWidth;
  const vh = innerHeight;
  const box = from.getBoundingClientRect();
  const sx = box.left + box.width / 2;
  const sy = box.top + box.height / 2;
  const cx = vw / 2;
  const cy = vh / 2;
  const halfDiagonal = Math.hypot(vw, vh) / 2;

  const layer = cover();
  const hole = document.createElement("div");
  Object.assign(hole.style, { position: "absolute", inset: "0", background: ground(), clipPath: `circle(0px at ${sx}px ${sy}px)` });
  const canvas = document.createElement("canvas");
  const scale = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(vw * scale);
  canvas.height = Math.round(vh * scale);
  Object.assign(canvas.style, { position: "absolute", inset: "0", width: `${vw}px`, height: `${vh}px` });
  layer.append(hole, canvas);
  document.body.appendChild(layer);
  const ctx = canvas.getContext("2d");

  const FLIGHT_MS = 420;
  /* Her C's gap faces the right, as in her mark. */
  const GAP = Math.PI * 0.42;
  const start = performance.now();
  let gone = false;
  const go = () => {
    if (gone) return;
    gone = true;
    canvas.remove();
    hole.style.clipPath = "none";
    goThenLift(layer, navigate);
  };

  const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
  const frame = (now: number) => {
    if (gone) return;
    const t = Math.min(1, (now - start) / FLIGHT_MS);
    const p = easeInOut(t);
    /* Out of the key to the middle of the screen as it comes at the reader. */
    const glide = Math.min(1, p * 1.6);
    const x = sx + (cx - sx) * glide;
    const y = sy + (cy - sy) * glide;
    /* The hole: from the key's size to past the corners, growing fastest last. */
    const inner = 6 + (halfDiagonal * 1.08 + Math.hypot(x - cx, y - cy)) * p ** 1.7;
    const thickness = Math.max(4, inner * 0.46);
    hole.style.clipPath = `circle(${inner.toFixed(1)}px at ${x.toFixed(1)}px ${y.toFixed(1)}px)`;
    if (ctx) {
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.clearRect(0, 0, vw, vh);
      const r = inner + thickness / 2;
      const turn = -0.5 * p;
      /* The body: glossy black, lit from the upper left. */
      const body = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
      body.addColorStop(0, "#2b3139");
      body.addColorStop(0.45, "#0b0d11");
      body.addColorStop(1, "#020304");
      ctx.lineCap = "round";
      ctx.lineWidth = thickness;
      ctx.strokeStyle = body;
      ctx.beginPath();
      ctx.arc(x, y, r, GAP / 2 + turn, Math.PI * 2 - GAP / 2 + turn);
      ctx.stroke();
      /* A softbox's highlight along her upper left. */
      ctx.lineWidth = thickness * 0.16;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
      ctx.beginPath();
      ctx.arc(x, y, r - thickness * 0.18, Math.PI * 1.05 + turn, Math.PI * 1.45 + turn);
      ctx.stroke();
      /* An ice rim on her outer edge. */
      ctx.lineWidth = Math.max(1, thickness * 0.025);
      ctx.strokeStyle = "rgba(184, 232, 229, 0.55)";
      ctx.beginPath();
      ctx.arc(x, y, r + thickness / 2 - 1, GAP / 2 + turn + 0.08, Math.PI * 2 - GAP / 2 + turn - 0.08);
      ctx.stroke();
    }
    if (t >= 1) go();
    else requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  window.setTimeout(go, FLIGHT_MS + 300);
}
