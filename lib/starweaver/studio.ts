import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

import type { YumiOutfit } from "@/lib/shop/catalog";
import { buildYumiActor, ARM_ROOT, EYE_REST } from "@/lib/yumi3d/actor";
import { SHELL_RADIUS, TUBE_RADIUS } from "@/lib/yumi3d/anatomy";
import { buildThumbnailObject, createOutfitRig, disposeObject } from "@/lib/yumi3d/outfit";
import { makeStudioEnvironment } from "@/lib/yumi3d/scene";

import type { WeaveBeat } from "./presentation";

/* =========================================================
   Yumi Starweaver's studio: the real Yumi and a star gate (Chi, 2026-11-10:
   "yumi 可以做得更真實，跟我們 3d 一樣，其他部分也要更真實")

   The same Yumi as Home and the other two games, from lib/yumi3d/actor.ts,
   in what she wears from the shop from the moment she arrives. She stands
   front left; a star gate stands back right, a precise machine (Chi,
   2026-11-11: "更寫實更科幻科技感"): a frame of machined metal (champagne by
   day, graphite in Cosmic) with a scale, bolts and small lights; inside it
   the word's ring, one segment for each place, and a bearing of eight arcs,
   turning slowly opposite ways; inside those, a liquid of ice light that
   ripples and turns, faint while the gate is shut. It stands on a column
   over a plinth with a ring of light. At rest it keeps moving, gently.
   A seamless room, warm white by day and obsidian in Cosmic; the key light
   high on the right, so her contact shadow falls back and left. The camera
   holds one three-quarter view (about 25° round, 12° down); in a voyage it
   leans in a few percent, and under reduced motion not at all.

   The word is the track: one piece of light for each place to guess, from
   above her shoulder to the gate, and the same on the gate's own ring. A right letter flies up as a small flake
   of light and becomes its pieces (all of a batch at once). A wrong one
   sends an energy copy of her U, I or O, in ice light, to an orbit outside
   the gate; she stays whole. The end of a round brings every copy home. A
   won word closes the track in a ring round the surface, the rings spin up,
   the gate opens, and she sails through it and back; a seventh's relic
   rises out of the surface and comes towards us, and the page shows it
   whole (components/starweaver/RelicReveal.tsx).

   Plays what lib/starweaver/presentation.ts plans, and only that: nothing
   here pays or awards. Renders only while something moves, never while the
   page is hidden, and coming back to a hidden page shows where the round
   is rather than the backlog of what played meanwhile.
   ========================================================= */

export type WeaveScene = {
  /** Places in the word to guess (letters only). */
  places: number;
  /** Places filled by a guess, in word order. */
  lit: readonly number[];
  /** Copies out at the gate: the wrong guesses so far, while playing. */
  misses: number;
  status: "playing" | "won" | "lost";
  /** The relic a seventh voyage brought back, by id. */
  relic: string | null;
};

export type StarweaverStudio = {
  /** Compiles everything and draws it once; the canvas stays hidden until then. */
  ready(): Promise<void>;
  /** Dresses her out of sight and settles her in (once). */
  arrive(outfit: YumiOutfit | null, options?: { instant?: boolean }): void;
  /** Where the round stands, with no show: dealt, picked up, or skipped to. */
  show(scene: WeaveScene, options?: { reset?: boolean }): void;
  /** Plays a guess's beats, ending where `scene` says. */
  play(beats: WeaveBeat[], scene: WeaveScene): void;
  /** Ends whatever is playing, where it would have ended. */
  skip(): void;
  wear(outfit: YumiOutfit | null): void;
  dispose(): void;
};

export type StudioOptions = {
  reducedMotion?: boolean;
  /** Obsidian and graphite instead of warm white and champagne. */
  cosmic?: boolean;
  onBusy?: (busy: boolean) => void;
  onArrived?: () => void;
  /** The animated arrival only: the moment she touches down (for the page's sweep of light). */
  onLanded?: () => void;
  /** A relic is out of the gate (or its flight was skipped): the page shows it. */
  onRelic?: () => void;
};

const SCALE = 0.5;
/** Upright on the floor: the bottom of her C on it. */
const STAND_Y = (SHELL_RADIUS + TUBE_RADIUS) * SCALE;
const YUMI_AT = new THREE.Vector3(-1.6, STAND_Y, 0.55);
/** Turned a little towards the gate and the camera. */
const FACING = 0.32;
const GATE_AT = new THREE.Vector3(1.45, 1.62, -1.25);
const GATE_TURN = -0.42;
/* The gate's rings, outside in: outer and inner radius, depth through the gate. */
const FRAME_OUT = 1.08;
const FRAME_IN = 0.95;
const FRAME_D = 0.12;
const SEG_OUT = 0.925;
const SEG_IN = 0.855;
const SEG_D = 0.06;
const INNER_OUT = 0.835;
const INNER_IN = 0.77;
const INNER_D = 0.075;
const LIP_OUT = 0.758;
const LIP_IN = 0.722;
const LIP_D = 0.095;
const SURFACE_R = 0.724;
/* At rest the gate turns slowly, its surface ripples and its lights breathe:
   20 frames a second, only while the stage is on screen and the page is
   shown, never under reduced motion. A frame at rest moves only the rings
   (see tick), so it costs a fraction of a frame in play. */
const IDLE_FRAME_MS = 50;
/* After this long with nothing happening (no guess, no tap, no word), the
   gate's motion eases to a stop, and starts again with the next thing. */
const REST_AFTER_MS = 15000;
const STILL_S = 1.2;
/** Where U, I and O wait: three orbits outside the gate, in its own plane. */
const ORBITS: readonly { radius: number; angle: number }[] = [
  { radius: 1.3, angle: THREE.MathUtils.degToRad(150) },
  { radius: 1.52, angle: THREE.MathUtils.degToRad(32) },
  { radius: 1.74, angle: THREE.MathUtils.degToRad(208) },
];
/*
 * The first arrival (Chi, 2026-11-11: "新遊戲進場…優雅一點"; chose starlight
 * gathering into the gate and Yumi coming out of it, about 1.5 s with the
 * page, the keys rising once she stands). Points of light gather into the
 * gate's rings as they turn into place and its column rises from the
 * plinth; the surface lights; the gate opens and she glides out of it along an
 * arc, small at first, turning to face us, and touches down; the gate
 * closes and the track appears piece by piece. Once only: a new word never
 * plays it again, and a studio built again finds her already there.
 */
const ENTRY_S = 1.15;
const ENTRY_LAND_S = 0.98;
/* The canvas's own fade-in, first: the room appears empty, then gathers. */
const ENTRY_WAIT_MS = 260;
/** A new word: the track goes and the gate closes, 250–350 ms. */
const RESET_S = 0.3;
const ICE = new THREE.Color(0x7cc4d1);

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeIn = (t: number) => t ** 3;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
const window01 = (t: number, from: number, to: number) => clamp01((t - from) / (to - from));

/* A soft round spot of light, drawn once, for the flakes and the relic's glow. */
function glowTexture(): THREE.CanvasTexture {
  const paper = document.createElement("canvas");
  paper.width = paper.height = 64;
  const ink = paper.getContext("2d")!;
  const gradient = ink.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.25, "rgba(214,240,245,0.85)");
  gradient.addColorStop(0.6, "rgba(124,196,209,0.25)");
  gradient.addColorStop(1, "rgba(124,196,209,0)");
  ink.fillStyle = gradient;
  ink.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(paper);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/* Obsidian's reflections: a dark room with one cold window, so metal reads as metal at night. */
function nightEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const source = document.createElement("canvas");
  source.width = 512;
  source.height = 256;
  const ink = source.getContext("2d")!;
  const sky = ink.createLinearGradient(0, 0, 0, 256);
  sky.addColorStop(0, "#3a4048");
  sky.addColorStop(0.55, "#15181c");
  sky.addColorStop(1, "#050607");
  ink.fillStyle = sky;
  ink.fillRect(0, 0, 512, 256);
  const pane = ink.createRadialGradient(150, 70, 4, 150, 70, 100);
  pane.addColorStop(0, "rgba(220,240,245,0.95)");
  pane.addColorStop(1, "rgba(220,240,245,0)");
  ink.fillStyle = pane;
  ink.fillRect(0, 0, 512, 256);
  const texture = new THREE.CanvasTexture(source);
  texture.mapping = THREE.EquirectangularReflectionMapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const environment = pmrem.fromEquirectangular(texture).texture;
  pmrem.dispose();
  texture.dispose();
  return environment;
}

