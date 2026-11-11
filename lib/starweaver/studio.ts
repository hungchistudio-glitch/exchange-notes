import * as THREE from "three";

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
   front left; a star gate stands back right: two incomplete rings of satin
   titanium (champagne by day, graphite in Cosmic) on three slender legs,
   round a clear lens, and a low ice-cyan light that only says where it is.
   A seamless room, warm white by day and obsidian in Cosmic; the key light
   high on the right, so her contact shadow falls back and left. The camera
   holds one three-quarter view (about 25° round, 12° down); in a voyage it
   leans in a few percent, and under reduced motion not at all.

   The word is the track: one piece of light for each place to guess, from
   above her shoulder to the lens. A right letter flies up as a small flake
   of light and becomes its pieces (all of a batch at once). A wrong one
   sends an energy copy of her U, I or O, in ice light, to an orbit outside
   the gate; she stays whole. The end of a round brings every copy home. A
   won word closes the track in a ring round the lens, the rings turn true,
   the gate opens, and she sails through it and back; a seventh brings a
   relic back with her, under a quiet light.

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
};

const SCALE = 0.5;
/** Upright on the floor: the bottom of her C on it. */
const STAND_Y = (SHELL_RADIUS + TUBE_RADIUS) * SCALE;
const YUMI_AT = new THREE.Vector3(-1.6, STAND_Y, 0.55);
/** Turned a little towards the gate and the camera. */
const FACING = 0.32;
const GATE_AT = new THREE.Vector3(1.45, 1.62, -1.25);
const GATE_TURN = -0.42;
const OUTER_R = 1.02;
const INNER_R = 0.79;
const LENS_R = 0.24;
/** Where U, I and O wait: three orbits outside the gate, in its own plane. */
const ORBITS: readonly { radius: number; angle: number }[] = [
  { radius: 1.3, angle: THREE.MathUtils.degToRad(150) },
  { radius: 1.52, angle: THREE.MathUtils.degToRad(32) },
  { radius: 1.74, angle: THREE.MathUtils.degToRad(208) },
];
/** The first arrival, soft: 450–650 ms (DESIGN.md §3). */
const ENTRY_S = 0.56;
const ENTRY_DROP = 0.55;
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
  const titanium = new THREE.MeshStandardMaterial({
    color: cosmic ? 0x3d4047 : 0xd8cfbc, metalness: 0.88, roughness: cosmic ? 0.34 : 0.3, envMapIntensity: cosmic ? 1.1 : 0.95,
  });
  const titaniumDark = new THREE.MeshStandardMaterial({
    color: cosmic ? 0x2a2c31 : 0xbdb3a0, metalness: 0.85, roughness: 0.38, envMapIntensity: 0.9,
  });
  /* The lens: clear-coated, a little cold, never a refraction pass. */
  const lensMaterial = new THREE.MeshPhysicalMaterial({
    color: cosmic ? 0x9fc6cd : 0xe9f4f6, metalness: 0.1, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.05,
    emissive: ICE, emissiveIntensity: cosmic ? 0.18 : 0.08, envMapIntensity: 1.2,
  });
  const seamMaterial = new THREE.MeshBasicMaterial({ color: ICE, transparent: true, opacity: cosmic ? 0.55 : 0.35, fog: false });
  const loopMaterial = new THREE.MeshBasicMaterial({ color: ICE, transparent: true, opacity: 0, depthWrite: false, fog: false });
  /* Added light reads as light only on a dark room; on warm white it turns
     to flat white paper. By day the glows are tinted and laid over. */
  const glowBlending = cosmic ? THREE.AdditiveBlending : THREE.NormalBlending;
  const portalMaterial = new THREE.MeshBasicMaterial({
    transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, fog: false, blending: glowBlending,
  });
  const energy = new THREE.MeshStandardMaterial({
    color: cosmic ? 0xc8eef4 : 0x8fd3df, emissive: ICE, emissiveIntensity: cosmic ? 0.9 : 0.75, metalness: 0.2, roughness: 0.25,
    transparent: true, opacity: cosmic ? 0.62 : 0.8, depthWrite: false,
  });
  const glow = glowTexture();
  const flakeMaterial = new THREE.SpriteMaterial({
    map: glow, color: cosmic ? 0xd6f0f5 : 0x5fbccc, transparent: true, depthWrite: false, blending: glowBlending, fog: false,
  });

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
  const gate = new THREE.Group();
  gate.position.copy(GATE_AT);
  gate.rotation.y = GATE_TURN;
  scene.add(gate);
  /* Two rings, each open on a different side, so the gate reads as unfinished until a word closes it. */
  const outer = solid(new THREE.Mesh(new THREE.TorusGeometry(OUTER_R, 0.048, 14, 120, Math.PI * 1.62), titanium), gate);
  const inner = solid(new THREE.Mesh(new THREE.TorusGeometry(INNER_R, 0.032, 12, 100, Math.PI * 1.48), titaniumDark), gate);
  const OUTER_REST = 0.9;
  const INNER_REST = 2.6;
  outer.rotation.z = OUTER_REST;
  inner.rotation.z = INNER_REST;
  /* A hairline seam of ice on the outer ring's inner edge. */
  const seam = new THREE.Mesh(new THREE.TorusGeometry(OUTER_R - 0.05, 0.006, 6, 120, Math.PI * 1.62), seamMaterial);
  outer.add(seam);
  const lens = solid(new THREE.Mesh(new THREE.SphereGeometry(LENS_R, 40, 24), lensMaterial), gate);
  lens.scale.set(1, 1, 0.38);
  /* The lens's bezel. */
  solid(new THREE.Mesh(new THREE.TorusGeometry(LENS_R + 0.02, 0.022, 10, 64), titanium), gate);
  /* Three legs, from the floor to just under the outer ring. */
  const legs: THREE.Mesh[] = [];
  const legGeometry = new THREE.CylinderGeometry(0.022, 0.03, 1, 10);
  const apex = new THREE.Vector3(0, -OUTER_R - 0.04, 0);
  for (const foot of [new THREE.Vector3(-0.62, -GATE_AT.y, 0.32), new THREE.Vector3(0.62, -GATE_AT.y, 0.32), new THREE.Vector3(0, -GATE_AT.y, -0.62)]) {
    const leg = solid(new THREE.Mesh(legGeometry, titaniumDark), gate);
    const along = apex.clone().sub(foot);
    leg.position.copy(foot).addScaledVector(along, 0.5);
    leg.scale.set(1, along.length(), 1);
    leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), along.normalize());
    legs.push(leg);
  }
  /* The finished word's loop round the lens, and the open gate's light. */
  const loop = new THREE.Mesh(new THREE.TorusGeometry(LENS_R + 0.11, 0.012, 8, 96), loopMaterial);
  gate.add(loop);
  const fullRing = new THREE.Mesh(new THREE.TorusGeometry(OUTER_R, 0.012, 8, 160), loopMaterial.clone());
  gate.add(fullRing);
  const portalTexture = (() => {
    const paper = document.createElement("canvas");
    paper.width = paper.height = 256;
    const ink = paper.getContext("2d")!;
    const gradient = ink.createRadialGradient(128, 128, 8, 128, 128, 128);
    if (cosmic) {
      gradient.addColorStop(0, "rgba(240,252,255,0.95)");
      gradient.addColorStop(0.35, "rgba(159,219,230,0.55)");
      gradient.addColorStop(0.75, "rgba(124,150,230,0.18)");
      gradient.addColorStop(1, "rgba(124,196,209,0)");
    } else {
      /* By day: clear water lit from within, cyan at the heart, violet at the rim. */
      gradient.addColorStop(0, "rgba(232,248,251,0.9)");
      gradient.addColorStop(0.3, "rgba(150,214,226,0.75)");
      gradient.addColorStop(0.72, "rgba(140,150,226,0.32)");
      gradient.addColorStop(1, "rgba(124,196,209,0)");
    }
    ink.fillStyle = gradient;
    ink.fillRect(0, 0, 256, 256);
    const texture = new THREE.CanvasTexture(paper);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  })();
  portalMaterial.map = portalTexture;
  const portal = new THREE.Mesh(new THREE.CircleGeometry(INNER_R - 0.02, 64), portalMaterial);
  portal.position.z = 0.01;
  portal.visible = false;
  gate.add(portal);

  /* Where things go in the gate's plane, in the world. */
  function gatePoint(radius: number, angle: number, out = new THREE.Vector3()) {
    out.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.05);
    gate.updateMatrixWorld();
    return out.applyMatrix4(gate.matrixWorld);
  }
  scene.updateMatrixWorld(true);
  const gateCentre = gatePoint(0, 0);

  // ------------------------------------------------------------ track
  /* From above her shoulder, up and over, to the lens. */
  const trackCurve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(YUMI_AT.x + 0.7, YUMI_AT.y + 0.95, YUMI_AT.z + 0.05),
    new THREE.Vector3(0.05, 3.25, 0.15),
    gateCentre.clone().add(new THREE.Vector3(-0.16, 0, 0.18)),
  );
  type Piece = { mesh: THREE.Mesh; material: THREE.MeshStandardMaterial; level: number; middle: THREE.Vector3 };
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
    for (const piece of old) trackGroup.remove(piece.mesh);
    afterCompiles(() => {
      for (const piece of old) {
        piece.mesh.geometry.dispose();
        piece.material.dispose();
      }
    });
    const n = count <= 0 ? 0 : Math.min(24, count);
    const gap = 0.012;
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
      pieces.push({ mesh, material, level: 0, middle: trackCurve.getPoint((start + end) / 2) });
    }
  }

  /* A piece of track at `level`, 0 dim to 1 lit. By day the light needs
     colour as well as glow to stand out from the room. */
  const litColor = new THREE.Color(cosmic ? 0x7cc4d1 : 0x2f9fb4);
  function lightPiece(piece: Piece, level: number) {
    piece.level = level;
    piece.material.emissiveIntensity = (cosmic ? 1.6 : 0.85) * level;
    piece.material.color.copy(dimColor).lerp(litColor, level);
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
  let entry: { started: number } | null = null;
  let cameraPush = 0;

  function setBusy(next: boolean) {
    if (busy === next) return;
    busy = next;
    options.onBusy?.(next);
  }

  function poseGate(open: number) {
    gateOpen = open;
    const q = easeInOut(open);
    outer.rotation.z = OUTER_REST + q * 1.25;
    inner.rotation.z = INNER_REST - q * 1.6;
    (fullRing.material as THREE.MeshBasicMaterial).opacity = 0.85 * q;
    portal.visible = q > 0.01;
    portalMaterial.opacity = 0.75 * q;
    portal.scale.setScalar(0.4 + 0.6 * q);
    lensMaterial.emissiveIntensity = (cosmic ? 0.18 : 0.08) + q * 1.2;
    gateLight.intensity = (cosmic ? 1.2 : 0.6) + q * (cosmic ? 5 : 4);
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
    pieces.forEach((piece, i) => lightPiece(piece, won || lit.has(i) ? 1 : 0));
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
        /* In: along an arc into the lens, smaller as she goes. */
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
        /* The portal flares while she is through it. */
        portalMaterial.opacity = 0.75 + 0.25 * Math.sin(Math.PI * window01(t, 0.48, 0.68));
        cameraPush = reduced ? 0 : 0.035 * Math.sin(Math.PI * t);
        if (t >= 1) {
          model.position.copy(YUMI_AT);
          model.scale.setScalar(SCALE);
          model.rotation.set(0, FACING, 0);
        }
        break;
      }
      case "relic": {
        relic.visible = true;
        cone.visible = true;
        const q = easeOut(t);
        arcPoint(gateCentre, RELIC_AT, q, 0.35, relic.position);
        relic.scale.setScalar(0.3 + 0.7 * q);
        relic.rotation.y = q * Math.PI * 1.5;
        coneMaterial.opacity = (cosmic ? 0.5 : 0.55) * easeInOut(window01(t, 0.35, 1));
        break;
      }
    }
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
    entry = null;
    queue = [];
    live = null;
    reset = null;
    settle();
    setBusy(false);
    render();
  }

  // -------------------------------------------------------- rendering
  let frame = 0;
  let disposed = false;
  let lastSeen = performance.now();

  function render() {
    if (disposed) return;
    placeCamera();
    rig.sync(0, reduced);
    renderer.render(scene, camera);
  }

  function tick(now: number) {
    frame = 0;
    if (disposed || document.hidden) return;
    const dt = Math.min(0.05, (now - lastSeen) / 1000);
    lastSeen = now;
    if (entry) {
      const t = clamp01((now - entry.started) / 1000 / ENTRY_S);
      const q = easeOut(t);
      const squash = t > 0.7 ? 0.06 * Math.sin(Math.PI * window01(t, 0.7, 1)) : 0;
      model.position.set(YUMI_AT.x, YUMI_AT.y + ENTRY_DROP * (1 - q) - squash * STAND_Y, YUMI_AT.z);
      model.scale.set(SCALE * (1 + squash * 0.5), SCALE * (1 - squash), SCALE * (1 + squash * 0.5));
      model.rotation.set(0, FACING + (1 - q) * 0.6, 0);
      if (t >= 1) {
        entry = null;
        settle();
        options.onArrived?.();
      }
    }
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
    rig.sync(dt, reduced);
    placeCamera();
    renderer.render(scene, camera);
    if (live || reset || entry) frame = requestAnimationFrame(tick);
  }

  function wake() {
    if (disposed || frame || document.hidden) return;
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
  };
  document.addEventListener("visibilitychange", onVisibility);
  setTrack(1);
  settle();
  fit();

  return {
    ready() {
      readyPromise ??= compiling(showingAll(() => renderer.compileAsync(scene, camera)))
        .catch(() => undefined)
        .then(() => {
          if (disposed) return;
          showingAll(() => renderer.render(scene, camera));
          render();
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
          return;
        }
        model.visible = true;
        entry = { started: performance.now() };
        wake();
      });
    },
    show(next, { reset: fresh = false } = {}) {
      entry = null;
      queue = [];
      live = null;
      const wasOpen = gateOpen;
      if (next.places !== trackFor) setTrack(next.places);
      rest = next;
      setRelic(next.relic);
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
    },
    play(beats, next) {
      /* A newer round while one plays: jump to where the last one ended, then on. */
      if (live || queue.length || reset || entry) {
        entry = null;
        queue = [];
        live = null;
        reset = null;
        settle();
      }
      if (next.places !== trackFor) setTrack(next.places);
      rest = next;
      setRelic(next.relic);
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
      const landing = entry !== null;
      if (live || queue.length || reset || entry) finish();
      if (landing) options.onArrived?.();
    },
    wear(outfit) {
      for (const piece of rig.apply(outfit ?? {})) {
        piece.traverse(object => { if ((object as THREE.Mesh).isMesh) object.castShadow = true; });
      }
      render();
    },
    dispose() {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      observer?.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      rig.dispose();
      setTrack(0);
      setRelic(null);
      afterCompiles(() => {
        const geometries = new Set<THREE.BufferGeometry>();
        const materials = new Set<THREE.Material>();
        scene.traverse(object => {
          const mesh = object as THREE.Mesh;
          if (!mesh.isMesh && !(object as THREE.Sprite).isSprite) return;
          if (mesh.geometry) geometries.add(mesh.geometry);
          const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          for (const material of list) if (material) materials.add(material);
        });
        geometries.forEach(geometry => geometry.dispose());
        materials.forEach(material => material.dispose());
        glow.dispose();
        portalTexture.dispose();
        environment.dispose();
        renderer.dispose();
      });
    },
  };
}
