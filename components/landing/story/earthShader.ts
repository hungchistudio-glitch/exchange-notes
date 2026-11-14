import type { Blob, EarthFrame } from "./earthPainter";

/* =========================================================
   The one Earth, as one fragment shader

   The same picture as earthPainter.ts's canvas drawing, worked out for
   every pixel on the GPU in a single draw. Drawn with the 2D canvas, a
   frame was a hundred path fills and strokes, and on a Mac's integrated
   GPU the descent fell to 25–45 frames a second (measured 2026-11-13,
   1280×800 at 2×, against 55–60 for the old CSS planet). Here the
   coastlines, clouds and city lights are functions of the pixel's place on
   the globe, so they are as sharp at the horizon as far off, and a pixel
   nowhere near the planet returns at once.

   WebGL 1 and nothing optional, so it runs wherever the film's own Yumi
   does; where it cannot start, the 2D painter draws instead.
   ========================================================= */

const MAX_LAND = 16;
const MAX_CLOUDS = 8;

const VERTEX = `
attribute vec2 aCorner;
void main() { gl_Position = vec4(aCorner, 0.0, 1.0); }
`;

const FRAGMENT = `
precision highp float;

uniform vec2 uCanvas;      // canvas, device pixels
uniform float uRatio;      // device pixels per CSS pixel
uniform vec2 uScreen;      // screen, CSS pixels
uniform mat3 uToPlanet;    // CSS pixels -> the planet's box
uniform float uSize;       // the planet's box, its side
uniform float uPixel;      // one device pixel, in the planet's box
uniform float uOpacity;
uniform float uFlare;
uniform float uAir;
uniform float uLandTurn;   // 0..1 of a turn
uniform float uCloudTurn;
uniform float uGlowReach;  // the air's glow, in the planet's box

uniform vec4 uLand[${MAX_LAND}];      // x, y, rx, ry (percent of a turn)
uniform vec4 uLandTone[${MAX_LAND}];  // rgb, and 1 for ice
uniform vec3 uLandPhase[${MAX_LAND}];
uniform int uLandCount;
uniform vec4 uCloud[${MAX_CLOUDS}];
uniform vec4 uCloudTone[${MAX_CLOUDS}]; // rgb, alpha
uniform vec3 uCloudPhase[${MAX_CLOUDS}];
uniform int uCloudCount;

const float PI = 3.14159265;

/* "Over", for premultiplied colour. */
vec4 over(vec4 below, vec3 colour, float alpha) {
  return vec4(colour * alpha + below.rgb * (1.0 - alpha), alpha + below.a * (1.0 - alpha));
}

float ramp(float x, float a, float b) { return clamp((x - a) / (b - a), 0.0, 1.0); }

/* The shade, as the CSS drew it: 0 lit, 0.96 at the far side. */
float darkness(vec2 p) {
  float t = distance(p, vec2(0.28, 0.24) * uSize) / (1.0469 * uSize);
  if (t < 0.34) return 0.0;
  if (t < 0.58) return mix(0.0, 0.42, ramp(t, 0.34, 0.58));
  if (t < 0.82) return mix(0.42, 0.9, ramp(t, 0.58, 0.82));
  return mix(0.9, 0.96, ramp(t, 0.82, 1.0));
}

vec3 seaAt(vec2 p) {
  float t = distance(p, vec2(0.34, 0.30) * uSize) / (0.962 * uSize);
  vec3 c0 = vec3(0.561, 0.816, 0.949);
  vec3 c1 = vec3(0.231, 0.561, 0.8);
  vec3 c2 = vec3(0.11, 0.365, 0.596);
  vec3 c3 = vec3(0.059, 0.227, 0.4);
  vec3 c4 = vec3(0.039, 0.153, 0.278);
  if (t < 0.26) return mix(c0, c1, ramp(t, 0.0, 0.26));
  if (t < 0.52) return mix(c1, c2, ramp(t, 0.26, 0.52));
  if (t < 0.76) return mix(c2, c3, ramp(t, 0.52, 0.76));
  return mix(c3, c4, ramp(t, 0.76, 1.0));
}

/* A blob's coast: negative inside, in units of its own half-axes. */
float coast(vec2 map, vec4 blob, vec3 phase, float turn, out float reach) {
  float dx = mod(map.x - blob.x - turn + 50.0, 100.0) - 50.0;
  vec2 d = vec2(dx / blob.z, (map.y - blob.y) / blob.w);
  reach = length(d);
  if (reach > 1.45) return 1.0;
  float a = atan(d.y, d.x);
  float wander = 1.0 + 0.16 * sin(3.0 * a + phase.x) + 0.09 * sin(5.0 * a + phase.y) + 0.05 * sin(9.0 * a + phase.z);
  return reach - wander;
}

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

void main() {
  vec2 css = vec2(gl_FragCoord.x, uCanvas.y - gl_FragCoord.y) / uRatio;
  vec2 p = (uToPlanet * vec3(css, 1.0)).xy;
  float R = 0.5 * uSize;
  vec2 c = vec2(R);
  float d = distance(p, c) / R;
  float air = 1.1;
  float glowEnd = air + uGlowReach / R;

  vec4 colour = vec4(0.0);

  // The air's glow round it.
  if (d > air && d < glowEnd) {
    float g = (d - air) / (glowEnd - air);
    colour = over(colour, vec3(0.31, 0.69, 1.0), 0.11 * exp(-6.0 * g) * (1.0 - g));
  }

  // The globe.
  float aa = uPixel / R;
  if (d < 1.0 + aa) {
    vec3 ground = seaAt(p);
    vec2 q = (p - c) / R;
    float halfWidth = sqrt(max(1e-4, 1.0 - q.y * q.y));
    float across = acos(clamp(-q.x / halfWidth, -1.0, 1.0)) / PI;   // 0..1 over the face
    vec2 map = vec2(across * 100.0, p.y / uSize * 100.0);
    /* How many map percent one device pixel spans here (wider at the limb). */
    float spread = (uPixel / uSize * 100.0) / max(0.08, sqrt(max(0.0, 1.0 - (q.x / halfWidth) * (q.x / halfWidth)))) / halfWidth;

    // Land, its shallows and its coast.
    float onLand = 0.0;
    for (int i = 0; i < ${MAX_LAND}; i++) {
      if (i >= uLandCount) break;
      float reach;
      float sd = coast(map, uLand[i], uLandPhase[i], uLandTurn * 100.0, reach);
      if (sd > 0.2) continue;
      float edge = spread / min(uLand[i].z, uLand[i].w);
      float shallow = (1.0 - smoothstep(0.0, 0.14, sd)) * step(0.0, sd);
      ground = mix(ground, vec3(0.62, 0.89, 0.94), 0.22 * shallow);
      float inside = 1.0 - smoothstep(-edge, edge, sd);
      vec3 tone = uLandTone[i].rgb;
      vec3 inland = uLandTone[i].a > 0.5 ? vec3(1.0) : vec3(0.663, 0.761, 0.486);
      vec3 landColour = mix(inland, tone, clamp(reach / 1.2, 0.0, 1.0));
      ground = mix(ground, landColour, 0.74 * inside);
      float line = 1.0 - smoothstep(0.0, edge * 1.6, abs(sd));
      ground = mix(ground, vec3(0.07, 0.18, 0.125), 0.28 * line);
      onLand = max(onLand, inside * (1.0 - uLandTone[i].a));
    }

    // Clouds, turning faster than the land.
    for (int i = 0; i < ${MAX_CLOUDS}; i++) {
      if (i >= uCloudCount) break;
      float reach;
      float sd = coast(map, uCloud[i], uCloudPhase[i], uCloudTurn * 100.0, reach);
      if (sd > 0.1) continue;
      float body = 1.0 - smoothstep(-0.35, 0.08, sd);
      float soft = 1.0 - smoothstep(0.55, 1.1, reach);
      ground = mix(ground, uCloudTone[i].rgb, uCloudTone[i].a * 0.72 * body * max(soft, 0.35));
    }

    // Night, and its cities.
    float dark = darkness(p);
    ground = mix(ground, vec3(0.008, 0.02, 0.047), dark);
    float night = clamp((dark - 0.5) / 0.4, 0.0, 1.0);
    if (night > 0.0 && onLand > 0.5) {
      vec2 grid = map * 2.4;
      vec2 cell = floor(grid);
      vec2 spot = cell + 0.25 + 0.5 * vec2(hash(cell), hash(cell + 7.0));
      float lit = step(0.72, hash(cell + 3.0));
      float size = clamp(spread * 2.4 * 1.6, 0.05, 0.16);
      float glow = 1.0 - smoothstep(size * 0.35, size, distance(grid, spot));
      ground += vec3(1.0, 0.835, 0.54) * glow * lit * night * 0.8;
    }

    float disc = 1.0 - smoothstep(1.0 - aa, 1.0 + aa, d);
    colour = over(colour, ground, disc);
  }

  // Its rim of air.
  float ringT = distance(p, c) / (0.55 * uSize);
  if (ringT > 0.89 && ringT < 1.0) {
    float a = ringT < 0.93 ? mix(0.0, 0.55, ramp(ringT, 0.89, 0.93))
      : ringT < 0.97 ? mix(0.55, 0.14, ramp(ringT, 0.93, 0.97))
      : mix(0.14, 0.0, ramp(ringT, 0.97, 1.0));
    colour = over(colour, vec3(0.549, 0.824, 1.0), a);
  }

  // Sunrise along the rim.
  if (uAir > 0.001 && d > 0.978 && d < 1.045) {
    vec2 sun = c + normalize(vec2(0.28, 0.24) * uSize - c) * R;
    float t = distance(p, sun) / (0.95 * R);
    float a = t < 0.3 ? mix(0.7, 0.26, t / 0.3) : mix(0.26, 0.0, ramp(t, 0.3, 1.0));
    colour.rgb += vec3(1.0, 0.89, 0.72) * a * uAir * 0.8;
    colour.a = clamp(colour.a + a * uAir * 0.4, 0.0, 1.0);
  }

  // The flare: a glint on the rim, and the lens's long streak.
  if (uFlare > 0.001) {
    float t = distance(p, vec2(0.17, 0.19) * uSize) / (0.23 * uSize);
    if (t < 1.0) {
      vec3 g = t < 0.18 ? mix(vec3(1.0), vec3(1.0, 0.894, 0.706), ramp(t, 0.06, 0.18)) : vec3(1.0, 0.788, 0.42);
      float a = t < 0.06 ? 0.95 : t < 0.18 ? mix(0.95, 0.6, ramp(t, 0.06, 0.18)) : t < 0.48 ? mix(0.6, 0.18, ramp(t, 0.18, 0.48)) : mix(0.18, 0.0, ramp(t, 0.48, 1.0));
      colour = over(colour, g, a * uFlare);
    }
    float top = 0.184 * uSize;
    float height = max(0.012 * uSize, 2.0 * uPixel * uRatio);
    if (p.y > top && p.y < top + height) {
      float x = (p.x + 1.43 * uSize) / (3.2 * uSize);
      if (x > 0.0 && x < 1.0) {
        float a = x < 0.28 ? mix(0.0, 0.12, x / 0.28) : x < 0.5 ? mix(0.12, 0.75, ramp(x, 0.28, 0.5)) : x < 0.72 ? mix(0.75, 0.12, ramp(x, 0.5, 0.72)) : mix(0.12, 0.0, ramp(x, 0.72, 1.0));
        vec3 s = x > 0.28 && x < 0.72 ? vec3(0.839, 0.933, 1.0) : vec3(0.624, 0.863, 1.0);
        colour = over(colour, s, a * uFlare);
      }
    }
  }

  colour *= uOpacity;

  // The air coming up over the whole frame.
  if (uAir > 0.001) {
    float a = 0.2 * ramp(css.y, 0.35 * uScreen.y, uScreen.y) * uAir * uOpacity;
    colour = over(colour, vec3(0.588, 0.839, 1.0), a);
  }

  gl_FragColor = colour;
}
`;

