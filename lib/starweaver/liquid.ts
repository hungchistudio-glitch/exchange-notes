import type { HangyumiGame } from "@/lib/hangyumi/rules";

/* =========================================================
   The games' liquid light (Chi, 2026-11-10: "答對時螢幕會有種液態流動
   時尚科技感的答對效果"; 2026-11-11: slower so it reads as more real, and
   in all three games, for a right guess and a wrong one)

   A right letter sends a sheet of liquid light across the whole screen,
   from the key that was pressed up towards the game's stage; a word
   finished sends a wider one. It has a body now: a raised, rippled front
   that catches the light along its crest and on its slopes, and a thin wet
   film behind it that drains away slowly. Chi chose: the whole screen,
   thin (全螢幕薄薄流過); quick for a letter and larger for the word (猜中
   輕快，完成較大), then a little slower so it can look real (letter 0.7 s,
   word 1.4 s); each game in its own colours (各遊戲自己的配色): Hangyumi
   warm honey gold, Wordvault gold and bronze, Starweaver ice cyan with a
   little violet (冰青虹彩液光).

   Each game also comes in on it: one sweep from the stage down the page,
   in its own colours, as the clue and the keys are laid out.

   A wrong guess, in every game: a thin dark-red liquid surges in from the
   edges of the screen and recedes, shorter than a right one (Chi: 暗紅液光
   從邊緣湧入又退去).

   It never covers anything that matters: translucent, never white, and it
   takes no tap (components/starweaver/LiquidFlow.tsx draws it with
   pointer-events off). The page asks for a flow; the overlay plays it.
   Nothing here knows what was paid.
   ========================================================= */

export type LiquidKind = "letter" | "word" | "sweep" | "miss";

export type LiquidFlowRequest = {
  kind: LiquidKind;
  /** Whose colours. */
  game: HangyumiGame;
  /** Where it wells up, in viewport pixels: the key pressed, or the bottom middle. */
  from: { x: number; y: number };
  /** Where it flows: the stage. */
  to: { x: number; y: number };
};

export const LIQUID_EVENT = "starweaver:liquid";

/** How each kind plays: seconds, how strong, how wide its front. */
export const LIQUID = {
  letter: { seconds: 0.7, strength: 0.6, cosmicStrength: 0.5, width: 1 },
  word: { seconds: 1.4, strength: 0.74, cosmicStrength: 0.62, width: 1.7 },
  /* The way in: once, from the stage down over the page as the stage is
     ready (Chi, 2026-11-11: "從上往下輕掃一次"), carrying the keys in. In
     every game since (Chi, 2026-11-11): as Starweaver's Yumi lands out of
     the gate, as Wordvault's lands on the path, and as Hangyumi's first
     line comes to rest. */
  sweep: { seconds: 1.1, strength: 0.5, cosmicStrength: 0.45, width: 1.4 },
  /* In from the edges and out again: shorter than any right guess. */
  miss: { seconds: 0.6, strength: 0.9, cosmicStrength: 0.72, width: 1 },
} as const;

type Rgb = readonly [number, number, number];
/** A liquid's four colours: its depth, its body, the tint where it thins, its crest. */
export type LiquidPalette = { deep: Rgb; body: Rgb; tint: Rgb; crest: Rgb };

const hex = (value: number): Rgb => [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];

export const PALETTES: Record<HangyumiGame | "miss", LiquidPalette> = {
  /* Honey held up to the light: amber in its depth, rose gold where it thins. */
  hangyumi: { deep: hex(0xb8741f), body: hex(0xe9b65c), tint: hex(0xeea08a), crest: hex(0xfff1d2) },
  /* The vault's emerald (Chi, 2026-11-12: its old gold read as Hangyumi's
     honey): deep green in its depth, jade in its body, pale gold where it
     thins, the chest's brass catching the light, and a mint-white crest.
     Never red, which is a wrong guess's in every game. */
  wordvault: { deep: hex(0x0f5a46), body: hex(0x2fa37c), tint: hex(0xd9c27a), crest: hex(0xe6fff4) },
  /* Ice cyan, deepening to aqua and turning lavender where the liquid thins. */
  starweaver: { deep: hex(0x4fa8c2), body: hex(0x7cc4d1), tint: hex(0xad9efa), crest: hex(0xdbf2f7) },
  /* A wrong guess, in any game: dark red, amber where it thins. */
  miss: { deep: hex(0x6e0f12), body: hex(0x9e1e1a), tint: hex(0xc4621f), crest: hex(0xd9774a) },
};

