import * as THREE from "three";

import type { YumiOutfit } from "@/lib/shop/catalog";
import { ARM_ROOT, EYE_REST, buildYumiActor } from "@/lib/yumi3d/actor";
import { SHELL_RADIUS, TUBE_RADIUS } from "@/lib/yumi3d/anatomy";
import { createOutfitRig } from "@/lib/yumi3d/outfit";
import { makeStudioEnvironment } from "@/lib/yumi3d/scene";

import type { VaultBeat } from "./presentation";

/* =========================================================
   Wordvault's studio: the real Yumi on the path to a chest

   Hangyumi's white studio, warmed to ivory, with the same key light high
   on the right. A stone path runs from the front left back into the room
   with nine brass inlays that light as she passes them; at its end a
   lacquered chest in the shop's signboard navy, banded in brass, sits on
   a low plinth. The whole set is turned into the depth, so on a phone's
   near-square stage it fills the frame instead of lying in a thin band.

   Yumi is herself, in what she wears from the shop, from the moment she
   arrives (in Hangyumi she dresses only once freed). The set fades in
   empty; she is dressed out of sight, her pieces compiled where no one
   sees the cost, and only then drops from above onto her place on the
   path, squashes, bounces once and stands, with a ring of light where she
   landed (Chi, 2026-10-26: Hangyumi's line lowering in was smooth, and
   Wordvault flashed in with her late). That is the first deal only; the
   words after it walk her back instead. Each place a right letter
   fills moves her one hop along the path. A wrong letter sends a copy of
   part of her, in warm gold light, at the chest: her U, then her I, then
   her O. It strikes, bounces and lies on the floor until the round ends,
   when every copy comes home to her. Won, the word's letters rise, gather
   into a brass key, the key turns in the lock and the lid opens on a
   burst of light and coins.

   Built from lib/yumi3d/actor.ts like Hangyumi's, so she cannot drift from
   herself. Renders only while something moves, and not at all while the
   page is hidden.
   ========================================================= */

export type VaultScene = {
  /** How far along the path she stands, 0 to 1. */
  progress: number;
  /** Copies lying on the floor: the wrong guesses so far. */
  misses: number;
  status: "playing" | "won" | "lost";
  /** The word, for the letters that become the key. */
  answer: string;
  /** The chest this word holds: medium the fourth word in a row, premium the seventh. */
  chest?: "normal" | "medium" | "premium" | null;
};

export type WordvaultStudio = {
  /** Compiles everything on the set and draws it once; the canvas stays
      hidden until this resolves, so that cost is never a frozen frame. */
  ready(): Promise<void>;
  /** Dresses her out of sight and, once her pieces are compiled, drops her
      in (at once with `instant`, or under reduced motion). `onArrived`
      fires as she touches the stone. Only the first call does anything. */
  arrive(outfit: YumiOutfit | null, options?: { instant?: boolean }): void;
  /** Where the round stands, with no show: dealt, picked up, or skipped to. */
  show(scene: VaultScene, options?: { reset?: boolean }): void;
  /** Plays a guess's beats, ending where `scene` says. */
  play(beats: VaultBeat[], scene: VaultScene): void;
  /** Ends whatever is playing, where it would have ended. */
  skip(): void;
  wear(outfit: YumiOutfit | null): void;
  dispose(): void;
};

const BACKDROP = 0xf3efe6;
const SCALE = 0.56;
/** The set's turn: its path runs along its own x, into the room. */
const SET_TURN = 0.52;
const PATH_TOP = 0.16;
/** Upright on the path: the bottom of her C on the stone. */
const STAND_Y = PATH_TOP + (SHELL_RADIUS + TUBE_RADIUS) * SCALE;
const START_X = -3.9;
const END_X = 0.55;
const CHEST_X = 3.35;
const INLAYS = 9;
const FACING = -SET_TURN + 0.18;
/** Her C's outer radius, scaled: what a squash keeps on the stone. */
const BOTTOM = (SHELL_RADIUS + TUBE_RADIUS) * SCALE;
/** The arrival: the set's fade-in first, then the fall, then the landing. */
const ENTRY_WAIT_MS = 420;
const FALL_S = 0.62;
const LAND_S = 0.95;

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeInOut = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
const pathX = (progress: number) => START_X + (END_X - START_X) * progress;

