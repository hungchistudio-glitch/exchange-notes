import { interfaceSounds, unlockInterfaceSounds } from "@/lib/sound/interfaceSounds";

/* =========================================================
   From the landing page into sign-in, through Yumi's eye
   (Chi, 2026-11-21: 按鈕變成 Yumi 的眼睛; 2026-11-22: 更有質感更科幻 —
   虹膜掃描＋躍遷, about 1.2 seconds, scanning on while sign-in loads, the
   interface's sounds, the card assembled out of a HUD frame)

   | moment                                                  | when        |
   |---------------------------------------------------------|-------------|
   | the key draws in; her eye, a glass lens, opens there    | 0–200ms     |
   | the dark spreads from the key; the eye glides to centre | 120–520ms   |
   | sign-in is asked for (the screen is covered)            | 520ms       |
   | HUD brackets snap round her eye, tick rings turn        | 460–660ms   |
   | a scan line passes over her iris, a sweep goes round    | 500–820ms   |
   |   ...and passes again, up and down, until sign-in is    |             |
   |   there to go to                                        |             |
   | lock: the brackets clamp, the ring lights, a click      | +80ms       |
   | through the pupil: its starry dark fills the screen as  | +200ms      |
   |   starlight streaks out                                 |             |
   | the brackets fly out to the sign-in card's corners, her | +240ms      |
   |   eye goes home into the card's Yumi                    |             |
   | a scan line wipes the night away top to foot, the card  | +340ms      |
   |   switching on as it passes                             |             |

   Her eye keeps Yumi's own face, a white eye, a black ring, a white ring
   and a black pupil with a glint (ExchangeNotesMark), drawn as glass: a
   lit sphere for the white, fine ice fibres engraved in the black ring, a
   cornea's highlight, a hint of colour fringing at the rim, and stars in
   the pupil, which is what the reader falls through.

   It is built at its full size in the middle of the screen and starts
   scaled down over the key, so it is never a small layer blown up.
   Sign-in renders while she scans (two tasks of about 85ms on a computer),
   when only the compositor is free, so the scan, the sweep, the lock, the
   frame and the wipe are transforms and opacity alone, on layers made
   before they move; the wipe is a curtain sliding down over night sliding
   up. The two clip-paths, the dark's spread from the key and the pupil's
   opening, play while nothing else needs the main thread. Driven by
   timers rather than animation events, so a hidden tab still gets
   through. The cover is on <body>, outside React, so it lasts across the
   client navigation, and if sign-in never comes it lets go and gives the
   key back. Reduced motion: no cover, straight to sign-in.
   ========================================================= */

const COVER = "data-login-cover";

const FORM_MS = 200;
const DRAW_IN_MS = 380;
/** When the dark has covered the screen and sign-in is asked for. */
const COVERED_AT = FORM_MS - 80 + DRAW_IN_MS + 20;
const HUD_AT = 460;
const SCAN_AT = 500;
const SCAN_PASS_MS = 320;
const LOCK_MS = 80;
const THROUGH_MS = 200;
const FRAME_MS = 240;
const WIPE_DELAY_MS = 40;
const WIPE_MS = 340;
const SWITCH_ON_MS = 380;
const GIVE_UP_MS = 5000;
const STREAKS = 26;

const ICE = "rgba(184, 232, 229, 0.95)";
/* Teal that reads on the night and on the light sign-in page alike. */
const FRAME_INK = "#3fb7b2";
const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";
const EASE_IN_OUT = "cubic-bezier(0.65, 0, 0.35, 1)";
const SWITCH_ON: Keyframe[] = [
  { opacity: 0, transform: "scale(0.985)", transformOrigin: "50% 0%" },
  { opacity: 0.85, offset: 0.22 },
  { opacity: 0.3, offset: 0.36 },
  { opacity: 1, transform: "scale(1)", transformOrigin: "50% 0%", offset: 0.62 },
  { opacity: 1, transform: "scale(1)", transformOrigin: "50% 0%" },
];