function hexToRgb(hex: string): [number, number, number] {
  const value = parseInt(hex.slice(1), 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}

function rgba(text: string): [number, number, number, number] {
  const match = text.match(/rgba?\(([^)]+)\)/);
  if (!match) return [...hexToRgb(text), 1];
  const [r, g, b, a = "1"] = match[1].split(",").map(part => part.trim());
  return [Number(r) / 255, Number(g) / 255, Number(b) / 255, Number(a)];
}

/** The same fixed phases the 2D painter's coastlines use. */
function phasesFor(index: number): [number, number, number] {
  let state = index * 9301 + 49297;
  const next = () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };
  return [next() * Math.PI * 2, next() * Math.PI * 2, next() * Math.PI * 2];
}

export function createEarthShader(canvas: HTMLCanvasElement, land: Blob[], clouds: Blob[]) {
  const gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
  if (!gl) return null;

  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn("[earth] shader", gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  };
  const vertex = compile(gl.VERTEX_SHADER, VERTEX);
  const fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.warn("[earth] link", gl.getProgramInfoLog(program));
    return null;
  }
  gl.useProgram(program);

  const corners = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, corners);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const corner = gl.getAttribLocation(program, "aCorner");
  gl.enableVertexAttribArray(corner);
  gl.vertexAttribPointer(corner, 2, gl.FLOAT, false, 0, 0);

  const at = (name: string) => gl.getUniformLocation(program, name);
  const u = {
    canvas: at("uCanvas"), ratio: at("uRatio"), screen: at("uScreen"), toPlanet: at("uToPlanet"),
    size: at("uSize"), pixel: at("uPixel"), opacity: at("uOpacity"), flare: at("uFlare"), air: at("uAir"),
    landTurn: at("uLandTurn"), cloudTurn: at("uCloudTurn"), glowReach: at("uGlowReach"),
  };

  // The world, set once.
  const landCount = Math.min(MAX_LAND, land.length);
  const cloudCount = Math.min(MAX_CLOUDS, clouds.length);
  gl.uniform4fv(at("uLand"), land.slice(0, landCount).flatMap(([x, y, rx, ry]) => [x, y, rx, ry]));
  gl.uniform4fv(at("uLandTone"), land.slice(0, landCount).flatMap(([, , , , tone]) => [...hexToRgb(tone), tone === "#e9f1f4" ? 1 : 0]));
  gl.uniform3fv(at("uLandPhase"), land.slice(0, landCount).flatMap((_, index) => phasesFor(index + 7)));
  gl.uniform1i(at("uLandCount"), landCount);
  gl.uniform4fv(at("uCloud"), clouds.slice(0, cloudCount).flatMap(([x, y, rx, ry]) => [x, y, rx, ry]));
  gl.uniform4fv(at("uCloudTone"), clouds.slice(0, cloudCount).flatMap(([, , , , tone]) => rgba(tone)));
  gl.uniform3fv(at("uCloudPhase"), clouds.slice(0, cloudCount).flatMap((_, index) => phasesFor(index + 47)));
  gl.uniform1i(at("uCloudCount"), cloudCount);

  let pixelRatio = 1;
  let cleared = true;

  function resize(width: number, height: number, ratio: number) {
    pixelRatio = ratio;
    const w = Math.max(1, Math.round(width * ratio));
    const h = Math.max(1, Math.round(height * ratio));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl!.viewport(0, 0, w, h);
    cleared = false;
    clear();
  }

  function clear() {
    if (cleared) return;
    gl!.clearColor(0, 0, 0, 0);
    gl!.clear(gl!.COLOR_BUFFER_BIT);
    cleared = true;
  }

  function draw(frame: EarthFrame) {
    const opacity = Math.max(0, Math.min(1, frame.opacity));
    if (opacity < 0.002 || frame.size <= 0) {
      clear();
      return;
    }
    cleared = false;
    const inverse = frame.matrix.inverse();
    const scale = Math.hypot(frame.matrix.a, frame.matrix.b) || 1;
    gl!.uniform2f(u.canvas, canvas.width, canvas.height);
    gl!.uniform1f(u.ratio, pixelRatio);
    gl!.uniform2f(u.screen, frame.width, frame.height);
    // Column-major: CSS pixels to the planet's box.
    gl!.uniformMatrix3fv(u.toPlanet, false, [inverse.a, inverse.b, 0, inverse.c, inverse.d, 0, inverse.e, inverse.f, 1]);
    gl!.uniform1f(u.size, frame.size);
    gl!.uniform1f(u.pixel, 1 / (scale * pixelRatio));
    gl!.uniform1f(u.opacity, opacity);
    gl!.uniform1f(u.flare, frame.flare);
    gl!.uniform1f(u.air, frame.air);
    gl!.uniform1f(u.landTurn, (frame.time / 90_000) % 1);
    gl!.uniform1f(u.cloudTurn, (frame.time / 54_000) % 1);
    gl!.uniform1f(u.glowReach, 0.33 * frame.width);
    gl!.clearColor(0, 0, 0, 0);
    gl!.clear(gl!.COLOR_BUFFER_BIT);
    gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
  }

  return { resize, draw, clear };
}