export function createWordvaultStudio(
  canvas: HTMLCanvasElement,
  options: { reducedMotion?: boolean; onBusy?: (busy: boolean) => void; onArrived?: () => void } = {},
): WordvaultStudio | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  } catch {
    return null;
  }
  const reduced = options.reducedMotion ?? false;

  /*
   * Shaders compiled in the background, and what must wait for them.
   * three.js polls every material of a compileAsync until it is ready, and
   * one disposed under it throws from that poll (lib/yumi3d/AGENTS.md); so
   * nothing is disposed while one is in flight: a new word's letters, her
   * pieces taken off, or the whole studio on a quick way out.
   */
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

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.debug.checkShaderErrors = process.env.NODE_ENV !== "production";

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BACKDROP);
  scene.fog = new THREE.Fog(BACKDROP, 24, 44);
  const environment = makeStudioEnvironment(renderer);
  scene.environment = environment;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  /* Everything on the stage stands in the set, turned into the room. */
  const set = new THREE.Group();
  set.rotation.y = SET_TURN;
  scene.add(set);

  // ------------------------------------------------------------- light
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb8b2a6, 0.55));
  const key = new THREE.DirectionalLight(0xfff8ee, 3.2);
  key.position.set(7.5, 11, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -9, right: 9, top: 8, bottom: -6, near: 1, far: 40 });
  key.shadow.bias = -0.0008;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 3;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 1);
  rim.position.set(6, 3, -4);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0xffffff, 0.3);
  fill.position.set(-6, 2, 4);
  scene.add(fill);
  /* The chest's own glow, lit only as it opens. */
  const treasureLight = new THREE.PointLight(0xffc96b, 0, 7, 1.6);
  treasureLight.position.set(CHEST_X, 1.9, 0.4);
  set.add(treasureLight);

  // ------------------------------------------------------- materials
  const floorMaterial = new THREE.MeshStandardMaterial({ color: BACKDROP, roughness: 1, metalness: 0 });
  const stone = new THREE.MeshStandardMaterial({ color: 0xdcd5c6, metalness: 0.04, roughness: 0.6 });
  const brass = new THREE.MeshStandardMaterial({ color: 0xc9a55a, metalness: 0.85, roughness: 0.28, envMapIntensity: 1 });
  /* The shop's signboard navy, lacquered. */
  const lacquer = new THREE.MeshPhysicalMaterial({
    color: 0x1f2b40, metalness: 0.35, roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.2, envMapIntensity: 0.7,
  });
  const inside = new THREE.MeshStandardMaterial({ color: 0x3a2412, roughness: 0.9, emissive: 0xffb347, emissiveIntensity: 0 });
  /* The chest's own trim, apart from the path's brass, so a tier can gild it. */
  const trim = brass.clone();
  const lockStone = new THREE.MeshPhysicalMaterial({ color: 0xc9a55a, metalness: 0.85, roughness: 0.28 });
  const energy = new THREE.MeshStandardMaterial({
    color: 0xf3d38a, emissive: 0xe0a83c, emissiveIntensity: 0.7, metalness: 0.4, roughness: 0.25,
    transparent: true, opacity: 0.88,
  });

  const solid = <M extends THREE.Mesh>(mesh: M, parent: THREE.Object3D = scene) => {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  // ---------------------------------------------------- floor and path
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const path = solid(new THREE.Mesh(new THREE.BoxGeometry(END_X - START_X + 2.2, PATH_TOP, 1.7), stone), set);
  path.position.set((START_X + END_X) / 2 - 0.1, PATH_TOP / 2, 0);
  const inlayGeometry = new THREE.BoxGeometry(0.34, 0.02, 1.1);
  const inlays: THREE.MeshStandardMaterial[] = [];
  for (let i = 0; i < INLAYS; i++) {
    const material = brass.clone();
    material.emissive = new THREE.Color(0xffb347);
    material.emissiveIntensity = 0;
    inlays.push(material);
    const inlay = new THREE.Mesh(inlayGeometry, material);
    inlay.receiveShadow = true;
    inlay.position.set(pathX((i + 1) / (INLAYS + 1)), PATH_TOP + 0.01, 0);
    set.add(inlay);
  }

  // ------------------------------------------------------------ chest
  const plinth = solid(new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.65, 0.24, 64), stone), set);
  plinth.position.set(CHEST_X, 0.12, 0);
  const chest = new THREE.Group();
  chest.position.set(CHEST_X, 0.24, 0);
  /* Turned a little back toward her, as she comes up the path. */
  chest.rotation.y = -0.35;
  set.add(chest);
  const W = 1.9, H = 1.05, D = 1.25;
  const body = solid(new THREE.Mesh(new THREE.BoxGeometry(W, H, D), lacquer), chest);
  body.position.y = H / 2;
  const hollow = new THREE.Mesh(new THREE.BoxGeometry(W - 0.16, 0.04, D - 0.16), inside);
  hollow.position.y = H - 0.03;
  chest.add(hollow);
  for (const x of [-W / 2 + 0.22, W / 2 - 0.22]) {
    const band = solid(new THREE.Mesh(new THREE.BoxGeometry(0.12, H + 0.02, D + 0.04), trim), chest);
    band.position.set(x, H / 2, 0);
  }
  const foot = solid(new THREE.Mesh(new THREE.BoxGeometry(W + 0.06, 0.08, D + 0.06), trim), chest);
  foot.position.y = 0.04;
  /* The lid: a half barrel hinged along the back edge. */
  const hinge = new THREE.Group();
  hinge.position.set(0, H, -D / 2);
  chest.add(hinge);
  const lidGeometry = new THREE.CylinderGeometry(D / 2, D / 2, W, 40, 1, false, 0, Math.PI);
  lidGeometry.rotateZ(Math.PI / 2);
  lidGeometry.rotateX(-Math.PI / 2);
  const lid = solid(new THREE.Mesh(lidGeometry, lacquer), hinge);
  lid.position.set(0, 0, D / 2);
  for (const x of [-W / 2 + 0.22, W / 2 - 0.22]) {
    const strap = new THREE.CylinderGeometry(D / 2 + 0.02, D / 2 + 0.02, 0.12, 40, 1, false, 0, Math.PI);
    strap.rotateZ(Math.PI / 2);
    strap.rotateX(-Math.PI / 2);
    const mesh = solid(new THREE.Mesh(strap, trim), hinge);
    mesh.position.set(x, 0, D / 2);
  }
  const lockPlate = solid(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.06), lockStone), chest);
  lockPlate.position.set(0, H - 0.22, D / 2 + 0.03);
  const keyhole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 0.08, 16),
    new THREE.MeshStandardMaterial({ color: 0x0b0f17, roughness: 0.6 }),
  );
  keyhole.rotation.x = Math.PI / 2;
  keyhole.position.set(0, H - 0.18, D / 2 + 0.05);
  chest.add(keyhole);
  /* The keyhole, in the set's frame. */
  const LOCK = new THREE.Vector3(0, H - 0.18, D / 2 + 0.12).applyAxisAngle(new THREE.Vector3(0, 1, 0), chest.rotation.y)
    .add(chest.position);

  /* The premium chest's own sky: a ring of stars turning round it, and a
     pillar of light that rises as it opens. */
  const starRing = new THREE.Group();
  starRing.position.set(CHEST_X, 0.24 + H + 0.55, 0);
  set.add(starRing);
  const starMaterial = new THREE.MeshStandardMaterial({ color: 0xfff3c4, emissive: 0xffd36b, emissiveIntensity: 1.4 });
  const ringLine = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.012, 6, 96), starMaterial);
  ringLine.rotation.x = Math.PI / 2;
  starRing.add(ringLine);
  for (let i = 0; i < 9; i += 1) {
    const a = (i / 9) * Math.PI * 2;
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(i % 3 ? 0.05 : 0.08, 0), starMaterial);
    star.position.set(Math.cos(a) * 1.35, 0, Math.sin(a) * 1.35);
    starRing.add(star);
  }
  starRing.rotation.z = 0.18;
  starRing.visible = false;
  const pillarMaterial = new THREE.MeshBasicMaterial({
    color: 0xfff1c8, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, fog: false,
  });
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.95, 6, 40, 1, true), pillarMaterial);
  pillar.position.set(CHEST_X, 0.24 + H + 3, 0);
  pillar.visible = false;
  set.add(pillar);

  /* Each tier of chest in its own materials (Chi, 2026-10-26: "材質與光效
     逐級升級"): the signboard's navy lacquer and brass; white porcelain
     with gilt and a jade lock; obsidian strewn with stars, veined in gold. */
  const starfield = (() => {
    const paper = document.createElement("canvas");
    paper.width = paper.height = 256;
    const ink = paper.getContext("2d");
    if (ink) {
      ink.fillStyle = "#0b0b16";
      ink.fillRect(0, 0, 256, 256);
      let seed = 3301;
      const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      for (let i = 0; i < 160; i += 1) {
        ink.fillStyle = `rgba(${rand() > 0.7 ? "255,214,130" : "220,226,255"},${0.4 + rand() * 0.6})`;
        ink.fillRect(rand() * 256, rand() * 256, 1 + rand() * 1.6, 1 + rand() * 1.6);
      }
      ink.strokeStyle = "rgba(227,194,124,0.75)";
      ink.lineWidth = 1.4;
      for (let k = 0; k < 4; k += 1) {
        ink.beginPath();
        let x = rand() * 256;
        ink.moveTo(x, 0);
        for (let y = 0; y < 256; y += 24) { x += (rand() - 0.5) * 50; ink.lineTo(x, y); }
        ink.stroke();
      }
    }
    const texture = new THREE.CanvasTexture(paper);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  })();
  let tier: "normal" | "medium" | "premium" = "normal";
  function dress(next: "normal" | "medium" | "premium") {
    tier = next;
    if (next === "medium") {
      lacquer.color.set(0xf6f2ea);
      lacquer.map = null;
      lacquer.metalness = 0.05;
      lacquer.roughness = 0.18;
      lacquer.clearcoat = 1;
      lacquer.emissive.set(0x000000);
      trim.color.set(0xf0c35a);
      trim.emissive.set(0xa06a10);
      trim.emissiveIntensity = 0.25;
      lockStone.color.set(0x3fae86);
      lockStone.metalness = 0.1;
      lockStone.roughness = 0.2;
      lockStone.clearcoat = 1;
    } else if (next === "premium") {
      lacquer.color.set(0xffffff);
      lacquer.map = starfield;
      lacquer.metalness = 0.45;
      lacquer.roughness = 0.14;
      lacquer.clearcoat = 1;
      lacquer.emissive.set(0x1a1230);
      lacquer.emissiveIntensity = 0.5;
      trim.color.set(0xf3d38a);
      trim.emissive.set(0xe0a030);
      trim.emissiveIntensity = 0.55;
      lockStone.color.set(0x7b5cff);
      lockStone.metalness = 0.2;
      lockStone.roughness = 0.15;
      lockStone.clearcoat = 1;
    } else {
      lacquer.color.set(0x1f2b40);
      lacquer.map = null;
      lacquer.metalness = 0.35;
      lacquer.roughness = 0.32;
      lacquer.clearcoat = 0.7;
      lacquer.emissive.set(0x000000);
      trim.color.set(0xc9a55a);
      trim.emissive.set(0x000000);
      trim.emissiveIntensity = 0;
      lockStone.color.set(0xc9a55a);
      lockStone.metalness = 0.85;
      lockStone.roughness = 0.28;
      lockStone.clearcoat = 0;
    }
    lacquer.needsUpdate = true;
    starRing.visible = next === "premium";
    inside.emissive.set(next === "premium" ? 0xb9a3ff : 0xffb347);
    treasureLight.color.set(next === "premium" ? 0xe8dcff : 0xffc96b);
  }

  /* Coins that leap out as it opens. */
  const coinGeometry = new THREE.CylinderGeometry(0.16, 0.16, 0.045, 28);
  const coins = Array.from({ length: 9 }, (_, i) => {
    const coin = solid(new THREE.Mesh(coinGeometry, brass), set);
    coin.visible = false;
    const angle = (i / 9) * Math.PI * 2;
    return { coin, dx: Math.cos(angle) * (0.5 + (i % 3) * 0.25), dz: Math.sin(angle) * 0.45 + 0.35, rise: 1.5 + (i % 4) * 0.3 };
  });

  // ------------------------------------------------------------ Yumi
  const actor = buildYumiActor();
  const { model, yuGroup, arm, armCollar, eyeGroup, lookGroup, pupil, shellMaterial } = actor;
  model.scale.setScalar(SCALE);
  model.position.set(START_X, STAND_Y, 0);
  /* She faces us, a little toward the chest, however the set is turned. */
  model.rotation.y = FACING;
  /* Not here until she arrives. */
  model.visible = false;
  set.add(model);
  /* Her arm from the C's spine to the eye, as she stands at rest. */
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

  // -------------------------------------------------- the energy copies
  /* Her U, I and O, in light: the same shapes, never her own parts. */
  const copies = [yuGroup, arm, eyeGroup].map((part, index) => {
    const group = new THREE.Group();
    const clone = part.clone(true);
    clone.position.set(0, 0, 0);
    clone.quaternion.identity();
    clone.rotation.set(0, 0, 0);
    if (index === 1) clone.scale.set(1, 1.7, 1);
    else clone.scale.setScalar(1);
    if (index === 1) clone.position.y = -0.85;
    clone.traverse(object => {
      const mesh = object as THREE.Mesh;
      if (!mesh.isMesh) return;
      const hidden = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).every(m => m.visible === false);
      mesh.visible = !hidden;
      mesh.material = energy;
      mesh.castShadow = true;
    });
    group.add(clone);
    group.scale.setScalar(index === 0 ? SCALE * 0.55 : SCALE * 0.75);
    group.visible = false;
    set.add(group);
    return group;
  });
  /* Where each lies after striking the chest. */
  const landings = [
    new THREE.Vector3(CHEST_X - 1.55, 0.36, 1.15),
    new THREE.Vector3(CHEST_X - 0.95, 0.12, 1.55),
    new THREE.Vector3(CHEST_X - 2.05, 0.34, 1.45),
  ];

  // ------------------------------------------------------- the key
  const keyGroup = new THREE.Group();
  keyGroup.visible = false;
  set.add(keyGroup);
  const bow = solid(new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 12, 36), brass), keyGroup);
  bow.position.y = 0.42;
  const shaft = solid(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 12), brass), keyGroup);
  shaft.position.y = -0.04;
  for (let i = 0; i < 2; i++) {
    const tooth = solid(new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.07), brass), keyGroup);
    tooth.position.set(0.08, -0.24 - i * 0.13, 0);
  }
  const KEY_AT = new THREE.Vector3(CHEST_X - 0.9, 2.7, 0.9);
  const KEY_SIZE = 1.7;
  set.updateMatrixWorld(true);
  /* The letters fly in the world, facing us; where the key forms, there. */
  const keyWorld = set.localToWorld(KEY_AT.clone());
  const glyphHome = set.localToWorld(new THREE.Vector3(-0.6, 1.2, 2.4));

  /* The word's letters, which rise and become the key. */
  const glyphs: { mesh: THREE.Mesh; texture: THREE.CanvasTexture; material: THREE.MeshBasicMaterial }[] = [];
  const glyphGeometry = new THREE.PlaneGeometry(0.5, 0.5);
  function setGlyphs(answer: string) {
    const old = glyphs.splice(0);
    for (const glyph of old) scene.remove(glyph.mesh);
    afterCompiles(() => {
      for (const glyph of old) {
        glyph.texture.dispose();
        glyph.material.dispose();
      }
    });
    for (const char of Array.from(answer).filter(c => c.trim()).slice(0, 18)) {
      const paper = document.createElement("canvas");
      paper.width = paper.height = 128;
      const ink = paper.getContext("2d");
      if (!ink) continue;
      ink.fillStyle = "#b8883a";
      ink.font = "600 86px Georgia, 'Noto Serif TC', serif";
      ink.textAlign = "center";
      ink.textBaseline = "middle";
      ink.fillText(char, 64, 68);
      const texture = new THREE.CanvasTexture(paper);
      texture.colorSpace = THREE.SRGBColorSpace;
      const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, fog: false });
      const mesh = new THREE.Mesh(glyphGeometry, material);
      mesh.visible = false;
      scene.add(mesh);
      glyphs.push({ mesh, texture, material });
    }
  }

  // --------------------------------------------------- the landing ring
  /* Where she lands on arrival: a ring of brass light that widens and goes. */
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0xd9b468, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, fog: false,
  });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.42, 48), ringMaterial);
  ring.rotation.x = -Math.PI / 2;
  ring.visible = false;
  set.add(ring);
  /* And round the chest's plinth when it changes for the next word. */
  const chestRingMaterial = ringMaterial.clone();
  const chestRing = new THREE.Mesh(ring.geometry, chestRingMaterial);
  chestRing.rotation.x = -Math.PI / 2;
  chestRing.position.set(CHEST_X, 0.25, 0);
  chestRing.visible = false;
  set.add(chestRing);

  // ------------------------------------------------------------ state
  /* What the scene shows when nothing plays. */
  let rest: VaultScene = { progress: 0, misses: 0, status: "playing", answer: "" };
  let at = 0;
  let lidOpen = 0;
  type Live = { beat: VaultBeat; from: number; started: number };
  let queue: VaultBeat[] = [];
  let live: Live | null = null;
  /* Between words: the lid closes and she walks back. */
  let reset: { from: number; lid: number; started: number } | null = null;
  let busy = false;
  /* Her arrival: asked for, then here; and the fall while it plays. */
  let arriving = false;
  let arrived = false;
  let entry: { started: number; landed: boolean } | null = null;
  let readyAt = 0;
  /* The chest changing for the next word, and whether it has changed yet. */
  let swap: { started: number; to: VaultScene["chest"] & string; dressed: boolean } | null = null;
  const SWAP_MS = 460;

  function setBusy(next: boolean) {
    if (busy === next) return;
    busy = next;
    options.onBusy?.(next);
  }

  function light(progressAt: number) {
    inlays.forEach((material, i) => {
      const here = (i + 1) / (INLAYS + 1);
      material.emissiveIntensity = progressAt + 1e-6 >= here ? 0.55 : 0;
    });
  }

  function poseYumi(x: number, hop = 0, lean = 0) {
    model.position.set(x, STAND_Y + hop, 0);
    model.rotation.z = lean;
  }

  /*
   * The arrival, `s` seconds in. She falls as things fall, slowly first
   * and then fast, turning the last of a half turn into place; touches the
   * stone squashed, springs back through a damped wobble with one small
   * bounce, and stands. Squashed, she is shifted down by what the squash
   * took off her height, so the bottom of her C never leaves the stone.
   */
  function poseEntry(s: number) {
    const x = pathX(at);
    if (s < FALL_S) {
      const q = Math.max(0, s) / FALL_S;
      model.scale.setScalar(SCALE);
      model.rotation.y = FACING + (1 - q) ** 2 * 1.6;
      poseYumi(x, DROP * (1 - q * q));
      return;
    }
    const u = s - FALL_S;
    const squash = 0.24 * Math.exp(-7 * u) * Math.cos(17 * u);
    const hop = u > 0.08 && u < 0.38 ? Math.sin(Math.PI * (u - 0.08) / 0.3) * 0.2 : 0;
    model.scale.set(SCALE * (1 + squash * 0.5), SCALE * (1 - squash), SCALE * (1 + squash * 0.5));
    model.rotation.y = FACING;
    poseYumi(x, hop - BOTTOM * squash);
    const r = clamp01(u / 0.6);
    ring.visible = r < 1;
    ring.position.set(x, PATH_TOP + 0.012, 0);
    ring.scale.setScalar(1 + easeOut(r) * 2.6);
    ringMaterial.opacity = 0.7 * (1 - r);
  }

  /* The arrival, over: she stands where the round says. */
  function endEntry() {
    if (!entry) return;
    const landed = entry.landed;
    entry = null;
    ring.visible = false;
    if (!landed) options.onArrived?.();
  }

  function poseChest(open: number) {
    hinge.rotation.x = -1.95 * open;
    inside.emissiveIntensity = 1.2 * open;
    treasureLight.intensity = (tier === "premium" ? 14 : tier === "medium" ? 11 : 9) * open;
    pillar.visible = tier === "premium" && open > 0.01;
    pillarMaterial.opacity = tier === "premium" ? 0.32 * open : 0;
  }

  /*
   * The chest the next word holds. Once she is here, a change is not a cut
   * from one chest to another (Chi, 2026-10-26: "箱蓋闔上時閃光變身"): the
   * closed chest swells a little, light rings out round its plinth, and at
   * the top of the swell it is the other chest.
   */
  function retier(next: "normal" | "medium" | "premium") {
    if (swap?.to === next) return;
    if (next === tier && !swap) return;
    if (!arrived || reduced || disposed) {
      swap = null;
      dress(next);
      return;
    }
    swap = { started: performance.now(), to: next, dressed: false };
    wake();
  }

  function poseSwap(now: number) {
    if (!swap) return;
    const u = clamp01((now - swap.started) / SWAP_MS);
    if (u >= 0.4 && !swap.dressed) {
      swap.dressed = true;
      dress(swap.to);
      poseChest(lidOpen);
    }
    chest.scale.setScalar(1 + 0.12 * Math.sin(Math.PI * u) * (1 - 0.4 * u));
    chestRing.visible = u < 1;
    chestRing.scale.setScalar(4.2 + easeOut(u) * 3.2);
    chestRingMaterial.opacity = 0.65 * (1 - u);
    treasureLight.intensity = Math.max(treasureLight.intensity, 9 * Math.sin(Math.PI * u));
    if (u >= 1) {
      swap = null;
      chest.scale.setScalar(1);
      poseChest(lidOpen);
    }
  }

  /** The scene as `rest` says, with nothing in flight. */
  function settle() {
    retier(rest.chest ?? "normal");
    at = rest.progress;
    lidOpen = rest.status === "won" ? 1 : 0;
    model.visible = arrived;
    model.scale.setScalar(SCALE);
    model.rotation.y = FACING;
    poseYumi(pathX(at));
    light(at);
    poseChest(lidOpen);
    copies.forEach((copy, i) => {
      copy.visible = rest.status === "playing" && i < rest.misses;
      copy.position.copy(landings[i]);
      copy.rotation.set(0, i * 0.7, Math.PI / 2 * (i === 1 ? 1 : 0));
      /* Their size too: coming home shrinks them, and a round picked up
         with copies already out would show them shrunk. */
      copy.scale.setScalar(i === 0 ? SCALE * 0.55 : SCALE * 0.75);
    });
    keyGroup.visible = false;
    glyphs.forEach(glyph => { glyph.mesh.visible = false; });
    coins.forEach(({ coin }, i) => {
      coin.visible = rest.status === "won";
      coin.position.set(CHEST_X - 0.5 + (i % 5) * 0.25, 0.24 + H + 0.03 + Math.floor(i / 5) * 0.05, -0.15 + (i % 2) * 0.25);
      coin.rotation.set(0, i, 0);
    });
  }

  const scratch = new THREE.Vector3();

  function animate(beat: VaultBeat, from: number, t: number) {
    switch (beat.phase) {
      case "step": {
        const q = easeInOut(t);
        at = from + (beat.progress - from) * q;
        poseYumi(pathX(at), Math.sin(t * Math.PI) * 0.32, -Math.sin(t * Math.PI) * 0.08);
        light(at);
        break;
      }
      case "projectile": {
        const i = beat.piece ?? 0;
        const copy = copies[i];
        copy.visible = true;
        const start = scratch.set(model.position.x + 0.3, STAND_Y + 0.4, 0.2);
        const impact = new THREE.Vector3(CHEST_X - W / 2 - 0.05, 0.24 + H * 0.6, 0.45);
        if (t < 0.5) {
          const u = t / 0.5;
          copy.position.copy(start).lerp(impact, u);
          copy.position.y += Math.sin(u * Math.PI) * 1.6;
          copy.scale.setScalar((i === 0 ? SCALE * 0.55 : SCALE * 0.75) * (0.4 + 0.6 * clamp01(u * 3)));
        } else {
          const u = (t - 0.5) / 0.5;
          copy.position.copy(impact).lerp(landings[i], easeOut(u));
          copy.position.y += Math.abs(Math.sin(u * Math.PI * 2)) * 0.5 * (1 - u);
        }
        copy.rotation.set(t * 7, t * 9 + i * 0.7, t * 4);
        /* The chest takes the blow. */
        chest.rotation.z = t > 0.5 ? Math.sin((t - 0.5) * 38) * (1 - t) * 0.1 : 0;
        poseYumi(pathX(at), 0, t < 0.25 ? -Math.sin((t / 0.25) * Math.PI) * 0.12 : 0);
        break;
      }
      case "restore": {
        const q = easeInOut(t);
        copies.forEach((copy, i) => {
          if (i >= rest.misses) return;
          const home = scratch.set(model.position.x, STAND_Y + 0.3, 0);
          copy.position.copy(landings[i]).lerp(home, q);
          copy.position.y += Math.sin(t * Math.PI) * 1.3;
          copy.rotation.y += 0.08;
          copy.scale.setScalar((i === 0 ? SCALE * 0.55 : SCALE * 0.75) * (1 - 0.85 * q));
          copy.visible = t < 0.97;
        });
        if (t > 0.85) poseYumi(pathX(at), Math.sin(((t - 0.85) / 0.15) * Math.PI) * 0.12);
        break;
      }
      case "key": {
        const gather = clamp01(t / 0.7);
        const across = scratch.set(1, 0, 0).applyQuaternion(camera.quaternion);
        glyphs.forEach((glyph, i) => {
          const spread = (i - (glyphs.length - 1) / 2) * 0.5;
          const startPos = glyphHome.clone().addScaledVector(across, spread);
          glyph.mesh.visible = gather < 1;
          glyph.mesh.position.copy(startPos).lerp(keyWorld, easeInOut(clamp01(gather * 1.15 - i * 0.02)));
          glyph.mesh.position.y += Math.sin(gather * Math.PI) * 0.6;
          glyph.mesh.scale.setScalar(1 - 0.75 * easeInOut(gather));
          glyph.mesh.quaternion.copy(camera.quaternion);
          glyph.material.opacity = 1 - clamp01((gather - 0.8) / 0.2);
        });
        const grow = clamp01((t - 0.55) / 0.3);
        keyGroup.visible = grow > 0;
        keyGroup.position.copy(KEY_AT);
        keyGroup.rotation.set(0, t * Math.PI * 3, 0);
        keyGroup.scale.setScalar(Math.max(0.001, KEY_SIZE * easeOut(grow)));
        break;
      }
      case "unlock": {
        const travel = easeInOut(clamp01(t / 0.45));
        const turn = clamp01((t - 0.45) / 0.15);
        keyGroup.visible = t < 0.72;
        keyGroup.position.copy(KEY_AT).lerp(LOCK, travel);
        keyGroup.rotation.set(Math.PI / 2 * travel, 0, -turn * Math.PI / 2);
        keyGroup.scale.setScalar(KEY_SIZE * (1 - 0.45 * travel));
        lidOpen = easeOut(clamp01((t - 0.6) / 0.4));
        poseChest(lidOpen);
        coins.forEach(({ coin, dx, dz, rise }) => {
          const u = clamp01((t - 0.65) / 0.35);
          coin.visible = u > 0;
          coin.position.set(CHEST_X + dx * u, 0.24 + H + rise * Math.sin(u * Math.PI * 0.85), dz * u);
          coin.rotation.set(u * 9, u * 5, 0);
        });
        break;
      }
      case "celebrate": {
        poseYumi(pathX(at), Math.abs(Math.sin(t * Math.PI * 2)) * 0.35, Math.sin(t * Math.PI * 2) * 0.06);
        coins.forEach(({ coin, dx, dz }, i) => {
          coin.position.set(CHEST_X + dx, 0.06 + 0.03 * (i % 3), dz + 0.2);
          coin.rotation.set(Math.PI / 2 * (1 - easeOut(t)) + (i % 2) * 0.2, i, 0);
        });
        break;
      }
      case "recover": {
        poseYumi(pathX(at), Math.sin(t * Math.PI) * 0.22, Math.sin(t * Math.PI * 3) * 0.05 * (1 - t));
        break;
      }
    }
  }

  function startNext(now: number) {
    const beat = queue.shift();
    live = beat ? { beat, from: at, started: now } : null;
    if (!live) {
      settle();
      setBusy(false);
    }
  }

  function finish() {
    endEntry();
    queue = [];
    live = null;
    reset = null;
    settle();
    setBusy(false);
    render();
    wake();
  }

  // -------------------------------------------------------- rendering
  let frame = 0;
  let last = performance.now();
  let disposed = false;

  function render() {
    if (disposed) return;
    rig.sync(0, reduced);
    renderer.render(scene, camera);
  }

  function tick(now: number) {
    frame = 0;
    if (disposed || document.hidden) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (reset) {
      const t = clamp01((now - reset.started) / 700);
      const q = easeInOut(t);
      at = reset.from * (1 - q);
      poseYumi(pathX(at), Math.abs(Math.sin(t * Math.PI * 3)) * 0.12 * (1 - t));
      light(at);
      lidOpen = reset.lid * (1 - q);
      poseChest(lidOpen);
      if (t >= 1) {
        reset = null;
        settle();
      }
    }
    if (live) {
      const t = clamp01((now - live.started) / 1000 / live.beat.seconds);
      animate(live.beat, live.from, t);
      if (t >= 1) {
        at = live.beat.progress;
        startNext(now);
      }
    }
    if (entry) {
      const s = (now - entry.started) / 1000;
      poseEntry(s);
      if (s >= FALL_S && !entry.landed) {
        entry.landed = true;
        options.onArrived?.();
      }
      if (s >= FALL_S + LAND_S) {
        endEntry();
        settle();
      }
    }
    poseSwap(now);
    if (starRing.visible) starRing.rotation.y += dt * 0.6;
    rig.sync(dt, reduced);
    renderer.render(scene, camera);
    /* The premium chest's stars keep turning while it waits. */
    if (live || reset || entry || swap || (starRing.visible && !reduced)) frame = requestAnimationFrame(tick);
  }

  function wake() {
    if (disposed || frame || document.hidden) return;
    last = performance.now();
    frame = requestAnimationFrame(tick);
  }

  function fit() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    /* Far enough to keep the path, the chest and the key in frame, however narrow. */
    const halfV = THREE.MathUtils.degToRad(camera.fov / 2);
    const halfH = Math.atan(Math.tan(halfV) * camera.aspect);
    /* The sphere overstates a long, low set; 0.8 of it keeps the margins even. */
    const distance = (bounds.radius * 0.8) / Math.sin(Math.min(halfV, halfH));
    camera.position.copy(bounds.center).addScaledVector(VIEW, distance);
    camera.lookAt(bounds.center);
    camera.updateProjectionMatrix();
    render();
  }

  /* What the camera frames: the path, the chest and the air the key forms in. */
  const bounds = new THREE.Box3().setFromObject(set).expandByPoint(keyWorld).getBoundingSphere(new THREE.Sphere());
  /* A little low, so the set sits under the notes laid over the top of the stage. */
  bounds.center.y -= 0.2;
  const VIEW = new THREE.Vector3(0.12, 0.42, 1).normalize();
  /* Where she falls from: above the top of the frame, however it is fitted. */
  const DROP = bounds.radius * 1.5;

  /* Every object on the set, shown for a moment, so one hidden now (the
     key, the coins, the premium stars, her pieces) is compiled and
     uploaded with the rest instead of on its own first frame. */
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
  const onVisibility = () => { if (!document.hidden) { fit(); wake(); } };
  document.addEventListener("visibilitychange", onVisibility);
  settle();
  fit();

  return {
    ready() {
      readyPromise ??= compiling(showingAll(() => renderer.compileAsync(scene, camera)))
        .catch(() => undefined)
        .then(() => {
          if (disposed) return;
          /* The first draw is where buffers and textures go up and the
             driver finishes linking: drawn once with everything, unseen. */
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
      /* Dressed above the frame, where compiling her costs nothing seen. */
      model.visible = true;
      poseYumi(pathX(at), DROP);
      const compiled = compiling(renderer.compileAsync(model, camera, scene)).catch(() => undefined);
      model.visible = false;
      void compiled.then(() => {
        if (disposed) return;
        showingAll(() => renderer.render(scene, camera));
        arrived = true;
        if (reduced || instant || live || reset) {
          settle();
          render();
          options.onArrived?.();
          return;
        }
        model.visible = true;
        poseEntry(0);
        render();
        entry = { started: Math.max(performance.now(), readyAt + ENTRY_WAIT_MS), landed: false };
        wake();
      });
    },
    show(next, { reset: walkBack = false } = {}) {
      endEntry();
      queue = [];
      live = null;
      const before = at;
      const lid = lidOpen;
      rest = next;
      setGlyphs(next.answer);
      if (walkBack && !reduced && (before > 0.01 || lid > 0.01) && next.progress === 0) {
        /* Copies and coins of the last word go; she walks back as the lid closes. */
        copies.forEach(copy => { copy.visible = false; });
        coins.forEach(({ coin }) => { coin.visible = false; });
        keyGroup.visible = false;
        reset = { from: before, lid, started: performance.now() };
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
      endEntry();
      rest = next;
      if (next.answer) setGlyphs(next.answer);
      if (reduced || beats.length === 0) {
        finish();
        return;
      }
      reset = null;
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
    },
    dispose() {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      observer?.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      rig.dispose();
      setGlyphs("");
      afterCompiles(() => {
        glyphGeometry.dispose();
        const geometries = new Set<THREE.BufferGeometry>();
        const materials = new Set<THREE.Material>();
        scene.traverse(object => {
          const mesh = object as THREE.Mesh;
          if (!mesh.isMesh) return;
          geometries.add(mesh.geometry);
          for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) materials.add(material);
        });
        geometries.forEach(geometry => geometry.dispose());
        materials.forEach(material => material.dispose());
        environment.dispose();
        renderer.dispose();
      });
    },
  };
}
