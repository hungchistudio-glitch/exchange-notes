import * as THREE from "three";
import { MeshSurfaceSampler } from "three/addons/math/MeshSurfaceSampler.js";

import type { YumiOutfit } from "@/lib/shop/catalog";
import { ARM_ROOT, EYE_REST, buildYumiActor } from "@/lib/yumi3d/actor";
import { EYE_RADIUS, SHELL_RADIUS, TUBE_RADIUS } from "@/lib/yumi3d/anatomy";
import { createOutfitRig } from "@/lib/yumi3d/outfit";
import { makeStudioEnvironment } from "@/lib/yumi3d/scene";

import { createGrains, type Grain } from "./particles";

/* =========================================================
   Hangyumi's studio: the real Yumi on a gallows

   A white studio lit from the right, with one strong key light whose
   shadow falls long across the floor. The gallows is drawn in Yumi's own
   materials: her lacquered black for the post and beam, her sage seams at
   the joints, her silver for the line.

   She hangs turned a quarter, so her C opens upward and reads as the
   three letters of her name: each wrong guess hangs one of them on the
   line, her eye (O), then her arm (I), then her body (U). Three, and the
   round is lost. Finish the word and the line lifts away: she turns back
   into her C, drops onto the stand, and only then puts on what the reader
   has bought in the shop (Chi: "完成時才穿上").

   Each finished round leaves the studio its own way when the next word is
   dealt (Chi, 2026-10-26). Lost, she is taken by the wind: a front sweeps
   across her from the left, and everything it passes turns to sand that
   lifts away and pales like a soul. Won, she spins faster and faster on
   her stand, shrinks to nothing and leaves a few golden glints. Then the
   empty line lowers from the beam for the next word.

   Built from lib/yumi3d/actor.ts, the same parts the home stage moves, so
   she cannot drift from herself. Renders only while something moves, and
   not at all while the page is hidden.
   ========================================================= */

export type StudioPose = {
  misses: number;
  status: "playing" | "won" | "lost";
  /** Put on only once the word is won. */
  outfit?: YumiOutfit | null;
};

export type HangyumiStudio = {
  set(pose: StudioPose): void;
  dispose(): void;
};

const BACKDROP = 0xf7f6f2;
const BEAM_Y = 7.3;
const HANG_Y = 3.7;
const SCALE = 0.95;
const BASE_TOP = 0.22;
/** Upright on the stand: the bottom of her C on its top. */
const STAND_Y = BASE_TOP + (SHELL_RADIUS + TUBE_RADIUS) * SCALE;
const EYE_TOP = HANG_Y + (EYE_REST.x + EYE_RADIUS) * SCALE;

const easeOutBounce = (t: number) => {
  if (t < 1 / 2.75) return 7.5625 * t * t;
  if (t < 2 / 2.75) return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
  if (t < 2.5 / 2.75) return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
  return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
};
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

