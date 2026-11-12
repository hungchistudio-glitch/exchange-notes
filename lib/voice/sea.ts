/* =========================================================
   The sea that listens (Chi, 2026-11-12)

   While the reader speaks (the voice search, the Pronunciation Lab's
   Speak), a translucent liquid wells up from the bottom of the screen and
   moves with the voice (Chi chose "液態海面", moved by "音量＋音高"):
   - the louder the voice, the higher the sea and the faster it moves;
   - the low voice raises long, slow swells;
   - consonants' hiss sets off fine, quick ripples on top of them;
   - in silence the surface only breathes.
   When the speaking ends the waves settle and a light runs along the
   surface while the words are understood; then the sea drains away.

   By day it is pearl turning to honey in its depth, with a pearly sheen on
   the crests; in Yumi Cosmic, aurora light in the dark, cyan at the
   surface deepening to violet, added to what is under it (Chi:
   "珍珠蜂蜜／極光青紫").

   Two layers, the one behind a little higher and fainter, so it has depth.
   One full-screen triangle strip and one fragment shader, drawn at a
   fraction of the screen's pixels: liquid is soft, and the crest line is
   antialiased in the shader.
   ========================================================= */

export const SEA_VERTEX = `
attribute vec2 aPosition;
varying vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

export const SEA_FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
varying vec2 vUv;
uniform vec2 uRes;
/* The canvas's width over a phone's, so a tablet gets more waves, not wider ones. */
uniform float uScale;
/* Phases integrated on the CPU, so a louder voice speeds the sea without a jump. */
uniform float uSlow;
uniform float uFast;
uniform float uTime;
/* 0 empty, 1 risen. */
uniform float uFill;
uniform float uLevel;
uniform float uLow;
uniform float uHigh;
/* 0 while listening, 1 while the words are being understood. */
uniform float uCalm;
uniform float uCosmic;
uniform vec3 uSurface;
uniform vec3 uBody;
uniform vec3 uDeep;
uniform vec3 uCrest;
uniform vec3 uSheenA;
uniform vec3 uSheenB;

/* Light under moving water: the fine, bright, ever-changing lines a
   swimming pool's floor shows, three folds of a warped sine field. */
float caustic(vec2 uv, float t) {
  vec2 p = mod(uv * 6.2831, 6.2831) - 250.0;
  vec2 i = p;
  float c = 1.0;
  for (int n = 0; n < 3; n++) {
    float tt = t * (1.0 - 3.5 / float(n + 1));
    i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
    c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / 0.006), p.y / (cos(i.y + tt) / 0.006)));
  }
  c /= 3.0;
  c = 1.17 - pow(c, 1.4);
  return clamp(pow(abs(c), 8.0), 0.0, 1.0);
}

/* The surface's height, 0 to 1 of the canvas, at x (phone widths). */
float surface(float x, float layer) {
  float awake = 1.0 - uCalm;
  float swell = (0.016 + 0.07 * uLow + 0.03 * uLevel) * (1.0 - 0.75 * uCalm);
  float ripple = (0.002 + 0.011 * uHigh + 0.003 * uLevel) * (1.0 - 0.85 * uCalm);
  float s = uSlow + layer * 1.9;
  float f = uFast + layer * 2.7;
  float h = swell * (0.62 * sin(x * 5.4 + s) + 0.38 * sin(x * 9.1 - s * 1.31 + 1.3))
          + ripple * (0.6 * sin(x * 23.0 + f) + 0.4 * sin(x * 41.0 - f * 1.37 + 0.7));
  float rise = 0.4 + 0.2 * uLevel * awake - 0.12 * uCalm;
  return mix(-0.14, rise + layer * 0.06, uFill) + h * uFill;
}

/* One layer, premultiplied. */
vec4 layerColour(vec2 p, float layer) {
  float h = surface(p.x, layer);
  float d = h - p.y;
  float aa = 1.6 / uRes.y;
  float inside = smoothstep(-aa, aa, d);
  float depth = clamp(d / max(h + 0.14, 0.2), 0.0, 1.0);

  vec3 colour = mix(uSurface, uBody, smoothstep(0.02, 0.4, depth));
  colour = mix(colour, uDeep, smoothstep(0.4, 1.0, depth));
  /* A pearl's sheen along the water, drifting. */
  float sheen = 0.5 + 0.5 * sin(p.x * 3.3 + uSlow * 0.35 + p.y * 4.0);
  colour = mix(colour, mix(uSheenA, uSheenB, sheen), 0.18 * (1.0 - depth));

  /* Light moving under the surface, brighter as the voice is louder. */
  float c = caustic(vec2(p.x * 0.55 + uSlow * 0.02, (p.y - h) * 0.9), uTime * 0.45 + uSlow * 0.15 + layer * 3.0);
  c *= (0.35 + 0.65 * uLevel) * (1.0 - 0.75 * depth) * smoothstep(0.0, 0.03, d);
  colour += uCrest * c * mix(0.55, 0.7, uCosmic);
  /* Just under the crest the water is a shade deeper, so its line reads on
     a pale page. */
  colour = mix(colour, uBody, 0.45 * exp(-max(d, 0.0) / 0.025) * (1.0 - uCosmic) * inside);

  /* The crest: a fine bright line on the surface, and while the words are
     understood a light running along it. */
  float crest = exp(-abs(d) / mix(0.0045 + 0.004 * uLevel, 0.003 + 0.002 * uLevel, uCosmic));
  float run = exp(-pow((fract(uTime * 0.32) * (uScale + 0.8) - 0.4 - p.x) / 0.16, 2.0)) * uCalm;
  /* A glow just above the surface, the light the liquid gives off. */
  float above = exp(-max(-d, 0.0) / 0.05) * (1.0 - inside);

  float back = layer > 0.5 ? 0.55 : 1.0;
  float bodyAlpha = inside * mix(mix(0.42, 0.82, depth), mix(0.26, 0.55, depth), uCosmic) * back;
  vec3 bodyLight = colour * mix(1.0, 1.3 * (1.0 - 0.5 * depth), uCosmic);
  vec4 result = vec4(bodyLight * bodyAlpha, bodyAlpha);
  float crestAlpha = crest * (0.75 + 0.6 * run) * back * mix(0.85, 0.5, uCosmic);
  result += vec4(uCrest * crestAlpha, crestAlpha * mix(1.0, 0.35, uCosmic));
  float glow = above * (0.12 + 0.16 * uLevel) * back * mix(0.6, 1.0, uCosmic);
  vec3 haze = mix(uBody, uSurface, uCosmic);
  result += vec4(haze * glow, glow * mix(1.0, 0.0, uCosmic));
  return result * uFill;
}

void main() {
  vec2 p = vec2(vUv.x * uScale, vUv.y);
  vec4 back = layerColour(p, 1.0);
  vec4 front = layerColour(p, 0.0);
  gl_FragColor = front + back * (1.0 - front.a);
}`;