function reducedMotion() {
  return typeof window.matchMedia === "function"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function layer(style: Partial<CSSStyleDeclaration>, fixed = false) {
  const element = document.createElement("div");
  element.setAttribute("aria-hidden", "true");
  Object.assign(element.style, { position: fixed ? "fixed" : "absolute", pointerEvents: "none", ...style });
  return element;
}

/** Animates if the element can; an SVG node in an old browser simply stays. */
function run(element: Element, keyframes: Keyframe[], options: KeyframeAnimationOptions) {
  const target = element as Element & { animate?: Element["animate"] };
  return typeof target.animate === "function" ? target.animate(keyframes, options) : null;
}

/*
 * Stars, as one small tile drawn once on a canvas and repeated. Drawn as
 * dozens of radial gradients they made every frame of the dark's spread
 * repaint dozens of full-screen layers: two seconds without a frame.
 */
const starTiles = new Map<string, string>();
function starTile(tile: number, count: number, seed: number) {
  const key = `${tile}:${count}:${seed}`;
  const cached = starTiles.get(key);
  if (cached !== undefined) return cached;
  let url = "";
  try {
    const scale = Math.min(2, window.devicePixelRatio || 1);
    const paper = document.createElement("canvas");
    paper.width = paper.height = Math.round(tile * scale);
    const ctx = paper.getContext("2d");
    if (ctx) {
      let h = seed;
      const next = () => {
        h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
        h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0;
        return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
      };
      ctx.scale(scale, scale);
      for (let i = 0; i < count; i++) {
        const alpha = 0.3 + next() * 0.6;
        ctx.fillStyle = next() > 0.6 ? `rgba(184, 232, 229, ${alpha})` : `rgba(255, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(next() * tile, next() * tile, 0.5 + next() * 0.9, 0, Math.PI * 2);
        ctx.fill();
      }
      url = `url(${paper.toDataURL("image/png")})`;
    }
  } catch {
    url = "";
  }
  starTiles.set(key, url);
  return url;
}

/** A starry ground: the tile over a gradient, or the gradient alone. */
function starry(gradient: string, tile: number, count: number, seed: number) {
  const stars = starTile(tile, count, seed);
  return {
    backgroundImage: stars ? `${stars}, ${gradient}` : gradient,
    backgroundSize: stars ? `${tile}px ${tile}px, 100% 100%` : "100% 100%",
    backgroundRepeat: stars ? "repeat, no-repeat" : "no-repeat",
  };
}

function disc(size: number, style: Partial<CSSStyleDeclaration>) {
  return layer({
    left: "50%",
    top: "50%",
    width: `${size}px`,
    height: `${size}px`,
    marginLeft: `${-size / 2}px`,
    marginTop: `${-size / 2}px`,
    borderRadius: "50%",
    ...style,
  });
}

/**
 * Yumi's eye as glass, `size` across: the lit white, the engraved black
 * ring, the white ring, the starry pupil, its glints and the cornea's
 * highlight. `band` is the scan's light across it; `glow`, the iris lit at
 * the lock.
 */
function lens(size: number) {
  const px = (fraction: number) => `${Math.max(1, Math.round(size * fraction))}px`;
  const eye = layer({ left: "0", top: "0", width: `${size}px`, height: `${size}px` });
  const white = disc(size, {
    background: "radial-gradient(circle at 36% 30%, #ffffff 0%, #f3f7fa 34%, #d6e0e8 70%, #a3b3c2 100%)",
    boxShadow: [
      `inset 0 ${px(-0.05)} ${px(0.1)} rgba(20, 40, 60, 0.28)`,
      `inset 0 ${px(0.02)} ${px(0.05)} rgba(255, 255, 255, 0.9)`,
      "0 0 0 1px rgba(7, 11, 18, 0.75)",
      /* Colour fringing at the rim, as a real lens shows. */
      "-1px 0 0 1px rgba(255, 96, 140, 0.28)",
      "1px 0 0 1px rgba(90, 190, 255, 0.32)",
      `0 0 ${px(0.3)} rgba(110, 220, 214, 0.38)`,
    ].join(", "),
  });
  const ring = disc(size * 0.66, {
    background: [
      "repeating-conic-gradient(from 0deg, rgba(150, 225, 220, 0.24) 0deg 0.8deg, rgba(0, 0, 0, 0) 0.8deg 6deg)",
      "radial-gradient(circle, #0b121b 0%, #070b11 60%, #142130 86%, #05080c 100%)",
    ].join(", "),
    boxShadow: `inset 0 0 0 1px rgba(184, 232, 229, 0.22), inset 0 ${px(0.03)} ${px(0.06)} rgba(0, 0, 0, 0.85)`,
  });
  const glow = disc(size * 0.66, {
    background: "radial-gradient(circle, rgba(184, 232, 229, 0) 44%, rgba(184, 232, 229, 0.7) 70%, rgba(184, 232, 229, 0) 100%)",
    opacity: "0",
  });
  const inner = disc(size * 0.42, {
    background: "radial-gradient(circle at 40% 34%, #ffffff 0%, #e4ecf2 80%, #b9c7d3 100%)",
    boxShadow: `inset 0 ${px(-0.012)} ${px(0.03)} rgba(20, 40, 60, 0.35)`,
  });
  const pupil = disc(size * 0.34, {
    ...starry("radial-gradient(circle at 50% 50%, #102038 0%, #060a12 66%, #020306 100%)", Math.round(size * 0.34), 7, 7),
    boxShadow: "inset 0 0 0 1px rgba(0, 0, 0, 0.6)",
  });
  const glint = layer({
    left: `${size * 0.5 - size * 0.1}px`,
    top: `${size * 0.5 - size * 0.105}px`,
    width: px(0.075),
    height: px(0.075),
    borderRadius: "50%",
    background: "#ffffff",
    boxShadow: `0 0 ${px(0.04)} rgba(255, 255, 255, 0.9)`,
  });
  const spark = layer({
    left: `${size * 0.5 + size * 0.05}px`,
    top: `${size * 0.5 + size * 0.045}px`,
    width: px(0.028),
    height: px(0.028),
    borderRadius: "50%",
    background: "rgba(255, 255, 255, 0.75)",
  });
  const cornea = disc(size, {
    background: "radial-gradient(ellipse 46% 34% at 32% 24%, rgba(255, 255, 255, 0.55) 0%, rgba(255, 255, 255, 0) 100%)",
  });
  /* The scan's light where it crosses her: clipped to the eye. */
  const clip = disc(size, { overflow: "hidden" });
  const band = layer({
    left: "0",
    right: "0",
    top: `${-size * 0.1}px`,
    height: `${size * 0.2}px`,
    background: "linear-gradient(180deg, rgba(184, 232, 229, 0), rgba(184, 232, 229, 0.42) 50%, rgba(184, 232, 229, 0))",
    opacity: "0",
  });
  clip.appendChild(band);
  eye.append(white, ring, glow, inner, pupil, glint, spark, cornea, clip);
  return { eye, band, glow, glint };
}

type Corner = "tl" | "tr" | "bl" | "br";
const CORNERS: Corner[] = ["tl", "tr", "bl", "br"];

/** An L of the HUD's frame, whose corner point is at its own corner. */
function bracket(corner: Corner, arm: number, line: number, ink: string, fixed = false) {
  const edge = `${line}px solid ${ink}`;
  return layer({
    width: `${arm}px`,
    height: `${arm}px`,
    borderTop: corner[0] === "t" ? edge : "0",
    borderBottom: corner[0] === "b" ? edge : "0",
    borderLeft: corner[1] === "l" ? edge : "0",
    borderRight: corner[1] === "r" ? edge : "0",
    transformOrigin: `${corner[1] === "l" ? "0" : "100%"} ${corner[0] === "t" ? "0" : "100%"}`,
  }, fixed);
}

/** Where an L's box goes so that its corner point lands on (x, y). */
function placeBracket(element: HTMLElement, corner: Corner, x: number, y: number, arm: number) {
  element.style.left = `${corner[1] === "l" ? x : x - arm}px`;
  element.style.top = `${corner[0] === "t" ? y : y - arm}px`;
}

const SVG = "http://www.w3.org/2000/svg";

/** One ring of the HUD, `radius` in a 100-unit box, in its own turning layer. */
function ring(box: number, radius: number, width: number, dash: string, opacity: number) {
  const holder = layer({ inset: "0" });
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("width", String(box));
  svg.setAttribute("height", String(box));
  const circle = document.createElementNS(SVG, "circle");
  for (const [name, value] of Object.entries({
    cx: "50", cy: "50", r: String(radius), fill: "none", stroke: ICE,
    "stroke-width": String(width), "stroke-dasharray": dash, opacity: String(opacity),
  })) circle.setAttribute(name, value);
  svg.appendChild(circle);
  holder.appendChild(svg);
  return { holder, circle };
}

type Exit = {
  cover: HTMLElement;
  /** Sign-in is on the screen under the cover. */
  ready: boolean;
  /** Its card, when it gave one. */
  card: HTMLElement | null;
  locked: boolean;
};

/* The one transition under way, so the sign-in page can find it. */
let active: Exit | null = null;

/**
 * Closes the landing page into Yumi's eye from `from` (the pressed key),
 * calls `navigate` once the screen is covered, and scans until sign-in
 * calls playLoginArrival. With reduced motion, or no Web Animations, it
 * navigates at once.
 */
export function playLoginExit(from: HTMLElement, navigate: () => void) {
  let gone = false;
  const go = () => {
    if (gone) return;
    gone = true;
    navigate();
  };
  if (reducedMotion() || typeof document.body.animate !== "function") {
    go();
    return;
  }
  document.querySelectorAll(`[${COVER}]`).forEach(node => node.remove());
  /* Inside the press, the one place a phone lets sound start. */
  unlockInterfaceSounds();
  const timers: number[] = [];
  const later = (ms: number, then: () => void) => {
    timers.push(window.setTimeout(then, ms));
  };

  const vw = innerWidth;
  const vh = innerHeight;
  const box = from.getBoundingClientRect();
  const x = box.left + box.width / 2;
  const y = box.top + box.height / 2;
  const cx = vw / 2;
  const cy = vh / 2;
  /* Her eye in the middle; at the key it is the size it was (56–96px). */
  const size = Math.round(Math.max(120, Math.min(184, Math.min(vw, vh) * 0.36)));
  const atKey = Math.min(96, Math.max(56, box.height * 1.4));
  const reach = (px: number, py: number) => Math.ceil(Math.hypot(Math.max(px, vw - px), Math.max(py, vh - py)));

  const cover = layer({ inset: "0", zIndex: "2000" }, true);
  cover.setAttribute(COVER, "");
  /* Everything that is night, wiped away top to foot on arrival: the
     curtain slides down while the night inside it slides up by as much, so
     the night stays put and only its top edge moves. Two transforms rather
     than a clip-path, so the wipe runs on the compositor even while sign-in
     is still rendering underneath. */
  const curtain = layer({ inset: "0", overflow: "hidden" });
  const night = layer({ inset: "0" });
  curtain.appendChild(night);

  // 1. The key, as a plain pill of its own colour, drawing in to a circle.
  const look = getComputedStyle(from);
  const pill = layer({
    left: `${box.left}px`,
    top: `${box.top}px`,
    width: `${box.width}px`,
    height: `${box.height}px`,
    borderRadius: `${box.height / 2}px`,
    backgroundColor: look.backgroundColor,
    backgroundImage: look.backgroundImage,
  });

  // 2. The dark, spreading from the key.
  const dark = layer({
    inset: "0",
    ...starry("radial-gradient(circle at 50% 46%, #17243b 0%, #070b12 64%)", 320, 10, 3),
    clipPath: `circle(${atKey * 0.22}px at ${x}px ${y}px)`,
    opacity: "0",
  });

  // Her eye, built for the middle, starting over the key.
  const glide = layer({ left: `${cx - size / 2}px`, top: `${cy - size / 2}px`, width: `${size}px`, height: `${size}px` });
  const eye = lens(size);
  Object.assign(eye.eye.style, { opacity: "0", transform: "scale(0.6)" });
  glide.appendChild(eye.eye);
  const fromKey = `translate(${x - cx}px, ${y - cy}px) scale(${(atKey / size).toFixed(3)})`;
  glide.style.transform = fromKey;

  // The HUD round her: two turning tick rings, the scan's arc, brackets, the line.
  const hudSize = Math.round(size * 1.9);
  const hud = layer({ left: `${cx - hudSize / 2}px`, top: `${cy - hudSize / 2}px`, width: `${hudSize}px`, height: `${hudSize}px`, opacity: "0" });
  const ticks = ring(hudSize, 37, 0.9, "0.5 1.9", 0.75);
  const arcs = ring(hudSize, 33, 0.45, "16 5 3 5", 0.55);
  /* The scan's sweep, a bright arc going round while she is read, and the
     whole ring, lit when she locks. Turned and faded, never redrawn: sign-in
     renders while she scans, and only the compositor is free then. */
  const sweep = ring(hudSize, 35, 0.8, `${(2 * Math.PI * 35 * 0.22).toFixed(1)} 999`, 1);
  sweep.circle.setAttribute("stroke-linecap", "round");
  sweep.holder.style.opacity = "0";
  const sealed = ring(hudSize, 35, 0.8, "none", 1);
  sealed.holder.style.opacity = "0";
  const frameSide = size * 1.46;
  const arm = Math.round(size * 0.2);
  const clamp = layer({ inset: "0" });
  const hudBrackets = CORNERS.map(corner => {
    const element = bracket(corner, arm, 1.5, FRAME_INK);
    const px = hudSize / 2 + (corner[1] === "l" ? -frameSide / 2 : frameSide / 2);
    const py = hudSize / 2 + (corner[0] === "t" ? -frameSide / 2 : frameSide / 2);
    placeBracket(element, corner, px, py, arm);
    clamp.appendChild(element);
    return { element, corner };
  });
  const line = layer({
    left: `${hudSize * 0.07}px`,
    right: `${hudSize * 0.07}px`,
    top: `${hudSize / 2 - size / 2 - 1}px`,
    height: "2px",
    background: "linear-gradient(90deg, rgba(184, 232, 229, 0), rgba(184, 232, 229, 0.9) 22%, #ffffff 50%, rgba(184, 232, 229, 0.9) 78%, rgba(184, 232, 229, 0))",
    boxShadow: "0 0 12px rgba(184, 232, 229, 0.75)",
    opacity: "0",
  });
  hud.append(ticks.holder, arcs.holder, sweep.holder, sealed.holder, clamp, line);

  // 3. Through the pupil: the night inside it, then its starlight.
  const space = layer({
    inset: "0",
    ...starry("radial-gradient(circle at 50% 50%, #0e1d33 0%, #060a12 55%, #020306 100%)", 260, 22, 11),
    clipPath: `circle(${size * 0.17}px at ${cx}px ${cy}px)`,
    opacity: "0",
  });
  /* The starlight, made now and kept dark, so nothing is built mid-flight. */
  const streaks = layer({ inset: "0", overflow: "hidden" });
  const length = reach(cx, cy);
  const starlight = Array.from({ length: STREAKS }, (_, i) => {
    const streak = layer({
      left: `${cx}px`,
      top: `${cy}px`,
      width: `${Math.round(length * (0.2 + Math.random() * 0.24))}px`,
      height: i % 3 === 0 ? "1.5px" : "1px",
      transformOrigin: "0 50%",
      background: "linear-gradient(90deg, rgba(184, 232, 229, 0), rgba(220, 244, 242, 0.95))",
      opacity: "0",
    });
    streaks.appendChild(streak);
    return { streak, angle: (360 / STREAKS) * i + Math.random() * 10 };
  });

  /* Her eye on its way home to the card's Yumi, and the frame that finds
     the card: made now too, out of sight, so they are ready to move. */
  /* They start where they will start, so arriving is transform and opacity
     alone. (Drawn at 1% to have them ready only moved the cost earlier, onto
     her glide: measured 2026-11-22.) */
  const HELD = "0";
  const back = layer({ left: `${cx - size / 2}px`, top: `${cy - size / 2}px`, width: `${size}px`, height: `${size}px`, opacity: HELD, transform: "scale(0.5)", willChange: "transform, opacity" }, true);
  back.appendChild(lens(size).eye);
  const FRAME_ARM = 22;
  const startScale = (arm / FRAME_ARM).toFixed(3);
  const frame = CORNERS.map(corner => {
    const element = bracket(corner, FRAME_ARM, 1.5, FRAME_INK, true);
    const sx = cx + (corner[1] === "l" ? -frameSide / 2 : frameSide / 2);
    const sy = cy + (corner[0] === "t" ? -frameSide / 2 : frameSide / 2);
    placeBracket(element, corner, sx, sy, FRAME_ARM);
    Object.assign(element.style, { opacity: HELD, transform: `scale(${startScale})`, willChange: "transform, opacity" });
    return { element, corner, sx, sy };
  });

  night.append(dark, glide, hud, space, streaks);
  cover.append(pill, curtain, back, ...frame.map(({ element }) => element));
  document.body.appendChild(cover);
  /* The key steps aside for its stand-in, or the stand-in drawing in over
     an identical key would not be seen to move. */
  const visibility = from.style.visibility;
  from.style.visibility = "hidden";

  const cleanUp = () => {
    timers.forEach(timer => window.clearTimeout(timer));
    if (cover.isConnected) cover.remove();
    if (active?.cover === cover) active = null;
  };

  // 1. The key draws in to her eye's width and gives way to it.
  run(pill, [
    { left: `${box.left}px`, width: `${box.width}px`, opacity: 1 },
    { left: `${x - box.height / 2}px`, width: `${box.height}px`, opacity: 1, offset: 0.8 },
    { left: `${x - box.height / 2}px`, width: `${box.height}px`, opacity: 0 },
  ], { duration: FORM_MS + 20, easing: EASE_OUT, fill: "forwards" });
  /* Her eye opens where the key was, whole before the key has gone. */
  run(eye.eye, [
    { opacity: 0, transform: "scale(0.6)" },
    { opacity: 1, transform: "scale(1)" },
  ], { duration: 130, delay: 60, easing: EASE_OUT, fill: "forwards" });
  run(glide, [
    { transform: fromKey },
    { transform: "translate(0px, 0px) scale(1)" },
  ], { duration: DRAW_IN_MS - 20, delay: FORM_MS, easing: EASE_IN_OUT, fill: "forwards" });

  // 2. The dark spreads from the key as the eye leaves it.
  run(dark, [
    { opacity: 1, clipPath: `circle(${atKey * 0.22}px at ${x}px ${y}px)` },
    { opacity: 1, clipPath: `circle(${reach(x, y)}px at ${x}px ${y}px)` },
  ], { duration: DRAW_IN_MS + 20, delay: FORM_MS - 80, easing: EASE_IN_OUT, fill: "forwards" });
  /* Covered: sign-in is asked for while she scans. */
  later(COVERED_AT, go);

  // The HUD comes up round her as she settles.
  later(HUD_AT, () => {
    run(hud, [{ opacity: 0 }, { opacity: 1 }], { duration: 160, easing: EASE_OUT, fill: "forwards" });
    hudBrackets.forEach(({ element, corner }) => {
      const out = size * 0.16;
      run(element, [
        { transform: `translate(${corner[1] === "l" ? -out : out}px, ${corner[0] === "t" ? -out : out}px)`, opacity: 0 },
        { transform: "translate(0px, 0px)", opacity: 1 },
      ], { duration: 200, easing: EASE_OUT, fill: "forwards" });
    });
    run(ticks.holder, [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }], { duration: 9000, iterations: Infinity });
    run(arcs.holder, [{ transform: "rotate(0deg)" }, { transform: "rotate(-360deg)" }], { duration: 6000, iterations: Infinity });
    run(sweep.holder, [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }], { duration: SCAN_PASS_MS * 2, iterations: Infinity });
  });

  // The scan: down, and up again while sign-in is on its way.
  let passes = 0;
  const scan = () => {
    if (!cover.isConnected) return;
    const down = passes % 2 === 0;
    const travel = size;
    const keyframes = down
      ? [{ transform: "translateY(0px)" }, { transform: `translateY(${travel}px)` }]
      : [{ transform: `translateY(${travel}px)` }, { transform: "translateY(0px)" }];
    run(line, [{ opacity: 0 }, { opacity: 1, offset: 0.12 }, { opacity: 1, offset: 0.88 }, { opacity: 0.6 }], { duration: SCAN_PASS_MS, fill: "forwards" });
    run(line, keyframes, { duration: SCAN_PASS_MS, easing: EASE_IN_OUT, fill: "forwards" });
    run(eye.band, [{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 1, offset: 0.85 }, { opacity: 0 }], { duration: SCAN_PASS_MS, fill: "forwards" });
    run(eye.band, keyframes, { duration: SCAN_PASS_MS, easing: EASE_IN_OUT, fill: "forwards" });
    if (passes === 0) {
      run(sweep.holder, [{ opacity: 0 }, { opacity: 1 }], { duration: 120, fill: "forwards" });
    }
    interfaceSounds.scan();
    passes += 1;
    later(SCAN_PASS_MS, () => {
      if (active?.cover === cover && active.ready) lock();
      else if (active?.cover === cover) scan();
    });
  };
  later(SCAN_AT, scan);

  // Lock: the brackets clamp, the arc closes, her iris lights, a click.
  const lock = () => {
    if (!active || active.locked) return;
    active.locked = true;
    /* The wipe's two layers, made ready a beat before they move. */
    curtain.style.willChange = "transform";
    night.style.willChange = "transform";
    run(clamp, [{ transform: "scale(1)" }, { transform: "scale(0.9)", offset: 0.5 }, { transform: "scale(0.96)" }], { duration: LOCK_MS + 40, easing: EASE_OUT, fill: "forwards" });
    run(sweep.holder, [{ opacity: 1 }, { opacity: 0 }], { duration: LOCK_MS, fill: "forwards" });
    run(sealed.holder, [{ opacity: 0 }, { opacity: 1, offset: 0.4 }, { opacity: 0.6, offset: 0.7 }, { opacity: 1 }], { duration: LOCK_MS + 60, fill: "forwards" });
    run(eye.glow, [{ opacity: 0 }, { opacity: 1 }, { opacity: 0.55 }], { duration: LOCK_MS + 60, easing: EASE_OUT, fill: "forwards" });
    run(eye.glint, [{ opacity: 1 }, { opacity: 0.4 }, { opacity: 1 }], { duration: LOCK_MS + 60 });
    interfaceSounds.lock();
    later(LOCK_MS, through);
  };

  // Through the pupil: its night fills the screen, starlight streaks out.
  const through = () => {
    run(space, [
      { opacity: 1, clipPath: `circle(${size * 0.17}px at ${cx}px ${cy}px)` },
      { opacity: 1, clipPath: `circle(${reach(cx, cy)}px at ${cx}px ${cy}px)` },
    ], { duration: THROUGH_MS, easing: EASE_IN_OUT, fill: "forwards" });
    /* She and her HUD come at the reader as they fall in: a scale added
       to where the glide left her, and a fade of their own. */
    for (const element of [glide, hud]) {
      run(element, [{ transform: "scale(1)" }, { transform: "scale(1.7)" }], { duration: THROUGH_MS, easing: EASE_IN_OUT, fill: "forwards", composite: "add" });
      run(element, [{ opacity: 1 }, { opacity: 0 }], { duration: THROUGH_MS, easing: EASE_IN_OUT, fill: "forwards" });
    }
    for (const { streak, angle } of starlight) {
      run(streak, [
        { transform: `rotate(${angle}deg) translateX(${size * 0.12}px) scaleX(0.08)`, opacity: 0 },
        { opacity: 0.95, offset: 0.3 },
        { transform: `rotate(${angle}deg) translateX(${length}px) scaleX(1)`, opacity: 0 },
      ], { duration: THROUGH_MS + 120, delay: Math.random() * 50, easing: "cubic-bezier(0.55, 0, 0.9, 0.4)", fill: "both" });
    }
    interfaceSounds.warp();
    later(THROUGH_MS, () => arrive(active?.cover === cover ? active.card : null));
  };

  // Out on the other side: the frame finds the card, the night is wiped away.
  const arrive = (card: HTMLElement | null) => {
    const target = card?.getBoundingClientRect();
    const margin = 8;
    const corners: Record<Corner, [number, number]> = target && target.width
      ? {
          tl: [target.left - margin, target.top - margin],
          tr: [target.right + margin, target.top - margin],
          bl: [target.left - margin, target.bottom + margin],
          br: [target.right + margin, target.bottom + margin],
        }
      : { tl: [cx - 150, cy - 180], tr: [cx + 150, cy - 180], bl: [cx - 150, cy + 180], br: [cx + 150, cy + 180] };
    frame.forEach(({ element, corner, sx, sy }) => {
      const [ex, ey] = corners[corner];
      run(element, [
        { transform: `translate(0px, 0px) scale(${startScale})`, opacity: 1 },
        { transform: `translate(${ex - sx}px, ${ey - sy}px) scale(1)`, opacity: 1 },
      ], { duration: FRAME_MS, easing: EASE_OUT, fill: "forwards" });
      const bottom = target && target.width ? target.bottom : cy + 180;
      run(element, [{ opacity: 1 }, { opacity: 0 }], {
        duration: 220,
        delay: WIPE_DELAY_MS + Math.min(1, Math.max(0, bottom / vh)) * WIPE_MS + 160,
        easing: EASE_OUT,
        fill: "forwards",
      });
    });
    later(FRAME_MS - 40, () => interfaceSounds.tap());

    /* Her eye goes home, into the card's own Yumi. */
    const pupils = card ? Array.from(card.querySelectorAll<Element>(".yumi-glance")) : [];
    const home = pupils.map(node => node.getBoundingClientRect()).find(rect => rect.width > 0);
    const tx = home ? home.left + home.width / 2 - cx : 0;
    const ty = home ? home.top + home.height / 2 - cy : 0;
    const ts = home ? Math.max(0.08, (home.width * 2.4) / size) : 0.2;
    run(back, [
      { opacity: 0, transform: "translate(0px, 0px) scale(0.5)" },
      { opacity: 1, transform: "translate(0px, 0px) scale(0.52)", offset: 0.08 },
      { opacity: 1, transform: `translate(${tx}px, ${ty}px) scale(${ts.toFixed(3)})`, offset: 0.82 },
      { opacity: 0, transform: `translate(${tx}px, ${ty}px) scale(${ts.toFixed(3)})` },
    ], { duration: FRAME_MS + WIPE_MS, easing: EASE_IN_OUT, fill: "forwards" });

    /* The scan line wipes the night away, and the card switches on as it passes. */
    const wipe = layer({
      left: "0",
      right: "0",
      top: "-1px",
      height: "2px",
      background: "linear-gradient(90deg, rgba(63, 183, 178, 0), #b8e8e5 20%, #ffffff 50%, #b8e8e5 80%, rgba(63, 183, 178, 0))",
      boxShadow: "0 0 16px rgba(184, 232, 229, 0.85), 0 0 2px rgba(7, 11, 18, 0.5)",
    });
    cover.appendChild(wipe);
    const wipeTiming: KeyframeAnimationOptions = { duration: WIPE_MS, delay: WIPE_DELAY_MS, easing: "linear", fill: "both" };
    run(curtain, [{ transform: "translateY(0px)" }, { transform: `translateY(${vh}px)` }], wipeTiming);
    run(night, [{ transform: "translateY(0px)" }, { transform: `translateY(${-vh}px)` }], wipeTiming);
    run(wipe, [
      { transform: "translateY(0px)", opacity: 1 },
      { transform: `translateY(${vh}px)`, opacity: 0.7 },
    ], { duration: WIPE_MS, delay: WIPE_DELAY_MS, easing: "linear", fill: "both" });
    if (card) {
      const top = target && target.width ? target.top : 0;
      card.style.opacity = "";
      run(card, SWITCH_ON, {
        duration: SWITCH_ON_MS,
        delay: WIPE_DELAY_MS + Math.min(1, Math.max(0, top / vh)) * WIPE_MS,
        easing: "linear",
        fill: "backwards",
      });
    }
    interfaceSounds.page();
    later(WIPE_DELAY_MS + WIPE_MS + SWITCH_ON_MS, () => {
      from.style.visibility = visibility;
      cleanUp();
    });
  };

  active = { cover, ready: false, card: null, locked: false };
  /* Sign-in never came: let go, and give the key back. */
  later(COVERED_AT + GIVE_UP_MS, () => {
    if (active?.cover === cover && active.ready) return;
    from.style.visibility = visibility;
    cleanUp();
  });
}

/**
 * Sign-in's half: tells the transition under way that the page is here, so
 * the scan locks and the card is assembled out of the frame. Hidden until
 * then. Does nothing on a sign-in page reached any other way.
 */
export function playLoginArrival(card?: HTMLElement | null) {
  if (!active || !active.cover.isConnected) {
    document.querySelectorAll(`[${COVER}]`).forEach(node => node.remove());
    active = null;
    return;
  }
  /* Kept out of sight until the scan line reaches it. */
  if (card) card.style.opacity = "0";
  active.ready = true;
  active.card = card ?? null;
}