/*
 * Fine concentric lines, as a lathe leaves them: the bump and roughness of
 * the gate's metal. ExtrudeGeometry's own UVs are positions in the gate's
 * plane, so every ring shares one centre; a radius of 1.2 reaches the edge.
 */
function brushedTexture(): THREE.CanvasTexture {
  const size = 512;
  const paper = document.createElement("canvas");
  paper.width = paper.height = size;
  const ink = paper.getContext("2d")!;
  ink.fillStyle = "rgb(128,128,128)";
  ink.fillRect(0, 0, size, size);
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  ink.lineWidth = 0.9;
  for (let r = 1; r < size * 0.72; r += 0.75) {
    const v = Math.round(112 + rand() * 40);
    ink.strokeStyle = `rgba(${v},${v},${v},0.55)`;
    ink.beginPath();
    ink.arc(size / 2, size / 2, r, 0, Math.PI * 2);
    ink.stroke();
  }
  const texture = new THREE.CanvasTexture(paper);
  texture.colorSpace = THREE.NoColorSpace;
  texture.repeat.set(1 / 2.4, 1 / 2.4);
  texture.offset.set(0.5, 0.5);
  texture.anisotropy = 4;
  return texture;
}

/* A solid of `shape`, `depth` through, centred on z = 0, its edges chamfered. */
function extrude(shape: THREE.Shape, depth: number, segments: number, bevel: number): THREE.ExtrudeGeometry {
  const core = Math.max(0.001, depth - bevel * 2);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: core, curveSegments: segments, bevelEnabled: bevel > 0,
    bevelThickness: bevel, bevelSize: bevel, bevelOffset: -bevel, bevelSegments: 2,
  });
  geometry.translate(0, 0, -core / 2);
  return geometry;
}

/** A flat ring, machined: `outer` to `inner` radius. */
function annulus(outer: number, inner: number, depth: number, segments = 96, bevel = 0.008): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outer, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, inner, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  return extrude(shape, depth, segments, bevel);
}

/** A piece of a ring, from angle `from` to `to`. */
function sector(outer: number, inner: number, from: number, to: number, depth: number, bevel = 0.005): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outer, from, to, false);
  shape.absarc(0, 0, inner, to, from, true);
  shape.closePath();
  return extrude(shape, depth, Math.max(4, Math.ceil(((to - from) / (Math.PI * 2)) * 96)), bevel);
}

/*
 * The energy surface: a liquid of light that turns and ripples inward,
 * aqua in its depth, pale at its heart and rim, a little violet in its
 * swirl. Faint and slow while the gate is shut; bright and fast as it opens
 * (uOpen), and flaring as something passes through (uFlare). Laid over the
 * room by day, added to it at night.
 */
function energySurface(cosmic: boolean): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uOpen: { value: 0 },
      uFlare: { value: 0 },
      uDay: { value: cosmic ? 0 : 1 },
      uDeep: { value: new THREE.Color(cosmic ? 0x0f3a47 : 0x4ea6bb) },
      uBody: { value: new THREE.Color(cosmic ? 0x4fa8c2 : 0x95d3e0) },
      uTint: { value: new THREE.Color(cosmic ? 0x8e7cf0 : 0xa496f0) },
      uBright: { value: new THREE.Color(cosmic ? 0xe6fbff : 0xf4fcfd) },
    },
    vertexShader: `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
    fragmentShader: `
