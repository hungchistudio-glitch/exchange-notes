import * as THREE from "three";

import type { YumiOutfit } from "@/lib/shop/catalog";
import { ARM_ROOT, EYE_REST, buildYumiActor } from "@/lib/yumi3d/actor";
import { EYE_RADIUS, SHELL_RADIUS, TUBE_RADIUS } from "@/lib/yumi3d/anatomy";
import { createOutfitRig } from "@/lib/yumi3d/outfit";
import { makeStudioEnvironment } from "@/lib/yumi3d/scene";

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

const easeOutBack = (t: number) => {
  const c = 1.6;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};
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
  const { model, yuGroup, arm, armCollar, eyeGroup, lookGroup, pupil, shellMaterial } = actor;
  model.scale.setScalar(SCALE);
  const hang = new THREE.Group();
  hang.position.y = HANG_Y - BEAM_Y;
  pivot.add(hang);
  hang.add(model);

  const armDirection = EYE_REST.clone().sub(ARM_ROOT);
  const armLength = armDirection.length();
  arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), armDirection.normalize());
  eyeGroup.position.copy(EYE_REST);
  model.traverse(object => {
    const mesh = object as THREE.Mesh;
    if (mesh.isMesh && mesh.material && (mesh.material as THREE.Material).visible !== false) mesh.castShadow = true;
  });

  const rig = createOutfitRig({ model, eyeGroup, lookGroup, pupil, shellMaterial });
  let wearing = false;

  // ---------------------------------------------------------- the pose
  /* Each piece's appearance runs from 0 (not there) to 1 (hung). */
  const pieces = { eye: 0, arm: 0, body: 0 };
  const wanted = { eye: 0, arm: 0, body: 0 };
  const startedAt = { eye: 0, arm: 0, body: 0 };
  let free = 0;
  let freeWanted = 0;
  let freeStartedAt = 0;
  let lookDown = 0;
  let lookDownWanted = 0;
  /* The swing, as a damped pendulum about the beam. */
  let angle = 0;
  let velocity = 0;
  let pendingOutfit: YumiOutfit | null = null;

  const APPEAR_MS = 520;
  const FREE_MS = 1100;

  function place(now: number) {
    for (const name of ["eye", "arm", "body"] as const) {
      if (pieces[name] !== wanted[name]) {
        pieces[name] = wanted[name] === 0 || reduced ? wanted[name] : clamp01((now - startedAt[name]) / APPEAR_MS);
      }
    }
    if (free !== freeWanted) {
      free = freeWanted === 0 || reduced ? freeWanted : clamp01((now - freeStartedAt) / FREE_MS);
    }

    const eyeShown = Math.max(pieces.eye, free);
    const armShown = Math.max(pieces.arm, free);
    const bodyShown = Math.max(pieces.body, free);
    eyeGroup.visible = eyeShown > 0;
    eyeGroup.scale.setScalar(Math.max(0.001, easeOutBack(eyeShown)));
    arm.visible = armCollar.visible = armShown > 0;
    /* The I rises from the bottom of the U up to the eye. */
    arm.scale.set(1, Math.max(0.001, armLength * easeOutBack(armShown)), 1);
    armCollar.scale.setScalar(Math.max(0.001, easeOutBack(armShown)));
    yuGroup.visible = bodyShown > 0;
    yuGroup.scale.setScalar(Math.max(0.001, easeOutBack(bodyShown)));

    /* Freed: the line lifts away first, then she turns upright and drops
       onto the stand. */
    const lift = clamp01(free / 0.35);
    const fall = clamp01((free - 0.2) / 0.8);
    line.scale.y = Math.max(0.001, fullLine * (1 - lift));
    ring.position.y = -fullLine * (1 - lift);
    ring.visible = lift < 1;
    model.rotation.z = (Math.PI / 2) * (1 - clamp01(fall * 1.6));
    hang.position.y = HANG_Y - BEAM_Y + (STAND_Y - HANG_Y) * (reduced ? fall : easeOutBounce(fall));

    if (free === 1 && pendingOutfit) {
      for (const piece of rig.apply(pendingOutfit)) piece.traverse(o => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
      wearing = true;
      pendingOutfit = null;
    }

    lookDown += (lookDownWanted - lookDown) * (reduced ? 1 : 0.08);
    lookGroup.rotation.x = lookDown * 0.55;
    pivot.rotation.z = free > 0 ? angle * (1 - free) : angle;
  }

  // -------------------------------------------------------- rendering
  let frame = 0;
  let last = performance.now();
  let disposed = false;

  function moving() {
    return pieces.eye !== wanted.eye || pieces.arm !== wanted.arm || pieces.body !== wanted.body
      || free !== freeWanted || Math.abs(lookDown - lookDownWanted) > 0.002
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
    } else {
      angle = velocity = 0;
    }
    place(now);
    rig.sync(dt, reduced);
    renderer.render(scene, camera);
    if (moving()) frame = requestAnimationFrame(tick);
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
    set({ misses, status, outfit }) {
      const now = performance.now();
      /* Won, every piece is there: whatever was not hung yet grows in as
         she drops onto the stand. */
      const shownFor = (index: number) => (status !== "playing" ? 1 : misses > index ? 1 : 0);
      (["eye", "arm", "body"] as const).forEach((name, index) => {
        const next = shownFor(index);
        if (next !== wanted[name]) {
          wanted[name] = next;
          startedAt[name] = now;
          /* A new piece on the line sets it swinging. */
          if (next === 1) velocity += 0.5 + index * 0.15;
        }
      });
      const nextFree = status === "won" ? 1 : 0;
      if (nextFree !== freeWanted) {
        freeWanted = nextFree;
        freeStartedAt = now;
      }
      if (status === "won") {
        pendingOutfit = outfit ?? {};
      } else if (wearing || pendingOutfit) {
        pendingOutfit = null;
        rig.apply({});
        wearing = false;
      }
      lookDownWanted = status === "lost" ? 1 : 0;
      if (status === "lost") velocity += 0.4;
      wake();
    },
    dispose() {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      observer?.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      rig.dispose();
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
