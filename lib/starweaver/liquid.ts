/* =========================================================
   Starweaver's liquid light (Chi, 2026-11-10: "答對時螢幕會有種液態流動
   時尚科技感的答對效果")

   A right letter sends a thin wave of iridescent ice light across the whole
   screen, from the key that was pressed up towards the star track; a word
   finished sends a wider, slower one as the gate opens. Chi chose: the
   whole screen, thin (全螢幕薄薄流過), ice-cyan with a little violet at its
   edge (冰青虹彩液光), quick for a letter and larger for the word (猜中輕快，
   完成較大).

   It never covers anything that matters: translucent, never white, gone in
   half a second (a letter) or a second (a word), and it takes no tap
   (components/starweaver/LiquidFlow.tsx draws it with pointer-events off).
   The page asks for a flow; the overlay plays it. Nothing here knows what
   was paid.
   ========================================================= */

export type LiquidKind = "letter" | "word" | "sweep";

export type LiquidFlowRequest = {
  kind: LiquidKind;
  /** Where it wells up, in viewport pixels: the key pressed, or the bottom middle. */
  from: { x: number; y: number };
  /** Where it flows: the stage. */
  to: { x: number; y: number };
};

export const LIQUID_EVENT = "starweaver:liquid";

/** How each kind plays: seconds, how strong, how wide its front. */
export const LIQUID = {
  letter: { seconds: 0.5, strength: 0.55, cosmicStrength: 0.45, width: 1 },
  word: { seconds: 1.0, strength: 0.7, cosmicStrength: 0.58, width: 1.7 },
  /* The arrival's: once, from the stage down over the page as she lands
     (Chi, 2026-11-11: "從上往下輕掃一次"), carrying the keys in. */
  sweep: { seconds: 0.9, strength: 0.5, cosmicStrength: 0.45, width: 1.4 },
} as const;

const centre = (rect: DOMRect) => ({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });

/**
 * Asks the overlay for a flow. `from` is the key's rectangle when a key was
 * tapped; a guess typed on a keyboard wells up from the bottom middle.
 */
export function flowLiquid(kind: LiquidKind, from: DOMRect | null) {
  if (typeof window === "undefined") return;
  const stage = document.querySelector<HTMLElement>('[role="img"][data-game="starweaver"]');
  const request: LiquidFlowRequest = {
    kind,
    from: from ? centre(from) : { x: window.innerWidth / 2, y: window.innerHeight * 0.85 },
    to: stage ? centre(stage.getBoundingClientRect()) : { x: window.innerWidth / 2, y: window.innerHeight * 0.25 },
  };
  window.dispatchEvent(new CustomEvent<LiquidFlowRequest>(LIQUID_EVENT, { detail: request }));
}

/** The arrival's sweep: from the top of the stage, down the page. */
export function sweepLiquid() {
  if (typeof window === "undefined") return;
  const stage = document.querySelector<HTMLElement>('[role="img"][data-game="starweaver"]');
  const rect = stage?.getBoundingClientRect();
  const request: LiquidFlowRequest = {
    kind: "sweep",
    from: rect ? { x: rect.left + rect.width / 2, y: rect.top } : { x: window.innerWidth / 2, y: 0 },
    to: { x: window.innerWidth / 2, y: window.innerHeight },
  };
  window.dispatchEvent(new CustomEvent<LiquidFlowRequest>(LIQUID_EVENT, { detail: request }));
}

export const VERTEX = `
attribute vec2 aPosition;
varying vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

/*
 * A front that wells up from `from` and spreads over the screen while its
 * middle drifts towards `to`, its edge warped by flowing noise so it reads
 * as liquid, not a ring. Ice cyan, iridescent at the front, a touch of
 * violet; premultiplied, and never brighter than the page beneath it would
 * allow to turn white.
 */
export const FRAGMENT = `
precision mediump float;
uniform vec2 uRes;
uniform vec2 uFrom;
uniform vec2 uTo;
uniform float uT;
uniform float uSeed;
uniform float uStrength;
uniform float uWidth;
varying vec2 vUv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.02; a *= 0.5; }
  return v;
}

void main() {
  vec2 px = vUv * uRes;
  float diag = length(uRes);
  vec2 c = mix(uFrom, uTo, smoothstep(0.0, 1.0, uT) * 0.55);
  float dist = length(px - c) / diag;
  vec2 q = px / diag * 4.5;
  float w = fbm(q + vec2(uT * 1.6 + uSeed, -uT * 1.2));
  float w2 = fbm(q * 1.7 - vec2(uSeed, uT * 2.0));
  float radius = mix(0.02, 1.15, 1.0 - pow(1.0 - uT, 2.2));
  /* Thin: a sheet of liquid light, not a flood. */
  float band = uWidth * (0.05 + 0.045 * w);
  float edge = dist + (w - 0.5) * 0.1 + (w2 - 0.5) * 0.04;
  float front = smoothstep(radius - band, radius, edge) * (1.0 - smoothstep(radius, radius + band * 0.3, edge));
  /* Its crest: one fine bright line along the leading edge. */
  float crest = smoothstep(radius - 0.012, radius - 0.002, edge) * (1.0 - smoothstep(radius - 0.002, radius + 0.004, edge));
  float sheen = (1.0 - smoothstep(0.0, radius, edge)) * 0.06 * (1.0 - uT);
  float fade = 1.0 - smoothstep(0.62, 1.0, uT);
  /* Ice cyan, deepening to aqua and turning lavender where the liquid
     thins: iridescent within that range only, never a rainbow. */
  vec3 ice = vec3(0.486, 0.769, 0.82);
  vec3 aqua = vec3(0.31, 0.66, 0.76);
  vec3 lavender = vec3(0.68, 0.62, 0.98);
  vec3 pale = vec3(0.86, 0.95, 0.97);
  float shift = 0.5 + 0.5 * sin(edge * 22.0 + w * 6.0 + uT * 3.0);
  vec3 col = mix(aqua, ice, shift);
  col = mix(col, lavender, 0.45 * smoothstep(0.45, 1.0, w2) * front);
  col = mix(col, pale, crest * 0.8);
  float a = clamp((front * 0.85 + crest * 0.9 + sheen) * uStrength * fade, 0.0, 0.42);
  gl_FragColor = vec4(col * a, a);
}`;