uniform float uTime;
uniform float uOpen;
uniform float uFlare;
uniform float uDay;
uniform vec3 uDeep;
uniform vec3 uBody;
uniform vec3 uTint;
uniform vec3 uBright;
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
  for (int i = 0; i < 3; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p);
  if (r > 1.0) discard;
  float a = atan(p.y, p.x);
  float t = uTime * (0.22 + 0.9 * uOpen);
  float swirl = (0.8 + 2.6 * uOpen) * (1.0 - r) * (1.0 - r);
  vec2 q = vec2(cos(a + swirl + t), sin(a + swirl + t)) * r;
  float f = fbm(q * 3.2 + vec2(t * 0.7, -t * 0.5));
  float ripple = 0.5 + 0.5 * sin(r * 30.0 - uTime * (1.4 + 4.5 * uOpen) + f * 5.0);
  float body = mix(f, ripple, 0.4);
  float core = 1.0 - smoothstep(0.0, 0.6, r);
  float rim = smoothstep(0.78, 0.98, r);
  vec3 col = mix(uDeep, uBody, body);
  col = mix(col, uTint, smoothstep(0.55, 0.9, f) * 0.35 * (1.0 - core));
  col = mix(col, uBright, clamp(core * (0.2 + 0.7 * uOpen) + rim * 0.3 + uFlare * 0.6, 0.0, 1.0));
  float energy = 0.45 + 0.55 * uOpen + 0.5 * uFlare;
  float edge = 1.0 - smoothstep(0.95, 1.0, r);
  float alpha = mix(0.9 * energy, 0.55 + 0.4 * uOpen + 0.3 * uFlare, uDay) * edge;
  gl_FragColor = vec4(mix(col * energy, col, uDay), clamp(alpha, 0.0, 1.0));
  #include <colorspace_fragment>
}`,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
    toneMapped: false,
    blending: cosmic ? THREE.AdditiveBlending : THREE.NormalBlending,
  });
}

export function createStarweaverStudio(canvas: HTMLCanvasElement, options: StudioOptions = {}): StarweaverStudio | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  } catch {
    return null;
  }
  const reduced = options.reducedMotion ?? false;
  const cosmic = options.cosmic ?? false;

  /* Nothing is disposed while a compile is in flight (lib/yumi3d/AGENTS.md). */
  const compiles = new Set<Promise<unknown>>();
  const compiling = <T>(promise: Promise<T>) => {
    compiles.add(promise);
    void promise.finally(() => compiles.delete(promise));
    return promise;
  };
  const afterCompiles = (release: () => void) => {
    if (compiles.size) void Promise.allSettled([...compiles]).then(release);
    else release();
  };

  /* A weak phone keeps fewer pixels; nothing else changes. */
  const pixelRatio = Math.min(window.devicePixelRatio || 1, (navigator.hardwareConcurrency ?? 8) <= 4 ? 1.5 : 2);
  renderer.setPixelRatio(pixelRatio);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = cosmic ? 1.08 : 1.02;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  /* Shadows are drawn when something that casts one moves, never for the
     gate's idle turning, which leaves them as they were. */
  renderer.shadowMap.autoUpdate = false;
  renderer.debug.checkShaderErrors = process.env.NODE_ENV !== "production";

  const backdrop = cosmic ? 0x0c0d10 : 0xf5f4f0;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(backdrop);
  scene.fog = new THREE.Fog(backdrop, 14, 30);
  const environment = cosmic ? nightEnvironment(renderer) : makeStudioEnvironment(renderer);
  scene.environment = environment;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

  // ------------------------------------------------------------- light
  scene.add(new THREE.HemisphereLight(0xffffff, cosmic ? 0x1a1d22 : 0xb9b4a9, cosmic ? 0.35 : 0.55));
  /* High on the right, so her shadow falls back and to the left. */
  const key = new THREE.DirectionalLight(cosmic ? 0xe9f3f6 : 0xfff8ee, cosmic ? 2.4 : 3.1);
  key.position.set(6.5, 10, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -6, right: 6, top: 6, bottom: -4, near: 1, far: 30 });
  key.shadow.bias = -0.0008;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 3;
  scene.add(key);
  /* A rim from behind, so her black shell keeps its edge against obsidian. */
  const rim = new THREE.DirectionalLight(cosmic ? 0xbfe6ee : 0xffffff, cosmic ? 1.5 : 0.9);
  rim.position.set(-3, 4, -6);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0xffffff, 0.28);
  fill.position.set(-6, 2, 4);
  scene.add(fill);
  /* The gate's own ice light: barely there, brighter as it opens. */
  const gateLight = new THREE.PointLight(ICE, cosmic ? 1.2 : 0.6, 6, 1.8);
  gateLight.position.copy(GATE_AT).add(new THREE.Vector3(0, 0, 0.5));
  scene.add(gateLight);

  // ------------------------------------------------------- materials
  const floorMaterial = new THREE.MeshStandardMaterial({ color: backdrop, roughness: 1, metalness: 0 });
  /* Machined metal, turned on a lathe: fine concentric lines in its bump
     and roughness catch the light as it moves round the rings. Champagne by
     day, graphite in Cosmic. */
  const brushed = brushedTexture();
  const metal = new THREE.MeshPhysicalMaterial({
    color: cosmic ? 0x4a4e56 : 0xd9d0bd, metalness: 0.92, roughness: cosmic ? 0.3 : 0.27,
    roughnessMap: brushed, bumpMap: brushed, bumpScale: 0.5,
    clearcoat: 0.3, clearcoatRoughness: 0.22, envMapIntensity: cosmic ? 1.15 : 1,
  });
  const metalDark = new THREE.MeshPhysicalMaterial({
    color: cosmic ? 0x2c2f35 : 0xb4aa96, metalness: 0.9, roughness: 0.36,
    roughnessMap: brushed, bumpMap: brushed, bumpScale: 0.4, envMapIntensity: 0.95,
  });
  const polished = new THREE.MeshPhysicalMaterial({
    color: cosmic ? 0x9aa3ad : 0xeee8db, metalness: 1, roughness: 0.12, clearcoat: 0.6, envMapIntensity: 1.25,
  });
  const engraving = new THREE.MeshStandardMaterial({ color: cosmic ? 0x14161a : 0x7a7163, metalness: 0.6, roughness: 0.65 });
  const loopMaterial = new THREE.MeshBasicMaterial({ color: ICE, transparent: true, opacity: 0, depthWrite: false, fog: false });
  /* Added light reads as light only on a dark room; on warm white it turns
     to flat white paper. By day the glows are tinted and laid over. */
  const glowBlending = cosmic ? THREE.AdditiveBlending : THREE.NormalBlending;
  const energy = new THREE.MeshStandardMaterial({
    color: cosmic ? 0xc8eef4 : 0x8fd3df, emissive: ICE, emissiveIntensity: cosmic ? 0.9 : 0.75, metalness: 0.2, roughness: 0.25,
    transparent: true, opacity: cosmic ? 0.62 : 0.8, depthWrite: false,
  });
  const glow = glowTexture();
  const flakeMaterial = new THREE.SpriteMaterial({
    map: glow, color: cosmic ? 0xd6f0f5 : 0x5fbccc, transparent: true, depthWrite: false, blending: glowBlending, fog: false,
  });
  /* The gate's small lights: ice, brighter as it opens. By day a deeper cyan, so they read on champagne. */
  const lampColor = new THREE.Color(cosmic ? 0xaee6ef : 0x2f9fb4);
  const lampMaterial = () => new THREE.MeshBasicMaterial({ color: lampColor.clone(), fog: false });

  const solid = <M extends THREE.Mesh>(mesh: M, parent: THREE.Object3D = scene) => {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  // ------------------------------------------------------------ floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // ------------------------------------------------------------- gate
  /*
   * A precise machine (Chi, 2026-11-11: "更寫實更科幻科技感", chose
   * machined rings and an energy surface). From the outside in:
   *  - the frame: a fixed ring with chamfered edges, an engraved line,
   *    a scale of fine ticks, hex bolts, four small lights and four clamps;
   *  - the word's ring: one segment for each place to guess, lit as the
   *    track is, turning slowly one way;
   *  - a bearing ring of eight arcs with a light in each gap, turning the
   *    other way;
   *  - a polished lip, and inside it a rippling liquid of energy with a
   *    halo and drifting motes, faint while the gate is shut and bright and
   *    fast as it opens.
   * It stands on a column over a two-step plinth with a ring of light.
   */
  const gate = new THREE.Group();
  gate.position.copy(GATE_AT);
  gate.rotation.y = GATE_TURN;
  scene.add(gate);

  const gateFrame = new THREE.Group();
  gate.add(gateFrame);
  solid(new THREE.Mesh(annulus(FRAME_OUT, FRAME_IN, FRAME_D), metal), gateFrame);
  /* Pieces that never move apart are one geometry each, so one draw. */
  const merged = (parts: THREE.BufferGeometry[]) => {
    const geometry = mergeGeometries(parts) ?? parts[0];
    for (const part of parts) if (part !== geometry) part.dispose();
    return geometry;
  };
  gateFrame.add(new THREE.Mesh(merged([1, -1].map(side =>
    new THREE.TorusGeometry(1.046, 0.0045, 4, 128).translate(0, 0, side * (FRAME_D / 2 + 0.008)))), engraving));
  /* The scale: sixty ticks, every fifth a long one. */
  const ticks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.006, 0.026, 0.006), engraving, 60);
  const placing = new THREE.Object3D();
  for (let i = 0; i < 60; i++) {
    const angle = (i / 60) * Math.PI * 2;
    const long = i % 5 === 0;
    placing.position.set(Math.cos(angle) * (long ? 0.976 : 0.97), Math.sin(angle) * (long ? 0.976 : 0.97), FRAME_D / 2 + 0.009);
    placing.rotation.set(0, 0, angle - Math.PI / 2);
    placing.scale.set(1, long ? 1.6 : 1, 1);
    placing.updateMatrix();
    ticks.setMatrixAt(i, placing.matrix);
  }
  gateFrame.add(ticks);
  const boltGeometry = new THREE.CylinderGeometry(0.015, 0.015, 0.012, 6);
  boltGeometry.rotateX(Math.PI / 2);
  const bolts = new THREE.InstancedMesh(boltGeometry, polished, 12);
  for (let i = 0; i < 12; i++) {
    const angle = THREE.MathUtils.degToRad(15 + i * 30);
    placing.position.set(Math.cos(angle) * 1.013, Math.sin(angle) * 1.013, FRAME_D / 2 + 0.012);
    placing.rotation.set(0, 0, angle);
    placing.scale.setScalar(1);
    placing.updateMatrix();
    bolts.setMatrixAt(i, placing.matrix);
  }
  gateFrame.add(bolts);
  /* Four small lights between the bolts, at the diagonals. */
  const lamps = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.011, 0.036, 4, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }), 4);
  [45, 135, 225, 315].forEach((degrees, i) => {
    const angle = THREE.MathUtils.degToRad(degrees);
    placing.position.set(Math.cos(angle) * 1.013, Math.sin(angle) * 1.013, FRAME_D / 2 + 0.012);
    placing.rotation.set(0, 0, angle);
    placing.updateMatrix();
    lamps.setMatrixAt(i, placing.matrix);
    lamps.setColorAt(i, lampColor);
  });
  gateFrame.add(lamps);
  /* Clamps over the frame's edge, top and sides; the column's at the foot. */
  solid(new THREE.Mesh(merged([0, 90, 180, 270].map(degrees => {
    const angle = THREE.MathUtils.degToRad(degrees);
    const clamp = new THREE.BoxGeometry(degrees === 270 ? 0.2 : 0.11, 0.16, FRAME_D + 0.06);
    clamp.rotateZ(angle + Math.PI / 2);
    return clamp.translate(Math.cos(angle) * (FRAME_OUT + 0.01), Math.sin(angle) * (FRAME_OUT + 0.01), 0);
  })), metalDark), gateFrame);

  /* The word's ring: segments built for each word (setSegments), over a dark base. */
  const segRing = new THREE.Group();
  gate.add(segRing);
  solid(new THREE.Mesh(annulus(SEG_OUT - 0.008, SEG_IN + 0.008, SEG_D - 0.022, 96, 0.004), metalDark), segRing);

  /* The bearing: eight arcs, a light in each gap. */
  const bearing = new THREE.Group();
  gate.add(bearing);
  const BEARING_GAP = THREE.MathUtils.degToRad(5);
  solid(new THREE.Mesh(merged(Array.from({ length: 8 }, (_, i) => {
    const from = (i / 8) * Math.PI * 2 + BEARING_GAP / 2;
    return sector(INNER_OUT, INNER_IN, from, from + Math.PI / 4 - BEARING_GAP, INNER_D);
  })), metal), bearing);
  const beads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.01, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }), 8);
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    placing.position.set(Math.cos(angle) * (INNER_OUT + INNER_IN) / 2, Math.sin(angle) * (INNER_OUT + INNER_IN) / 2, INNER_D / 2);
    placing.rotation.set(0, 0, 0);
    placing.updateMatrix();
    beads.setMatrixAt(i, placing.matrix);
    beads.setColorAt(i, lampColor);
  }
  bearing.add(beads);

  const lip = solid(new THREE.Mesh(annulus(LIP_OUT, LIP_IN, LIP_D, 96, 0.006), polished), gate);

  /* The energy surface (energySurface below): a liquid of light inside the lip. */
  const surfaceMaterial = energySurface(cosmic);
  const surface = new THREE.Mesh(new THREE.CircleGeometry(SURFACE_R, 96), surfaceMaterial);
  gate.add(surface);

  /* The finished word's ring of light round the lip, and the open gate's along the frame. */
  const loop = new THREE.Mesh(new THREE.TorusGeometry(LIP_OUT + 0.012, 0.009, 8, 128), loopMaterial);
  loop.position.z = LIP_D / 2;
  gate.add(loop);
  const fullRing = new THREE.Mesh(new THREE.TorusGeometry(FRAME_IN + 0.004, 0.008, 8, 160), loopMaterial.clone());
  fullRing.position.z = FRAME_D / 2;
  gate.add(fullRing);

  /* The pedestal: a two-step plinth with a ring of light, a column, two collars. */
  const pedestal = new THREE.Group();
  pedestal.position.y = -GATE_AT.y;
  gate.add(pedestal);
  const plinth = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.64, 0.05, 72), metalDark), pedestal);
  plinth.position.y = 0.025;
  const step = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.44, 0.06, 64), metal), pedestal);
  step.position.y = 0.08;
  const strip = new THREE.Mesh(new THREE.TorusGeometry(0.505, 0.006, 6, 96), lampMaterial());
  strip.rotation.x = Math.PI / 2;
  strip.position.y = 0.052;
  pedestal.add(strip);
  const COLUMN_FROM = 0.11;
  const COLUMN_LENGTH = GATE_AT.y - FRAME_OUT - 0.02 - COLUMN_FROM;
  const column = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.074, 1, 32), metal), pedestal);
  const collars = [0.12, 0.86].map(at => {
    const collar = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.086, 0.086, 0.04, 32), polished), pedestal);
    return { collar, at };
  });

  /* Light round the surface, and motes drifting into it: kept apart from
     the gate so the camera frames the machine, not its glow. */
  const gateFx = new THREE.Group();
  gateFx.position.copy(GATE_AT);
  gateFx.rotation.y = GATE_TURN;
  scene.add(gateFx);
  const haloMaterial = new THREE.SpriteMaterial({
    map: glow, color: cosmic ? 0x9fdbe6 : 0x7cc4d1, transparent: true, opacity: 0, depthWrite: false, blending: glowBlending, fog: false,
  });
  const halo = new THREE.Sprite(haloMaterial);
  halo.position.z = -0.04;
  halo.scale.setScalar(2.3);
  gateFx.add(halo);
  const MOTES_IN = 48;
  const drift = Array.from({ length: MOTES_IN }, (_, i) => ({
    angle: (i / MOTES_IN) * Math.PI * 2 * 3.7,
    radius: 0.12 + ((i * 37) % MOTES_IN) / MOTES_IN * (SURFACE_R - 0.16),
    speed: 0.6 + ((i * 13) % 7) / 7,
  }));
  const driftPositions = new Float32Array(MOTES_IN * 3);
  const driftGeometry = new THREE.BufferGeometry();
  driftGeometry.setAttribute("position", new THREE.BufferAttribute(driftPositions, 3));
  const driftMaterial = new THREE.PointsMaterial({
    map: glow, color: cosmic ? 0xd6f0f5 : 0x4fb3c6, size: 0.05, sizeAttenuation: true,
    transparent: true, opacity: 0, depthWrite: false, blending: glowBlending, fog: false,
  });
  const motesIn = new THREE.Points(driftGeometry, driftMaterial);
  motesIn.frustumCulled = false;
  gateFx.add(motesIn);

  /* Where things go in the gate's plane, in the world. */
  function gatePoint(radius: number, angle: number, out = new THREE.Vector3()) {
    out.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.05);
    gate.updateMatrixWorld();
    return out.applyMatrix4(gate.matrixWorld);
  }
  scene.updateMatrixWorld(true);
  const gateCentre = gatePoint(0, 0);

  // ------------------------------------------------------------ track
  /* From above her shoulder, up and over, to the gate's surface. */
  const trackCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(YUMI_AT.x + 0.7, YUMI_AT.y + 0.95, YUMI_AT.z + 0.05),
    new THREE.Vector3(0.05, 3.25, 0.15),
    gateCentre.clone().add(new THREE.Vector3(-0.16, 0, 0.18)),
  );
  type Piece = {
    mesh: THREE.Mesh; material: THREE.MeshStandardMaterial; level: number; middle: THREE.Vector3;
    /** Its segment on the gate's ring, lit with it. */
    segment: THREE.Mesh; segmentMaterial: THREE.MeshStandardMaterial;
  };
  let pieces: Piece[] = [];
  /* The places the track was built for (it holds at most 24 pieces). */
  let trackFor = -1;
  const trackGroup = new THREE.Group();
  scene.add(trackGroup);
  const dimColor = new THREE.Color(cosmic ? 0x2b2f36 : 0xd2cdc1);

  function setTrack(count: number) {
    trackFor = count;
    const old = pieces;
    pieces = [];
    for (const piece of old) {
      trackGroup.remove(piece.mesh);
      segRing.remove(piece.segment);
    }
    afterCompiles(() => {
      for (const piece of old) {
        piece.mesh.geometry.dispose();
        piece.material.dispose();
        piece.segmentMaterial.dispose();
      }
      old[0]?.segment.geometry.dispose();
    });
    const n = count <= 0 ? 0 : Math.min(24, count);
    const gap = 0.012;
    /* The ring's segments, in word order clockwise from the top. */
    const arc = (Math.PI * 2) / Math.max(1, n);
    const segmentGap = Math.min(arc * 0.18, THREE.MathUtils.degToRad(3));
    const segmentGeometry = n ? sector(SEG_OUT, SEG_IN, 0, arc - segmentGap, SEG_D) : null;
    for (let i = 0; i < n; i++) {
      const start = i / n + gap;
      const end = (i + 1) / n - gap;
      const points = Array.from({ length: 9 }, (_, k) => trackCurve.getPoint(start + ((end - start) * k) / 8));
      const material = new THREE.MeshStandardMaterial({
        color: dimColor, metalness: 0.4, roughness: 0.4, emissive: ICE, emissiveIntensity: 0,
      });
      const mesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 12, 0.026, 6, false), material);
      mesh.castShadow = true;
      trackGroup.add(mesh);
      const segmentMaterial = new THREE.MeshStandardMaterial({
        color: dimColor, metalness: 0.7, roughness: 0.34, emissive: ICE, emissiveIntensity: 0, envMapIntensity: 0.9,
      });
      const segment = new THREE.Mesh(segmentGeometry!, segmentMaterial);
      segment.rotation.z = Math.PI / 2 - (i + 1) * arc + segmentGap / 2;
      segment.castShadow = true;
      segRing.add(segment);
      pieces.push({ mesh, material, level: 0, middle: trackCurve.getPoint((start + end) / 2), segment, segmentMaterial });
    }
  }

  /* A piece of track at `level`, 0 dim to 1 lit. By day the light needs
     colour as well as glow to stand out from the room. */
  const litColor = new THREE.Color(cosmic ? 0x7cc4d1 : 0x2f9fb4);
  function lightPiece(piece: Piece, level: number) {
    piece.level = level;
    piece.material.emissiveIntensity = (cosmic ? 1.6 : 0.85) * level;
    piece.material.color.copy(dimColor).lerp(litColor, level);
    piece.segmentMaterial.emissiveIntensity = (cosmic ? 1.8 : 0.95) * level;
    piece.segmentMaterial.color.copy(dimColor).lerp(litColor, level);
  }

  // ------------------------------------------------------------ flakes
  /* The light a right letter becomes, flying up from the keys to its piece. */
  const flakes = Array.from({ length: 12 }, () => {
    const sprite = new THREE.Sprite(flakeMaterial.clone());
    sprite.visible = false;
    sprite.scale.setScalar(0.32);
    scene.add(sprite);
    return sprite;
  });
  const FLAKE_FROM = new THREE.Vector3(-0.2, 0.25, 2.4);

  /* The starlight the gate gathers from: points scattered round it that
     draw in onto its rings. Seeded, so every arrival looks the same. */
  const motes = (() => {
    let seed = 2026;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    return Array.from({ length: 28 }, (_, i) => {
      const sprite = new THREE.Sprite(flakeMaterial.clone());
      sprite.visible = false;
      scene.add(sprite);
      const onFrame = i % 2 === 0;
      const angle = (i / 28) * Math.PI * 2 + (onFrame ? 0 : 0.3);
      const to = gatePoint(onFrame ? 1.013 : (SEG_OUT + SEG_IN) / 2, angle, new THREE.Vector3());
      const from = to.clone().add(new THREE.Vector3((rand() - 0.5) * 3.2, (rand() - 0.2) * 2.2, (rand() - 0.3) * 2.2));
      return { sprite, from, to, delay: rand() * 0.12 };
    });
  })();

  // ------------------------------------------------------------ Yumi
  const actor = buildYumiActor();
  const { model, yuGroup, arm, armCollar, eyeGroup, lookGroup, pupil, shellMaterial } = actor;
  model.scale.setScalar(SCALE);
  model.position.copy(YUMI_AT);
  model.rotation.y = FACING;
  model.visible = false;
  scene.add(model);
  const toEye = EYE_REST.clone().sub(ARM_ROOT);
  arm.position.copy(ARM_ROOT);
  arm.scale.set(1, toEye.length(), 1);
  arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), toEye.clone().normalize());
  armCollar.position.copy(ARM_ROOT);
  model.traverse(object => {
    const mesh = object as THREE.Mesh;
    if (mesh.isMesh && mesh.material && (mesh.material as THREE.Material).visible !== false) mesh.castShadow = true;
  });
  const rig = createOutfitRig({
    model, eyeGroup, lookGroup, pupil, shellMaterial,
    settling: () => (compiles.size ? Promise.allSettled([...compiles]) : undefined),
  });

  // ------------------------------------------------- the energy copies
  /* Her U, I and O in ice light: low-detail copies, never her own parts. */
  const sources = [yuGroup, arm, eyeGroup];
  const copies = sources.map((part, index) => {
    const group = new THREE.Group();
    const clone = part.clone(true);
    clone.position.set(0, 0, 0);
    clone.quaternion.identity();
    clone.rotation.set(0, 0, 0);
    clone.scale.set(1, index === 1 ? 1.7 : 1, 1);
    if (index === 1) clone.position.y = -0.85;
    clone.traverse(object => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      const hidden = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).every(m => m.visible === false);
      mesh.visible = !hidden;
      mesh.material = energy;
      mesh.castShadow = false;
    });
    group.add(clone);
    group.visible = false;
    scene.add(group);
    return group;
  });
  const COPY_SIZE = [SCALE * 0.42, SCALE * 0.55, SCALE * 0.55];
  /* Where each leaves from: the part of her it copies. */
  const homes = [
    YUMI_AT.clone().add(new THREE.Vector3(0, -0.15, 0.1)),
    YUMI_AT.clone().add(new THREE.Vector3(-0.35, 0.1, 0.25)),
    YUMI_AT.clone().add(new THREE.Vector3(0.1, 0.05, 0.3)),
  ];
  const spots = ORBITS.map(({ radius, angle }) => gatePoint(radius, angle, new THREE.Vector3()));

  // ------------------------------------------------------------ relic
  /* What a seventh brings back: a small glowing body under a cone of quiet light. */
  const relic = new THREE.Group();
  relic.visible = false;
  scene.add(relic);
  /* A glowing body stands in until the relic's own model is built. */
  const placeholder = solid(new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.22, 2),
    new THREE.MeshPhysicalMaterial({
      color: 0xeef6f7, metalness: 0.2, roughness: 0.12, clearcoat: 1, iridescence: 0.6, iridescenceIOR: 1.4,
      emissive: ICE, emissiveIntensity: 0.25, envMapIntensity: 1.2,
    }),
  ), relic);
  const relicHalo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glow, color: cosmic ? 0xbfe9f0 : 0x7cc4d1, transparent: true, opacity: cosmic ? 0.55 : 0.45,
    depthWrite: false, blending: glowBlending, fog: false,
  }));
  relicHalo.scale.setScalar(1.1);
  relic.add(relicHalo);
  const RELIC_HALO = cosmic ? 0.55 : 0.45;
  /* Where it comes to on its way out of the gate, towards us. */
  const relicNear = new THREE.Vector3();
  /* The quiet light it is shown in: a soft pool on the floor beneath it. */
  const coneMaterial = new THREE.MeshBasicMaterial({
    map: glow, color: cosmic ? 0xdff4f7 : 0x9fd6e0, transparent: true, opacity: 0, depthWrite: false, fog: false, blending: glowBlending,
  });
  const cone = new THREE.Mesh(new THREE.CircleGeometry(0.85, 48), coneMaterial);
  cone.rotation.x = -Math.PI / 2;
  cone.visible = false;
  scene.add(cone);
  const RELIC_AT = new THREE.Vector3(0.2, 0.85, 0.35);
  cone.position.set(RELIC_AT.x, 0.012, RELIC_AT.z);

  /*
   * The relic itself, built from the same code as the shop's pictures
   * (buildThumbnailObject) as soon as the round says which one it is: the
   * guess's answer comes a couple of seconds before the reveal, and its
   * shaders compile in that time rather than on the frame it appears.
   */
  let relicId: string | null = null;
  let relicPiece: THREE.Object3D | null = null;
  function setRelic(id: string | null) {
    if (id === relicId) return;
    relicId = id;
    const old = relicPiece;
    relicPiece = null;
    if (old) {
      relic.remove(old);
      afterCompiles(() => disposeObject(old));
    }
    placeholder.visible = true;
    if (!id) return;
    let piece: THREE.Object3D | null = null;
    try {
      piece = buildThumbnailObject(id);
    } catch {
      piece = null;
    }
    if (!piece) return;
    /* About the size of the glowing body it replaces, centred on it. */
    const sphere = new THREE.Box3().setFromObject(piece).getBoundingSphere(new THREE.Sphere());
    const holder = new THREE.Group();
    piece.position.sub(sphere.center);
    holder.add(piece);
    holder.scale.setScalar(0.5 / Math.max(0.05, sphere.radius));
    holder.traverse(object => { if ((object as THREE.Mesh).isMesh) object.castShadow = true; });
    relic.add(holder);
    relicPiece = holder;
    placeholder.visible = false;
    const shown = relic.visible;
    relic.visible = true;
    void compiling(renderer.compileAsync(relic, camera, scene)).catch(() => undefined);
    relic.visible = shown;
  }

  // ------------------------------------------------------------ state
  let rest: WeaveScene = { places: 1, lit: [], misses: 0, status: "playing", relic: null };
  let gateOpen = 0;
  type Live = { beat: WeaveBeat; started: number };
  let queue: WeaveBeat[] = [];
  let live: Live | null = null;
  let reset: { from: number; started: number } | null = null;
  let busy = false;
  let arriving = false;
  let arrived = false;
  let entry: { started: number; landed: boolean } | null = null;
  let cameraPush = 0;
  /* How far the gate has gathered, 0 nothing to 1 whole: nothing until she arrives. */
  let assembly = reduced ? 1 : 0;
  let readyAt = 0;
  /* The gate's own motion at rest: time, and how far each ring has turned. */
  let clock = 0;
  const spin = { seg: 0, bearing: 0 };
  /* A relic is on its way: the page shows it once it is out of the gate. */
  let relicPending = false;
  let onScreen = true;
  /* How much the gate moves at rest, 1 turning to 0 still; and when something last happened. */
  let motion = 1;
  let lastEvent = performance.now();

  function setBusy(next: boolean) {
    if (busy === next) return;
    busy = next;
    options.onBusy?.(next);
  }

  /* The gate as far as it has gathered: plinth spread, column risen, rings grown and turned into place, surface lit. */
  function poseAssembly(a: number) {
    assembly = a;
    const grow = (from: number) => Math.max(0.001, easeOut(window01(a, from, 1)));
    gateFrame.scale.setScalar(grow(0));
    segRing.scale.setScalar(grow(0.12));
    bearing.scale.setScalar(grow(0.22));
    lip.scale.setScalar(grow(0.3));
    surface.scale.setScalar(grow(0.4));
    plinth.scale.set(grow(0), 1, grow(0));
    step.scale.set(grow(0.1), 1, grow(0.1));
    const rise = grow(0.2);
    column.scale.set(1, COLUMN_LENGTH * rise, 1);
    column.position.y = COLUMN_FROM + (COLUMN_LENGTH * rise) / 2;
    for (const { collar, at } of collars) {
      collar.visible = rise >= at;
      collar.position.y = COLUMN_FROM + COLUMN_LENGTH * at;
    }
    gateFx.visible = a >= 0.4;
    trackGroup.visible = a >= 1;
    applyRings();
  }

  function applyRings() {
    const q = easeInOut(gateOpen);
    const gathering = 1 - easeOut(assembly);
    segRing.rotation.z = q * 1.25 + gathering * 2.2 + spin.seg;
    bearing.rotation.z = -q * 1.6 - gathering * 2.8 - spin.bearing;
  }

  function poseGate(open: number) {
    gateOpen = open;
    const q = easeInOut(open);
    (fullRing.material as THREE.MeshBasicMaterial).opacity = 0.85 * q;
    surfaceMaterial.uniforms.uOpen.value = q;
    haloMaterial.opacity = (cosmic ? 0.22 : 0.14) + q * (cosmic ? 0.5 : 0.32);
    driftMaterial.opacity = (cosmic ? 0.6 : 0.55) * (0.45 + 0.55 * q);
    gateLight.intensity = (cosmic ? 1.2 : 0.6) + q * (cosmic ? 5 : 4);
    applyRings();
    breathe();
  }

  /* The lights: the frame's four breathe in turn, the bearing's chase round, brighter as the gate opens. */
  const bead = new THREE.Color();
  function breathe() {
    const q = easeInOut(gateOpen);
    for (let k = 0; k < 4; k++) {
      const level = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(clock * 1.6 - k * 1.57));
      lamps.setColorAt(k, bead.copy(lampColor).multiplyScalar(level * (1 + 0.8 * q)));
    }
    if (lamps.instanceColor) lamps.instanceColor.needsUpdate = true;
    for (let i = 0; i < 8; i++) {
      const level = 0.35 + 0.65 * Math.max(0, Math.sin(clock * 2.2 - i * 0.785)) ** 3;
      beads.setColorAt(i, bead.copy(lampColor).multiplyScalar(level * (1 + q)));
    }
    if (beads.instanceColor) beads.instanceColor.needsUpdate = true;
    (strip.material as THREE.MeshBasicMaterial).color.copy(lampColor).multiplyScalar(0.7 + 0.6 * q);
  }

  /* Time passes for the gate: its rings turn, its surface moves, the motes drift in. */
  function advance(dt: number) {
    const q = easeInOut(gateOpen);
    const busyNow = Boolean(live || reset || entry);
    const resting = !busyNow && performance.now() - lastEvent > REST_AFTER_MS;
    motion = resting ? Math.max(0, motion - dt / STILL_S) : Math.min(1, motion + dt / STILL_S);
    const step = dt * motion;
    clock += step;
    spin.seg += step * (0.1 + 1.1 * q);
    spin.bearing += step * (0.16 + 1.5 * q);
    surfaceMaterial.uniforms.uTime.value = clock;
    drift.forEach((mote, i) => {
      mote.radius -= step * mote.speed * (0.04 + 0.26 * q);
      mote.angle += step * mote.speed * (0.4 + 1.6 * q);
      if (mote.radius < 0.06) mote.radius = SURFACE_R - 0.04;
      driftPositions[i * 3] = Math.cos(mote.angle) * mote.radius;
      driftPositions[i * 3 + 1] = Math.sin(mote.angle) * mote.radius;
      driftPositions[i * 3 + 2] = 0.03 + 0.025 * Math.sin(clock * 1.3 + i);
    });
    driftGeometry.attributes.position.needsUpdate = true;
    applyRings();
    breathe();
  }

  function poseCopies(out: number) {
    copies.forEach((copy, i) => {
      copy.visible = i < out;
      copy.position.copy(spots[i]);
      copy.rotation.set(0.2, -0.4 + i * 0.5, 0);
      copy.scale.setScalar(COPY_SIZE[i]);
    });
  }

  /** The scene as `rest` says, with nothing in flight. */
  function settle() {
    const lit = new Set(rest.lit);
    const won = rest.status === "won";
    poseAssembly(arrived || reduced ? 1 : assembly);
    pieces.forEach((piece, i) => {
      lightPiece(piece, won || lit.has(i) ? 1 : 0);
      piece.mesh.visible = true;
    });
    motes.forEach(mote => { mote.sprite.visible = false; });
    loopMaterial.opacity = won ? 0.9 : 0;
    poseGate(won ? 1 : 0);
    poseCopies(rest.status === "playing" ? rest.misses : 0);
    flakes.forEach(flake => { flake.visible = false; });
    model.visible = arrived;
    model.position.copy(YUMI_AT);
    model.scale.setScalar(SCALE);
    model.rotation.set(0, FACING, 0);
    relic.visible = won && Boolean(rest.relic);
    relic.position.copy(RELIC_AT);
    relic.scale.setScalar(1);
    relicHalo.scale.setScalar(1.1);
    (relicHalo.material as THREE.SpriteMaterial).opacity = RELIC_HALO;
    surfaceMaterial.uniforms.uFlare.value = 0;
    cone.visible = relic.visible;
    coneMaterial.opacity = relic.visible ? (cosmic ? 0.5 : 0.55) : 0;
    cameraPush = 0;
  }

  const scratch = new THREE.Vector3();

  /* A point on a soft arc from `a` to `b`, raised by `height` at its middle. */
  function arcPoint(a: THREE.Vector3, b: THREE.Vector3, t: number, height: number, out: THREE.Vector3) {
    out.copy(a).lerp(b, t);
    out.y += Math.sin(Math.PI * t) * height;
    return out;
  }

  function animate(beat: WeaveBeat, t: number) {
    switch (beat.phase) {
      case "weave": {
        /* The whole batch at once, a little staggered, each flake to its own piece. */
        const places = beat.places ?? [];
        places.slice(0, flakes.length).forEach((place, k) => {
          const flake = flakes[k];
          const piece = pieces[place];
          if (!piece) return;
          const own = window01(t, k * 0.06, 0.78 + k * 0.03);
          flake.visible = own > 0 && own < 1;
          arcPoint(FLAKE_FROM, piece.middle, easeOut(own), 0.6, flake.position);
          flake.scale.setScalar(0.18 + 0.22 * Math.sin(Math.PI * own));
          (flake.material as THREE.SpriteMaterial).opacity = Math.min(1, own * 3);
          lightPiece(piece, easeOut(window01(t, 0.55 + k * 0.03, 1)));
        });
        break;
      }
      case "release": {
        const i = beat.piece ?? 0;
        const copy = copies[i];
        const q = easeInOut(t);
        copy.visible = true;
        arcPoint(homes[i], spots[i], q, 0.9, copy.position);
        copy.scale.setScalar(SCALE * (0.8 - 0.25 * q) * (i === 0 ? 0.78 : 1));
        copy.rotation.set(0.2 * q, -0.4 + i * 0.5 + (1 - q) * 1.2, 0);
        /* She gives a little as it leaves, and is whole again. */
        model.rotation.z = Math.sin(Math.PI * window01(t, 0, 0.4)) * 0.05;
        break;
      }
      case "recall": {
        const q = easeIn(t);
        copies.forEach((copy, i) => {
          if (!copy.visible) return;
          arcPoint(spots[i], homes[i], q, 0.6, copy.position);
          copy.scale.setScalar(COPY_SIZE[i] * (1 - 0.7 * q));
        });
        if (t >= 1) copies.forEach(copy => { copy.visible = false; });
        model.scale.setScalar(SCALE * (1 + 0.04 * Math.sin(Math.PI * window01(t, 0.75, 1))));
        break;
      }
      case "close": {
        loopMaterial.opacity = 0.9 * easeOut(t);
        pieces.forEach(piece => lightPiece(piece, Math.max(piece.level, easeOut(t))));
        break;
      }
      case "voyage": {
        poseGate(easeOut(window01(t, 0, 0.28)));
        /* In: along an arc into the surface, smaller as she goes. */
        const going = window01(t, 0.22, 0.52);
        const back = window01(t, 0.62, 0.94);
        const into = gateCentre.clone().add(new THREE.Vector3(0, 0, 0.06));
        if (back > 0) {
          arcPoint(into, YUMI_AT, easeOut(back), 0.7, scratch);
          model.visible = true;
          model.position.copy(scratch);
          model.scale.setScalar(SCALE * (0.12 + 0.88 * easeOut(back)));
          model.rotation.set(0, FACING + (1 - easeOut(back)) * Math.PI * 2, 0);
        } else if (going > 0) {
          arcPoint(YUMI_AT, into, easeIn(going), 0.7, scratch);
          model.visible = going < 1;
          model.position.copy(scratch);
          model.scale.setScalar(SCALE * (1 - 0.88 * easeIn(going)));
          model.rotation.set(0, FACING + easeIn(going) * Math.PI, 0);
        }
        /* The surface flares while she is through it. */
        surfaceMaterial.uniforms.uFlare.value = Math.sin(Math.PI * window01(t, 0.44, 0.7));
        cameraPush = reduced ? 0 : 0.035 * Math.sin(Math.PI * t);
        if (t >= 1) {
          model.position.copy(YUMI_AT);
          model.scale.setScalar(SCALE);
          model.rotation.set(0, FACING, 0);
        }
        break;
      }
      case "relic": {
        /* The surface flares, and the relic rises out of it and comes
           towards us, larger and turning, until its light fills the view;
           the page then shows it whole (onRelic). */
        relic.visible = true;
        cone.visible = false;
        surfaceMaterial.uniforms.uFlare.value = Math.sin(Math.PI * window01(t, 0, 0.55));
        relicNear.copy(gateCentre).lerp(camera.position, 0.55);
        const out = easeInOut(window01(t, 0.1, 0.9));
        relic.position.copy(gateCentre).lerp(relicNear, out);
        relic.position.y += Math.sin(Math.PI * out) * 0.12;
        relic.scale.setScalar(0.25 + 2.1 * out);
        relic.rotation.y = out * Math.PI * 2.2;
        const bloom = window01(t, 0.62, 1);
        relicHalo.scale.setScalar(1.1 + 3.4 * easeIn(bloom));
        (relicHalo.material as THREE.SpriteMaterial).opacity = Math.min(1, RELIC_HALO + 0.45 * out);
        if (t >= 1) showRelic();
        break;
      }
    }
  }

  function showRelic() {
    if (!relicPending) return;
    relicPending = false;
    options.onRelic?.();
  }

  function startNext(now: number) {
    const beat = queue.shift();
    live = beat ? { beat, started: now } : null;
    if (!live) {
      settle();
      setBusy(false);
    }
  }

  function finish() {
    if (entry && !entry.landed) options.onArrived?.();
    entry = null;
    queue = [];
    live = null;
    reset = null;
    settle();
    setBusy(false);
    render();
    showRelic();
    wake();
  }

  // -------------------------------------------------------- rendering
  let frame = 0;
  let disposed = false;
  let lastSeen = performance.now();

  function render() {
    if (disposed) return;
    placeCamera();
    rig.sync(0, reduced);
    renderer.shadowMap.needsUpdate = true;
    renderer.render(scene, camera);
  }

  const idling = () => !reduced && arrived && onScreen && !disposed && !document.hidden
    && (motion > 0 || performance.now() - lastEvent <= REST_AFTER_MS);
  /* At rest, a frame every IDLE_FRAME_MS, woken by a timer rather than every screen refresh. */
  let restTimer = 0;
  function restSoon() {
    if (restTimer || frame || disposed) return;
    restTimer = window.setTimeout(() => {
      restTimer = 0;
      if (!frame && !disposed && !document.hidden) frame = requestAnimationFrame(tick);
    }, IDLE_FRAME_MS);
  }
  /* Something happened: the gate moves again, if it had come to rest. */
  function stir() {
    lastEvent = performance.now();
    wake();
  }

  function tick(now: number) {
    frame = 0;
    if (disposed || document.hidden) return;
    const active = Boolean(live || reset || entry);
    const dt = Math.min(active ? 0.05 : 0.08, (now - lastSeen) / 1000);
    lastSeen = now;
    if (entry) poseEntry(Math.max(0, (now - entry.started) / 1000));
    if (reset) {
      const t = clamp01((now - reset.started) / 1000 / RESET_S);
      poseGate(reset.from * (1 - easeInOut(t)));
      loopMaterial.opacity *= 1 - t;
      if (t >= 1) {
        reset = null;
        settle();
      }
    }
    if (live) {
      const t = clamp01((now - live.started) / 1000 / live.beat.seconds);
      animate(live.beat, t);
      if (t >= 1) startNext(now);
    }
    if (!reduced) advance(dt);
    /* Begun in play (even if it ended this frame, and settled everything): drawn in full. */
    if (active) {
      rig.sync(dt, reduced);
      placeCamera();
      renderer.shadowMap.needsUpdate = true;
      renderer.render(scene, camera);
    } else {
      /* At rest only the rings turn: their matrices, and nothing else's;
         she and her outfit hold still, and so does the camera. */
      segRing.updateMatrixWorld(true);
      bearing.updateMatrixWorld(true);
      scene.matrixWorldAutoUpdate = false;
      renderer.render(scene, camera);
      scene.matrixWorldAutoUpdate = true;
    }
    if (live || reset || entry) frame = requestAnimationFrame(tick);
    else if (idling()) restSoon();
  }

  /* The arrival, `s` seconds in (see ENTRY_S). */
  function poseEntry(s: number) {
    if (!entry) return;
    /* Starlight gathers onto the rings as they grow and turn into place. */
    poseAssembly(window01(s, 0.04, 0.5));
    for (const { sprite, from, to, delay } of motes) {
      const u = window01(s, delay, delay + 0.4);
      sprite.visible = u > 0 && u < 1;
      sprite.position.copy(from).lerp(to, easeInOut(u));
      sprite.scale.setScalar(0.1 + 0.12 * Math.sin(Math.PI * u));
      (sprite.material as THREE.SpriteMaterial).opacity = Math.sin(Math.PI * u) * 0.95;
    }
    /* The gate opens for her, and closes behind her. */
    const opening = easeOut(window01(s, 0.4, 0.56));
    const closing = easeInOut(window01(s, 0.95, ENTRY_S));
    poseGate(0.85 * opening * (1 - closing));
    /* She glides out of the surface along an arc, turning to face us. */
    const out = window01(s, 0.5, ENTRY_LAND_S);
    model.visible = out > 0;
    if (out > 0) {
      const q = easeOut(out);
      arcPoint(gateCentre.clone().add(new THREE.Vector3(0, 0, 0.08)), YUMI_AT, q, 0.55, scratch);
      const squash = s > ENTRY_LAND_S ? 0.05 * Math.sin(Math.PI * window01(s, ENTRY_LAND_S, ENTRY_S)) : 0;
      model.position.set(scratch.x, scratch.y - squash * STAND_Y, scratch.z);
      const size = SCALE * (0.12 + 0.88 * q);
      model.scale.set(size * (1 + squash * 0.5), size * (1 - squash), size * (1 + squash * 0.5));
      model.rotation.set(0, FACING - (1 - q) * 1.4, 0);
    }
    /* The track appears behind her, piece by piece, from her side. */
    const shown = window01(s, 0.62, 1.05);
    trackGroup.visible = shown > 0;
    pieces.forEach((piece, i) => { piece.mesh.visible = shown * pieces.length > i; });
    if (s >= ENTRY_LAND_S && !entry.landed) {
      entry.landed = true;
      options.onLanded?.();
      options.onArrived?.();
    }
    if (s >= ENTRY_S) {
      const landed = entry.landed;
      entry = null;
      settle();
      setBusy(false);
      if (!landed) options.onArrived?.();
    }
  }

  function wake() {
    if (disposed || document.hidden) return;
    if (restTimer) {
      window.clearTimeout(restTimer);
      restTimer = 0;
    }
    if (frame) return;
    lastSeen = performance.now();
    frame = requestAnimationFrame(tick);
  }

  // ----------------------------------------------------------- camera
  /* One three-quarter view: about 25° round to the right and 12° down. */
  const AZIMUTH = THREE.MathUtils.degToRad(25);
  const ELEVATION = THREE.MathUtils.degToRad(12);
  const VIEW = new THREE.Vector3(Math.sin(AZIMUTH) * Math.cos(ELEVATION), Math.sin(ELEVATION), Math.cos(AZIMUTH) * Math.cos(ELEVATION));
  /* Her own box at rest, with room above for a hat, and the gate's. */
  const herBox = new THREE.Box3().setFromObject(model);
  herBox.max.y += 0.35;
  herBox.min.x -= 0.1;
  const bounds = new THREE.Box3()
    .setFromObject(gate)
    .union(herBox)
    .expandByPoint(trackCurve.getPoint(0.5))
    .expandByPoint(spots[2])
    .getBoundingSphere(new THREE.Sphere());
  let distance = 10;

  function placeCamera() {
    camera.position.copy(bounds.center).addScaledVector(VIEW, distance * (1 - cameraPush));
    camera.lookAt(bounds.center);
  }

  function fit() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    const halfV = THREE.MathUtils.degToRad(camera.fov / 2);
    const halfH = Math.atan(Math.tan(halfV) * camera.aspect);
    distance = (bounds.radius * 0.97) / Math.sin(Math.min(halfV, halfH));
    camera.updateProjectionMatrix();
    render();
  }

  function showingAll<T>(work: () => T): T {
    const hidden: THREE.Object3D[] = [];
    const culled: THREE.Object3D[] = [];
    scene.traverse(object => {
      if (!object.visible) { hidden.push(object); object.visible = true; }
      if (object.frustumCulled) { culled.push(object); object.frustumCulled = false; }
    });
    try {
      return work();
    } finally {
      for (const object of hidden) object.visible = false;
      for (const object of culled) object.frustumCulled = true;
    }
  }
  let readyPromise: Promise<void> | null = null;

  const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(fit);
  observer?.observe(canvas);
  /* Back from the background: where the round is now, not what played meanwhile. */
  const onVisibility = () => {
    if (document.hidden) return;
    if (live || queue.length || reset || entry) finish();
    fit();
    stir();
  };
  canvas.addEventListener("pointerdown", stir);
  document.addEventListener("visibilitychange", onVisibility);
  /* Scrolled away, the gate stops turning; back, it goes on. */
  const sight = typeof IntersectionObserver === "undefined" ? null : new IntersectionObserver(([seen]) => {
    onScreen = seen?.isIntersecting ?? true;
    if (onScreen) stir();
  });
  sight?.observe(canvas);
  setTrack(1);
  settle();
  fit();

  return {
    ready() {
      readyPromise ??= compiling(showingAll(() => renderer.compileAsync(scene, camera)))
        .catch(() => undefined)
        .then(() => {
          if (disposed) return;
          renderer.shadowMap.needsUpdate = true;
          showingAll(() => renderer.render(scene, camera));
          render();
          readyAt = performance.now();
        });
      return readyPromise;
    },
    arrive(outfit, { instant = false } = {}) {
      if (arriving || disposed) return;
      arriving = true;
      for (const piece of rig.apply(outfit ?? {})) {
        piece.traverse(object => { if ((object as THREE.Mesh).isMesh) object.castShadow = true; });
      }
      model.visible = true;
      const compiled = compiling(renderer.compileAsync(model, camera, scene)).catch(() => undefined);
      model.visible = false;
      void compiled.then(() => {
        if (disposed) return;
        arrived = true;
        if (reduced || instant || live || reset) {
          settle();
          render();
          options.onArrived?.();
          wake();
          return;
        }
        entry = { started: Math.max(performance.now(), readyAt + ENTRY_WAIT_MS), landed: false };
        poseEntry(0);
        setBusy(true);
        render();
        wake();
      });
    },
    show(next, { reset: fresh = false } = {}) {
      lastEvent = performance.now();
      if (next.places !== trackFor) setTrack(next.places);
      rest = next;
      setRelic(next.relic);
      relicPending = false;
      /* She is still arriving: it ends where this round is. Cutting it
         short would also leave the page waiting for her to land. */
      if (entry) return;
      queue = [];
      live = null;
      const wasOpen = gateOpen;
      if (fresh && !reduced && wasOpen > 0.01) {
        /* The last word's gate closes as the empty track appears. */
        settle();
        poseGate(wasOpen);
        reset = { from: wasOpen, started: performance.now() };
        setBusy(false);
        wake();
        return;
      }
      reset = null;
      settle();
      setBusy(false);
      render();
      wake();
    },
    play(beats, next) {
      lastEvent = performance.now();
      /* A newer round while one plays: jump to where the last one ended, then on. */
      if (live || queue.length || reset || entry) {
        if (entry && !entry.landed) options.onArrived?.();
        entry = null;
        queue = [];
        live = null;
        reset = null;
        settle();
      }
      if (next.places !== trackFor) setTrack(next.places);
      rest = next;
      setRelic(next.relic);
      relicPending = beats.some(beat => beat.phase === "relic");
      if (reduced || beats.length === 0) {
        finish();
        return;
      }
      queue = [...beats];
      setBusy(true);
      startNext(performance.now());
      wake();
    },
    skip() {
      if (live || queue.length || reset || entry) finish();
    },
    wear(outfit) {
      for (const piece of rig.apply(outfit ?? {})) {
        piece.traverse(object => { if ((object as THREE.Mesh).isMesh) object.castShadow = true; });
      }
      render();
      stir();
    },
    dispose() {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      if (restTimer) window.clearTimeout(restTimer);
      canvas.removeEventListener("pointerdown", stir);
      observer?.disconnect();
      sight?.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      rig.dispose();
      setTrack(0);
      setRelic(null);
      afterCompiles(() => {
        const geometries = new Set<THREE.BufferGeometry>();
        const materials = new Set<THREE.Material>();
        scene.traverse(object => {
          const mesh = object as THREE.Mesh;
          if (!mesh.isMesh && !(object as THREE.Sprite).isSprite && !(object as THREE.Points).isPoints) return;
          if (mesh.geometry) geometries.add(mesh.geometry);
          const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          for (const material of list) if (material) materials.add(material);
        });
        geometries.forEach(geometry => geometry.dispose());
        materials.forEach(material => material.dispose());
        ticks.dispose();
        bolts.dispose();
        beads.dispose();
        lamps.dispose();
        glow.dispose();
        brushed.dispose();
        environment.dispose();
        renderer.dispose();
      });
    },
  };
}