type Rgb = readonly [number, number, number];
const hex = (value: number): Rgb => [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];

export type SeaPalette = { surface: Rgb; body: Rgb; deep: Rgb; crest: Rgb; sheenA: Rgb; sheenB: Rgb };

export const SEA_PALETTES: Record<"day" | "cosmic", SeaPalette> = {
  /* Pearl at the surface, cream, honey in the depth; the sheen a faint rose
     and a faint sky, as a pearl's is. */
  day: {
    surface: hex(0xfdf1d6), body: hex(0xf0cd8e), deep: hex(0xdc9d3f),
    crest: hex(0xfffdf7), sheenA: hex(0xf7d9dc), sheenB: hex(0xd9e8f2),
  },
  /* Aurora: cyan light at the surface deepening to violet, a fine ice-cyan crest. */
  cosmic: {
    surface: hex(0x9ff5ea), body: hex(0x5ee6d6), deep: hex(0x8e7cf0),
    crest: hex(0xbffaf2), sheenA: hex(0x7fd8ff), sheenB: hex(0xc3a8ff),
  },
};

/** How the sea moves between listening, understanding and gone. */
export const SEA = {
  /** Seconds to rise when listening starts. */
  riseS: 0.7,
  /** Seconds to drain away at the end. */
  drainS: 0.9,
  /** How much of the sea stays while the words are understood. */
  understandingFill: 0.8,
  /** The canvas's share of the screen's height, from the bottom. */
  height: 0.5,
} as const;

export type SeaPhase = "idle" | "listening" | "understanding";