export const paletteFor = (request: Pick<LiquidFlowRequest, "kind" | "game">) =>
  PALETTES[request.kind === "miss" ? "miss" : request.game];

const centre = (rect: DOMRect) => ({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
/* Each game's stage says it is the one the light flows to. */
const stageRect = () => document.querySelector<HTMLElement>("[data-liquid-stage]")?.getBoundingClientRect() ?? null;

function send(request: LiquidFlowRequest) {
  window.dispatchEvent(new CustomEvent<LiquidFlowRequest>(LIQUID_EVENT, { detail: request }));
}

/**
 * Asks the overlay for a flow. `from` is the key's rectangle when a key was
 * tapped; a guess typed on a keyboard wells up from the bottom middle.
 */
export function flowLiquid(kind: Exclude<LiquidKind, "sweep">, from: DOMRect | null, game: HangyumiGame = "starweaver") {
  if (typeof window === "undefined") return;
  const stage = stageRect();
  send({
    kind,
    game,
    from: from ? centre(from) : { x: window.innerWidth / 2, y: window.innerHeight * 0.85 },
    to: stage ? centre(stage) : { x: window.innerWidth / 2, y: window.innerHeight * 0.25 },
  });
}

/** A game's way in: from the top of its stage, down the page, in its colours. */
export function sweepLiquid(game: HangyumiGame = "starweaver") {
  if (typeof window === "undefined") return;
  const rect = stageRect();
  send({
    kind: "sweep",
    game,
    from: rect ? { x: rect.left + rect.width / 2, y: rect.top } : { x: window.innerWidth / 2, y: 0 },
    to: { x: window.innerWidth / 2, y: window.innerHeight },
  });
}

export const VERTEX = `
attribute vec2 aPosition;
varying vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

/*
 * A liquid with a body. `edge` measures how far a pixel is from where the
 * liquid starts (the key, or for a miss the screen's own edge), warped by
 * flowing noise so the front reads as liquid, not a ring; the front sits at
 * `r` and moves on. Its height is a raised ridge just behind the front and a
 * thin film behind that, which drains away in streaks. The surface's slope
 * comes from that profile, so the light catches the crest and the slopes as
 * on real liquid: a specular glint, a brighter rim where it is steep, fine
 * caustic veins inside. Premultiplied, never brighter than the page would
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
uniform float uMiss;
uniform vec3 uDeep;
uniform vec3 uBody;
uniform vec3 uTint;
uniform vec3 uCrest;
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

/* Height across the front: a ridge just behind it, a film further back. */
float profile(float e, float r, float band, float film) {
  float inside = 1.0 - smoothstep(r - 0.003, r + band * 0.22, e);
  float ridge = smoothstep(r - band, r - band * 0.12, e) * inside;
  return max(ridge, inside * film);
}

void main() {
  vec2 px = vUv * uRes;
  float diag = length(uRes);
  vec2 q = px / diag * 4.5;
  float w = fbm(q + vec2(uT * 1.1 + uSeed, -uT * 0.8));
  float w2 = fbm(q * 1.7 - vec2(uSeed, uT * 1.4));
  float band = uWidth * (0.06 + 0.05 * w);

  /* Where it starts from, and which way is "on". */
  vec2 c = mix(uFrom, uTo, smoothstep(0.0, 1.0, uT) * 0.55);
  vec2 away = normalize(px - c + vec2(0.0001));
  float fromKey = length(px - c) / diag;
  vec2 toEdge = vec2(min(px.x, uRes.x - px.x), min(px.y, uRes.y - px.y));
  float fromEdge = min(toEdge.x, toEdge.y) / diag;
  vec2 inward = toEdge.x < toEdge.y ? vec2(px.x < uRes.x * 0.5 ? 1.0 : -1.0, 0.0) : vec2(0.0, px.y < uRes.y * 0.5 ? 1.0 : -1.0);

  float e = mix(fromKey, fromEdge, uMiss) + (w - 0.5) * mix(0.1, 0.05, uMiss) + (w2 - 0.5) * 0.04;
  vec2 dir = mix(away, inward, uMiss);
  /* A flow crosses the screen over most of its time; a miss surges in a
     little way and goes back. */
  float spread = 0.02 + pow(clamp(uT / 0.9, 0.0, 1.0), 0.9);
  float surge = 0.055 * pow(sin(3.14159 * uT), 0.7);
  float r = mix(spread, surge, uMiss);
  band = mix(band, 0.028 + 0.012 * w, uMiss);

  /* Behind a flow, a thin wet film that drains away in streaks, only just
     behind the front; a miss is a sheet, deepest at the screen's edge. */
  float streak = noise(vec2(q.x * 7.0 + uSeed, q.y * 1.4 + uT * 1.6));
  float behind = max(0.0, r - e);
  float film = 0.22 * (0.5 + 0.5 * streak) * exp(-behind * 5.0) * (1.0 - smoothstep(0.55, 1.0, uT));
  float depth = 1.0 - clamp(e / max(r, 0.001), 0.0, 1.0);
  film = mix(film, 0.35 + 0.65 * depth, uMiss);
  float h = profile(e, r, band, film);
  float slope = (profile(e + 0.004, r, band, film) - profile(e - 0.004, r, band, film)) / 0.008;

  /* Its surface: steep at the front, rippled by the same flowing noise. */
  vec2 ripple = vec2(w - 0.5, w2 - 0.5) * 0.6;
  vec3 n = normalize(vec3(-(dir * slope * 0.06 + ripple * h), 1.0));
  vec3 light = normalize(vec3(-0.45, 0.62, 0.64));
  float glint = pow(max(dot(reflect(-light, n), vec3(0.0, 0.0, 1.0)), 0.0), 36.0);
  float rim = clamp(1.0 - n.z, 0.0, 1.0) * 4.0;
  float shade = 0.75 + 0.35 * dot(n, light);

  /* Fine bright veins where the light focuses through it. */
  float vein = pow(1.0 - abs(noise(q * 3.2 + vec2(w * 2.0, uT * 0.9)) * 2.0 - 1.0), 7.0) * h;
  float crest = smoothstep(r - 0.012, r - 0.002, e) * (1.0 - smoothstep(r - 0.002, r + 0.004, e));

  float shift = 0.5 + 0.5 * sin(e * 22.0 + w * 6.0 + uT * 2.0);
  vec3 col = mix(uDeep, uBody, clamp(h * 1.2 * shift + 0.25, 0.0, 1.0)) * shade;
  col = mix(col, uTint, 0.45 * smoothstep(0.45, 1.0, w2) * (1.0 - h) * step(0.001, h));
  /* A miss is darkest where it is deepest, at the screen's edge. */
  col = mix(col, uDeep * shade, uMiss * depth * 0.8);
  col = mix(col, uCrest, clamp(crest * mix(0.8, 0.35, uMiss) + glint * mix(0.9, 0.5, uMiss) + vein * 0.35 + rim * 0.25, 0.0, 1.0));

  float fade = mix(1.0 - smoothstep(0.75, 1.0, uT), 1.0, uMiss);
  float a = (h * 0.72 + crest * 0.85 + glint * 0.5 + vein * 0.2) * uStrength * fade;
  a = clamp(a, 0.0, mix(0.44, 0.68, uMiss));
  gl_FragColor = vec4(col * a, a);
}`;