export function createHangyumiStudio(canvas: HTMLCanvasElement, options: { reducedMotion?: boolean } = {}): HangyumiStudio | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  } catch {
    return null;
  }
  const reduced = options.reducedMotion ?? false;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  /* The wind's front: clips her away from the left as she turns to sand. */
  renderer.localClippingEnabled = true;
  renderer.debug.checkShaderErrors = process.env.NODE_ENV !== "production";

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BACKDROP);
  /* The floor fades into the backdrop instead of meeting it at a line. */
  scene.fog = new THREE.Fog(BACKDROP, 26, 48);
  const environment = makeStudioEnvironment(renderer);
  scene.environment = environment;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const target = new THREE.Vector3(-0.35, 3.75, 0);

  // ------------------------------------------------------------- light
  scene.add(new THREE.HemisphereLight(0xffffff, 0xb8b2a6, 0.5));
  /* The key: high on the right, throwing her shadow long to the left. */
  const key = new THREE.DirectionalLight(0xffffff, 3.3);
  key.position.set(7.5, 11, 5.5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -9, right: 9, top: 10, bottom: -6, near: 1, far: 40 });
  key.shadow.bias = -0.0008;
  key.shadow.normalBias = 0.02;
  key.shadow.radius = 3;
  scene.add(key);
  /* The highlight down her right side. */
  const rim = new THREE.DirectionalLight(0xffffff, 1.1);
  rim.position.set(6, 3, -4);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0xffffff, 0.3);
  fill.position.set(-6, 2, 4);
  scene.add(fill);

  // ------------------------------------------------------- the studio
  const floorMaterial = new THREE.MeshStandardMaterial({ color: BACKDROP, roughness: 1, metalness: 0 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  /* Her own lacquer, her silver and her sage, for the gallows. */
  const lacquer = new THREE.MeshPhysicalMaterial({
    color: 0x040507, metalness: 0.5, roughness: 0.34, envMapIntensity: 0.5, clearcoat: 0.6, clearcoatRoughness: 0.25,
  });
  const silver = new THREE.MeshStandardMaterial({ color: 0x8d9399, metalness: 0.95, roughness: 0.23, envMapIntensity: 0.95 });
  const sage = new THREE.MeshStandardMaterial({ color: 0x8fa79a, metalness: 0.35, roughness: 0.3 });
  /* The stand: warm stone a shade darker than the floor, so it reads on white. */
  const stone = new THREE.MeshStandardMaterial({ color: 0xd6d1c6, metalness: 0.04, roughness: 0.55 });

  const solid = (mesh: THREE.Mesh) => {
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  };

  const base = solid(new THREE.Mesh(new THREE.CylinderGeometry(2.45, 2.6, BASE_TOP, 72), stone));
  base.position.y = BASE_TOP / 2;
  const baseRim = solid(new THREE.Mesh(new THREE.TorusGeometry(2.45, 0.035, 10, 96), silver));
  baseRim.rotation.x = Math.PI / 2;
  baseRim.position.y = BASE_TOP;

  const POST_X = -3.05;
  const TUBE = 0.15;
  const post = solid(new THREE.Mesh(new THREE.CylinderGeometry(TUBE, TUBE, BEAM_Y - BASE_TOP, 32), lacquer));
  post.position.set(POST_X, BASE_TOP + (BEAM_Y - BASE_TOP) / 2, 0);
  const beam = solid(new THREE.Mesh(new THREE.CylinderGeometry(TUBE, TUBE, -POST_X + 0.35, 32), lacquer));
  beam.rotation.z = Math.PI / 2;
  beam.position.set((POST_X + 0.35) / 2, BEAM_Y, 0);
  /* A brace across the corner, the way her arm crosses her C. */
  const braceLength = Math.hypot(1.5, 1.5);
  const brace = solid(new THREE.Mesh(new THREE.CylinderGeometry(TUBE * 0.7, TUBE * 0.7, braceLength, 24), lacquer));
  brace.position.set(POST_X + 0.75, BEAM_Y - 0.75, 0);
  brace.rotation.z = -Math.PI / 4;
  for (const [x, y, r, material] of [
    [POST_X, BEAM_Y, TUBE * 1.25, lacquer],
    [0.35, BEAM_Y, TUBE * 1.05, lacquer],
    [POST_X, BEAM_Y, TUBE * 0.62, sage],
    [POST_X + 1.5, BEAM_Y, TUBE * 0.55, sage],
    [POST_X, BEAM_Y - 1.5, TUBE * 0.55, sage],
    [POST_X, BASE_TOP, TUBE * 1.6, silver],
  ] as const) {
    const joint = solid(new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), material));
    joint.position.set(x, y, material === sage ? TUBE * 0.9 : 0);
  }

  /* Everything that swings hangs from this pivot, at the beam. */
  const pivot = new THREE.Group();
  pivot.position.set(0, BEAM_Y, 0.05 * SCALE);
  scene.add(pivot);

  const lineGeometry = new THREE.CylinderGeometry(0.022, 0.022, 1, 12);
  lineGeometry.translate(0, -0.5, 0);
  const line = new THREE.Mesh(lineGeometry, silver);
  line.castShadow = true;
  pivot.add(line);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.022, 10, 28), silver);
  ring.castShadow = true;
  pivot.add(ring);
  const fullLine = BEAM_Y - EYE_TOP;

  // ------------------------------------------------------------ Yumi
  const actor = buildYumiActor();
  const { model, yuGroup, arm, armCollar, eyeGroup, blinkPivot, lookGroup, pupil, shellMaterial, eyeMaterial } = actor;
  model.scale.setScalar(SCALE);
  const hang = new THREE.Group();
  hang.position.y = HANG_Y - BEAM_Y;
  pivot.add(hang);
  hang.add(model);
  model.traverse(object => {
    const mesh = object as THREE.Mesh;
    if (mesh.isMesh && mesh.material && (mesh.material as THREE.Material).visible !== false) mesh.castShadow = true;
  });

  const rig = createOutfitRig({ model, eyeGroup, lookGroup, pupil, shellMaterial });
  let wearing = false;

  /* Every material of hers carries the clipping plane from the start, set
     far away, so the dissolve never recompiles a shader mid-animation. */
  const NO_CLIP = 1e4;
  const front = new THREE.Plane(new THREE.Vector3(1, 0, 0), NO_CLIP);
  model.traverse(object => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
      material.clippingPlanes = [front];
      material.clipShadows = true;
    }
  });
  const grains = createGrains(3200);
  scene.add(grains.points);

  // ---------------------------------------------------------- the pose
  /*
   * Every piece moves on a spring rather than along a fixed curve, so it
   * carries momentum: it overshoots, the line takes its weight, and it
   * settles. Under-damped (ζ ≈ 0.5) for the drops, which is what makes
   * them land rather than arrive.
   *
   * Her own frame while she hangs: turned a quarter, so her local +x is
   * up. The eye slides down the line from the beam like a bead; the neck
   * (her arm) grows down from it; the body rises into place beneath and
   * turns to face us.
   */
  type Spring = { x: number; v: number; to: number; k: number; c: number };
  const spring = (k: number, c: number): Spring => ({ x: 0, v: 0, to: 0, k, c });
  const eyeIn = spring(62, 8.5);
  const neckIn = spring(95, 10);
  const bodyIn = spring(55, 7.2);
  /* The eye's bob when the neck catches it, and the line's yank on the third miss. */
  const bob = spring(140, 9);
  const tug = spring(320, 15);
  /* The empty line lowering from the beam for a new word. */
  const lineIn = spring(70, 8.5);
  /* On arrival the empty line lowers from the beam too. */
  lineIn.x = reduced ? 1 : 0;
  lineIn.to = 1;
  const springs = [eyeIn, neckIn, bodyIn, bob, tug, lineIn];
  const settled = (s: Spring) => Math.abs(s.x - s.to) < 0.0008 && Math.abs(s.v) < 0.0008;
  const snap = (s: Spring, to: number) => { s.x = s.to = to; s.v = 0; };
  function stepSprings(dt: number) {
    /* Small steps, so a stiff spring stays stable on a slow frame. */
    for (let left = dt; left > 0; left -= 1 / 240) {
      const h = Math.min(left, 1 / 240);
      for (const s of springs) {
        s.v += (-s.k * (s.x - s.to) - s.c * s.v) * h;
        s.x += s.v * h;
      }
    }
  }

  let free = 0;
  let freeWanted = 0;
  let freeStartedAt = 0;
  let blinkAt = -1e9;
  let eyeLanded = false;
  let neckLanded = false;
  /* When the third piece was hung: the struggle runs from here. */
  let lostAt: number | null = null;
  /* How many pieces the last pose had: a jump of more than one is a resume. */
  let lastHung = 0;
  /* The swing, as a damped pendulum about the beam. */
  let angle = 0;
  let velocity = 0;
  let pendingOutfit: YumiOutfit | null = null;

  /* Leaving a finished round: which way, and since when. While it runs the
     new round's pose waits in pendingPose. */
  let exit: { kind: "sand" | "spin"; at: number; grainsAt: number; burst: boolean } | null = null;
  let pendingPose: StudioPose | null = null;
  let lastStatus: StudioPose["status"] = "playing";
  const SAND_SWEEP = 1.1;
  const SPIN_MS = 820;
  const GRIT = new THREE.Color(0x3b3f45);
  const MIST = new THREE.Color(0xc7d0d6);
  const GOLD = [new THREE.Color(0xe0a82e), new THREE.Color(0xc98a1c), new THREE.Color(0xf2c14e)];
  const WHITE = new THREE.Color(0xffffff);
  /* The grains outlive the leaving: the next word's line lowers while
     the last of them are still drifting. */
  let grainsActive = false;
  let sandLeft = 0;
  let sandRight = 1;

  const FREE_MS = 1300;
  /* Two whole turns while she falls, and the moment in them she is dressed. */
  const TRANSFORM_TURN = Math.PI * 4;
  const DRESS_AT = Math.PI * 2.5;
  const BLINK_MS = 190;
  /* The struggle starts once the body has landed, and is over by this. */
  const STRUGGLE_DELAY = 0.45;
  const DEATH_SECONDS = 3.4;
  const UP_LOCAL = new THREE.Vector3(1, 0, 0);
  const Y_AXIS = new THREE.Vector3(0, 1, 0);
  const Z_AXIS = new THREE.Vector3(0, 0, 1);
  const NECK_REST = ARM_ROOT.clone().sub(EYE_REST);
  const BODY_FROM_EYE = EYE_REST.clone().negate();
  const eyeColour = eyeMaterial.color.clone();
  const deadEye = new THREE.Color(0xa7a49b);
  const scratch = { eye: new THREE.Vector3(), root: new THREE.Vector3(), rel: new THREE.Vector3(), dir: new THREE.Vector3() };

  const smoothstep = (a: number, b: number, t: number) => {
    const x = clamp01((t - a) / (b - a));
    return x * x * (3 - 2 * x);
  };
  const burst = (t: number, at: number, height: number) => height * Math.exp(-((t - at) ** 2) / (2 * 0.2 ** 2));

  /** The struggle at time t (seconds since it began): how hard, and where. */
  function struggle(t: number) {
    if (lostAt === null || t <= 0) return { kick: 0, env: 0, closed: 0 };
    if (reduced) return { kick: 0, env: 0, closed: 1 };
    /* Three bursts, each weaker: fighting the line, then running out. */
    const env = burst(t, 0.3, 1) + burst(t, 0.9, 0.72) + burst(t, 1.45, 0.42);
    const kick = env * (0.42 * Math.sin(t * Math.PI * 2 * 3.1) + 0.17 * Math.sin(t * Math.PI * 2 * 7.3 + 1.1));
    const closed = smoothstep(1.75, 2.55, t);
    return { kick, env, closed };
  }

  function place(now: number) {
    if (free !== freeWanted) {
      free = freeWanted === 0 || reduced ? freeWanted : clamp01((now - freeStartedAt) / FREE_MS);
    }
    const t = lostAt === null ? 0 : (now - lostAt) / 1000 - STRUGGLE_DELAY;
    const lineLift = clamp01(free / 0.35);
    const fall = clamp01((free - 0.2) / 0.8);
    const { kick, env, closed } = struggle(t);

    // The eye, sliding down the line from the beam, spinning to face us.
    const eyeShown = Math.max(eyeIn.x, free);
    const lift = (1 - eyeIn.x) * (fullLine / SCALE) * (1 - free) + bob.x;
    const eyePos = scratch.eye.copy(EYE_REST).addScaledVector(UP_LOCAL, lift);
    eyeGroup.visible = eyeShown > 0.002;
    eyeGroup.position.copy(eyePos);
    eyeGroup.scale.setScalar(Math.max(0.001, 0.35 + 0.65 * clamp01(eyeShown * 1.35)));
    eyeGroup.rotation.x = (1 - clamp01(eyeShown)) * 2.6;
    if (!eyeLanded && eyeIn.to === 1 && eyeIn.x > 0.97) {
      eyeLanded = true;
      blinkAt = now;
      velocity += 0.35;
    }

    // The neck: grows down from the eye to where the body will hang it.
    const neckShown = Math.max(neckIn.x, free);
    const bodyAngle = kick + closed * 0.2;
    const rel = scratch.rel.copy(NECK_REST).applyAxisAngle(Z_AXIS, bodyAngle * 0.85);
    const root = scratch.root.copy(eyePos).addScaledVector(rel, Math.max(0, neckShown));
    const toEye = scratch.dir.copy(eyePos).sub(root);
    const neckLength = toEye.length();
    arm.visible = armCollar.visible = neckShown > 0.002;
    arm.position.copy(root);
    if (neckLength > 1e-4) arm.quaternion.setFromUnitVectors(Y_AXIS, toEye.multiplyScalar(1 / neckLength));
    arm.scale.set(1, Math.max(0.001, neckLength), 1);
    armCollar.position.copy(root);
    armCollar.scale.setScalar(Math.max(0.001, clamp01(neckShown * 1.2)));
    if (!neckLanded && neckIn.to === 1 && neckIn.x > 0.95) {
      neckLanded = true;
      /* The neck catches the eye: it dips, and the line answers. */
      bob.v -= 1.6;
      velocity -= 0.3;
    }

    // The body: rises into place beneath, turning like a coin, and swings
    // about the eye when she kicks.
    const bodyShown = Math.max(bodyIn.x, free);
    yuGroup.visible = bodyShown > 0.002;
    yuGroup.rotation.set((1 - clamp01(bodyShown)) * 2.4, 0, bodyAngle);
    yuGroup.position.copy(BODY_FROM_EYE).applyAxisAngle(Z_AXIS, bodyAngle).add(eyePos)
      .addScaledVector(UP_LOCAL, -(1 - bodyShown) * 1.8);
    yuGroup.scale.setScalar(Math.max(0.001, 0.55 + 0.45 * bodyShown));

    // The eye while she fights: wide, darting; then it closes. She hangs
    // turned a quarter, so the screen's vertical is her local x: a blink
    // squashes x, a glance sideways turns about x, looking down about y.
    const blink = Math.sin(Math.PI * clamp01((now - blinkAt) / BLINK_MS));
    const wide = 1 + 0.14 * env;
    const upright = clamp01(fall * 1.6);
    const lid = (1 - 0.85 * blink) * (1 - 0.9 * closed);
    blinkPivot.scale.set(wide * (1 - (1 - lid) * (1 - upright)), wide * (1 - (1 - lid) * upright), wide);
    lookGroup.rotation.x = env * 0.55 * Math.sin(t * Math.PI * 2 * 4.6);
    lookGroup.rotation.y = env * 0.3 * Math.sin(t * Math.PI * 2 * 3.3) - closed * 0.55;
    eyeMaterial.color.copy(eyeColour).lerp(deadEye, closed * 0.8);

    /* Freed: the line lifts away first, then she turns upright and drops
       onto the stand. */
    const stretch = eyeShown > 0.002 ? Math.max(0, -lift * SCALE) : 0;
    const lineLength = (fullLine + stretch - tug.x) * (1 - lineLift) * Math.max(0, lineIn.x);
    line.scale.y = Math.max(0.001, lineLength);
    ring.position.y = -lineLength;
    ring.visible = lineLift < 1 && eyeIn.x < 0.5 && lineIn.x > 0.02;
    model.rotation.z = (Math.PI / 2) * (1 - clamp01(fall * 1.6));
    hang.position.y = HANG_Y - BEAM_Y + tug.x + (STAND_Y - HANG_Y) * (reduced ? fall : easeOutBounce(fall));

    // Leaving after a win: faster and faster, smaller and smaller, gone.
    let size = 1;
    model.rotation.y = 0;
    if (free > 0 && !reduced && !exit) {
      /* Freed, she turns as she falls (Chi: "一邊落下一邊旋轉"): two turns,
         fast at first, settling to face us as she lands. */
      model.rotation.y = TRANSFORM_TURN * (1 - (1 - fall) ** 3);
    }
    /* She changes into her own clothes edge-on in the second turn, where
       the change cannot be seen happening, with a burst of gold; without
       motion, simply once she is down. */
    if (pendingOutfit && (free === 1 || (!reduced && free > 0 && model.rotation.y >= DRESS_AT))) {
      for (const piece of rig.apply(pendingOutfit)) piece.traverse(o => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
      wearing = true;
      pendingOutfit = null;
      if (!reduced && free < 1) {
        grains.load(glints());
        grainsAt = now;
        grainsActive = true;
      }
    }
    if (exit?.kind === "spin") {
      const p = clamp01((now - exit.at) / SPIN_MS);
      model.rotation.y = p ** 3 * Math.PI * 6;
      size = (1 + 0.1 * Math.sin(p * Math.PI)) * (1 - p ** 4);
      hang.position.y += p ** 2 * 0.7;
    }
    model.scale.setScalar(SCALE * Math.max(0.001, size));
    // Leaving after a loss: the wind's front, from the left.
    front.constant = exit?.kind === "sand"
      ? -(sandLeft - 0.1 + (sandRight - sandLeft + 0.2) * clamp01((now - exit.at) / 1000 / SAND_SWEEP))
      : NO_CLIP;


    /* Her kicks shake the whole line, a little. */
    const jolt = env * 0.045 * Math.sin(t * Math.PI * 2 * 8.7);
    pivot.rotation.z = (free > 0 ? angle * (1 - free) : angle) + jolt;
  }

  // -------------------------------------------------------- rendering
  let frame = 0;
  let last = performance.now();
  let disposed = false;

  function moving(now: number) {
    return exit !== null || grainsActive || springs.some(s => !settled(s)) || free !== freeWanted
      || now - blinkAt < BLINK_MS
      || (lostAt !== null && (now - lostAt) / 1000 < STRUGGLE_DELAY + DEATH_SECONDS)
      || Math.abs(angle) > 0.0004 || Math.abs(velocity) > 0.0004;
  }

  function tick(now: number) {
    frame = 0;
    if (disposed || document.hidden) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!reduced) {
      velocity += (-9 * angle - 1.1 * velocity) * dt;
      angle += velocity * dt;
      stepSprings(dt);
    } else {
      angle = velocity = 0;
      for (const s of springs) snap(s, s.to);
    }
    place(now);
    rig.sync(dt, reduced);
    if (exit) runExit(now);
    runGrains(now);
    renderer.render(scene, camera);
    if (moving(now)) frame = requestAnimationFrame(tick);
  }

  // ------------------------------------------------------------ leaving
  const scratchScale = new THREE.Vector3();
  const scratchPoint = new THREE.Vector3();
  const bufferSize = new THREE.Vector2();
  const random = (from: number, to: number) => from + Math.random() * (to - from);
  const showing = (object: THREE.Object3D | null): boolean => !object || (object.visible && showing(object.parent));

  /** Her surface, as sand: grains spread by area, each letting go as the front reaches it. */
  function sandFromHer(): Grain[] {
    scene.updateMatrixWorld(true);
    const parts: { mesh: THREE.Mesh; sampler: MeshSurfaceSampler; area: number }[] = [];
    model.traverse(object => {
      const mesh = object as THREE.Mesh;
      const material = mesh.material as THREE.Material | undefined;
      if (!mesh.isMesh || !material || material.visible === false || !showing(mesh)) return;
      const sampler = new MeshSurfaceSampler(mesh).build();
      const cumulative = sampler.distribution;
      mesh.getWorldScale(scratchScale);
      const stretch = (scratchScale.x * scratchScale.y + scratchScale.y * scratchScale.z + scratchScale.x * scratchScale.z) / 3;
      parts.push({ mesh, sampler, area: (cumulative ? cumulative[cumulative.length - 1] : 0) * stretch });
    });
    const total = parts.reduce((sum, part) => sum + part.area, 0) || 1;
    const placed: { at: THREE.Vector3; colour: THREE.Color }[] = [];
    for (const { mesh, sampler, area } of parts) {
      const count = Math.max(24, Math.round(2900 * (area / total)));
      const material = mesh.material as THREE.MeshStandardMaterial;
      const colour = material.color ? material.color.clone() : WHITE.clone();
      for (let i = 0; i < count; i++) {
        sampler.sample(scratchPoint);
        placed.push({ at: scratchPoint.clone().applyMatrix4(mesh.matrixWorld), colour });
      }
    }
    sandLeft = Math.min(...placed.map(grain => grain.at.x));
    sandRight = Math.max(...placed.map(grain => grain.at.x));
    const span = sandRight - sandLeft + 0.2;
    return placed.map(({ at, colour }) => ({
      at,
      velocity: new THREE.Vector3(random(0.45, 1.4), random(0.15, 0.95), random(-0.5, 0.5)),
      acceleration: new THREE.Vector3(1.5, 0.85, 0),
      release: SAND_SWEEP * ((at.x - sandLeft + 0.1) / span) + random(0, 0.06),
      life: random(1.3, 2.3),
      size: random(0.05, 0.12),
      from: colour.clone().lerp(GRIT, 0.3),
      to: MIST,
      drift: 0.55,
    }));
  }

  /** A burst of golden glints where she was. */
  function glints(): Grain[] {
    model.getWorldPosition(scratchPoint);
    return Array.from({ length: 90 }, () => {
      const angle = random(0, Math.PI * 2);
      const speed = random(1.6, 3.4);
      return {
        at: scratchPoint.clone(),
        velocity: new THREE.Vector3(Math.cos(angle) * speed, Math.sin(angle) * speed + 0.6, random(-1, 1)),
        acceleration: new THREE.Vector3(0, -1.2, 0),
        release: random(0, 0.08),
        life: random(0.6, 1.1),
        size: random(0.1, 0.2),
        from: GOLD[Math.floor(Math.random() * GOLD.length)],
        to: WHITE,
        drift: 0.12,
      };
    });
  }

  function pixelScale() {
    renderer.getDrawingBufferSize(bufferSize);
    return bufferSize.y / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
  }

  let grainsAt = 0;

  function startExit(kind: "sand" | "spin", now: number) {
    exit = { kind, at: now, grainsAt: now, burst: false };
    if (kind === "sand") {
      grains.load(sandFromHer());
      grainsAt = now;
      grainsActive = true;
      /* The empty line is drawn up with the wind. */
      lineIn.to = 0;
    }
  }

  function runGrains(now: number) {
    if (grainsActive) grainsActive = grains.update((now - grainsAt) / 1000, pixelScale());
  }

  function runExit(now: number) {
    if (!exit) return;
    if (exit.kind === "spin" && !exit.burst && now - exit.at > SPIN_MS * 0.78) {
      exit.burst = true;
      grains.load(glints());
      grainsAt = now;
      grainsActive = true;
    }
    const done = exit.kind === "sand"
      ? (now - exit.at) / 1000 > SAND_SWEEP + 0.35
      : now - exit.at >= SPIN_MS + 120;
    if (done) finishExit();
  }

  /** The studio as a new round finds it: an empty line, lowering in. */
  function clearRound() {
    for (const s of [eyeIn, neckIn, bodyIn, bob, tug]) snap(s, 0);
    eyeLanded = neckLanded = false;
    lostAt = null;
    lastHung = 0;
    free = freeWanted = 0;
    if (wearing || pendingOutfit) rig.apply({});
    wearing = false;
    pendingOutfit = null;
  }

  function finishExit() {
    exit = null;
    front.constant = NO_CLIP;
    clearRound();
    lineIn.x = 0;
    lineIn.v = 0;
    lineIn.to = 1;
    const pose = pendingPose;
    pendingPose = null;
    if (pose) apply(pose);
  }

  function apply({ misses, status, outfit }: StudioPose) {
    const now = performance.now();
    lastStatus = status;
    /* A new round: everything off the line at once. */
    if (status === "playing" && misses === 0) clearRound();
    /* More than one piece at once means a round picked up already over
       (a reload, a second tab): it is shown as it ended, not replayed. */
    const hung = status === "lost" ? 3 : misses;
    const instant = reduced || hung - lastHung > 1;
    lastHung = status === "playing" ? misses : hung;
    /* Won, every piece is there: whatever was not hung yet grows in as
       she drops onto the stand. */
    const shown = (index: number) => (status !== "playing" || misses > index ? 1 : 0);
    [eyeIn, neckIn, bodyIn].forEach((s, index) => {
      const next = shown(index);
      if (next === s.to) return;
      if (next === 0 || instant) snap(s, next);
      else s.to = next;
      if (next === 1 && !instant) velocity += index === 2 ? 0.55 : 0.2;
    });
    if (instant) eyeLanded = neckLanded = true;
    /* Something already hangs from it: the line is there, not lowering. */
    if (hung > 0 && lineIn.to === 1 && lineIn.x < 1) snap(lineIn, 1);
    if (status === "lost" && lostAt === null) {
      if (instant) {
        lostAt = now - (STRUGGLE_DELAY + DEATH_SECONDS) * 1000;
        snap(tug, 0.32);
      } else {
        lostAt = now;
        /* The line yanks tight. */
        tug.to = 0.32;
        tug.v += 4;
      }
    } else if (status !== "lost") {
      tug.to = 0;
    }
    const nextFree = status === "won" ? 1 : 0;
    if (nextFree !== freeWanted) {
      freeWanted = nextFree;
      freeStartedAt = instant ? now - FREE_MS : now;
    }
    if (status === "won") {
      pendingOutfit = outfit ?? {};
    } else if (wearing || pendingOutfit) {
      pendingOutfit = null;
      rig.apply({});
      wearing = false;
    }
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
    /* Far enough to keep the whole gallows in frame, however narrow. */
    const halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
    const distance = Math.max(4.9 / Math.tan(halfFov), 4.4 / (Math.tan(halfFov) * camera.aspect));
    camera.position.set(target.x + distance * 0.2, target.y + distance * 0.16, distance);
    camera.lookAt(target);
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  }

  const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(fit);
  observer?.observe(canvas);
  const onVisibility = () => { if (!document.hidden) { fit(); wake(); } };
  document.addEventListener("visibilitychange", onVisibility);
  place(performance.now());
  fit();

  return {
    set(pose) {
      if (exit) {
        /* The next word while she is still leaving: it waits its turn,
           unless it is already being played, which ends the leaving now. */
        if (pose.status === "playing" && pose.misses === 0) {
          pendingPose = pose;
          return;
        }
        finishExit();
      }
      const leaving = lastStatus !== "playing" && pose.status === "playing" && pose.misses === 0;
      if (leaving && !reduced) {
        startExit(lastStatus === "lost" ? "sand" : "spin", performance.now());
        pendingPose = pose;
        lastStatus = "playing";
      } else {
        apply(pose);
      }
      wake();
    },
    dispose() {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      observer?.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      rig.dispose();
      grains.dispose();
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
    },
  };
}
