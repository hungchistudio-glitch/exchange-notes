import * as THREE from "three";

import type { YumiOutfit } from "@/lib/shop/catalog";

import {
  ARM_RADIUS, EYE_RADIUS, GAP_HALF, SHELL_DEPTH, SHELL_RADIUS, TUBE_RADIUS,
} from "./anatomy";
import { createOutfitRig } from "./outfit";
import { createYumiRotation } from "./rotation";

/* =========================================================
   Yumi, in three dimensions

   One scene, three consumers: the opening film, the Standard Mode home
   stage, and the landing hero. They differ only in which of the setters
   below they drive each frame, which is why the geometry, the materials,
   the rubber-band spring and the blink live here rather than in any of
   them.

   Nothing in this file imports React, touches the DOM beyond the canvas it
   is handed, or knows what a route is. `three` is imported statically here
   and this module is only ever reached through a dynamic import, so the
   engine stays in its own chunk and off the first load.
   ========================================================= */

const ARM_ROOT = new THREE.Vector3(-SHELL_RADIUS, 0, 0);
const EYE_REST = new THREE.Vector3(0.1, 0, 0.05);
const UP = new THREE.Vector3(0, 1, 0);
const FORWARD = new THREE.Vector3(0, 0, 1);
const REST_LENGTH = EYE_REST.clone().sub(ARM_ROOT).length();

/**
 * How far the eye can be pulled, as a multiple of the arm at rest.
 *
 * Past this the band does not stretch further — it resists. A rubber band
 * that extends without limit reads as a bug the first time somebody drags
 * to the edge of the screen and keeps going.
 */
const MAX_STRETCH = 1.85;
const MAX_PULL = REST_LENGTH * MAX_STRETCH;

/** Where the model sits when nothing is happening. */
export const MODEL_REST_Y = 0.45;

/** Critically-ish damped: it returns fast and overshoots once, barely. */
const STIFFNESS = 380;
const DAMPING = 20;

/** One frame of the opening film. Every field is 0..1 unless noted. */
export type YumiFilmFrame = {
  /** Shell/arm/seam opacity. The eye is deliberately not included. */
  actor: number;
  /** Vertical offset in world units, for the arrival's damped overshoot. */
  actorY: number;
  actorScale: number;
  /** Drives the lights and the eye's own glow. */
  light: number;
  glow: number;
  /** 0 open, 1 shut — the film's own sense, inverted from `blink` below. */
  blink: number;
  /** Null once the lockup has landed and she should hold still. */
  look: { x: number; y: number } | null;
};

export type YumiSceneOptions = {
  /** Called once the eye has been pulled past the opening threshold. */
  onPullOpen?: () => void;
  /** Called on a tap that was not a drag. */
  onTap?: () => void;
  /**
   * Called at the far end of a lunge, when the eye has reached the cookie.
   * This is the moment the bite happens; the snap back is the follow through.
   */
  onLungeArrive?: () => void;
  /** Called once the eye is home again and the band is at rest. */
  onLungeEnd?: () => void;
  /** Skips the idle blink and damps the spring hard. */
  reducedMotion?: boolean;
  /** Home: free 360-degree turns that settle into a continuous slow orbit. */
  continuousRotation?: boolean;
  /**
   * The shop's stand: every drag turns her, nothing pulls her eye, and a
   * flick comes to rest instead of settling into an orbit — she is being
   * looked at, not played with.
   */
  inspect?: boolean;
  /** Cap on device pixels per CSS pixel. The shop's large stand draws at 1.5. */
  maxPixelRatio?: number;
  /**
   * The canvas sits in the page and its caller reports size changes (by
   * resize()). Its bounds are then read on resize and on input, not on every
   * frame: a layout read per frame is a forced layout per frame whenever
   * anything else on the page has just changed.
   */
  embedded?: boolean;
  /**
   * Put her exactly where setScreenAnchor says, every frame, rather than
   * easing toward it. For a caller that already moves her on a timeline of
   * its own (the landing page's film): easing on top of eased motion leaves
   * her trailing the scenery she is meant to be part of.
   */
  exactAnchor?: boolean;
};

/** The stand's set views. */
export type YumiView = "front" | "three-quarter" | "side" | "back";

/** Where one of Yumi's two halves is, relative to where it sits in her. */
export type YumiPartPose = {
  /** World units, in the plane of the shell. */
  x: number;
  y: number;
  /** Radians, about the axis facing the camera. */
  rotation: number;
};

/**
 * YU and MI, posed apart: the landing page's origin story.
 *
 * Yumi is two things that met at exactly the right angle. YU is the shell —
 * the open C, which turned a quarter is a U — and MI is the band and the
 * eye, which stood upright is an i with its dot. Apart, each takes its own
 * pose; with both at zero they are Yumi, and the scene is exactly what it
 * is without this.
 */
export type YumiParts = { yu: YumiPartPose; mi: YumiPartPose };

export type YumiSceneHandle = {
  /** Advance the simulation and draw. Call from one rAF loop. */
  frame(nowMs: number): void;
  /**
   * Resolves once her shaders are compiled. Without it the first frame
   * compiles them all on the main thread, which on the landing page was a
   * stall of several hundred milliseconds in the middle of a scroll. Where
   * the browser can compile in parallel this does not block at all.
   */
  ready?(): Promise<void>;
  resize(): void;
  dispose(): void;

  /**
   * Hand the scene a film frame to obey, or null to return it to the live
   * interactive state. While a frame is set, pointer input is ignored.
   */
  setFilm(frame: YumiFilmFrame | null): void;

  /** 0 .. 1. Lifts and shrinks her so a panel can have the lower half. */
  setFocusLevel(level: number): void;

  /** Ease automatic rotation to rest during search, navigation or a sheet. */
  setRotationPaused?(paused: boolean): void;
  /**
   * Change the lighting without rebuilding the model or its orientation.
   * `immediate` lands it on this frame: a home taking her over behind the
   * mode veil must not be seen re-lighting her once the veil lifts.
   */
  setCosmicLevel?(level: number, immediate?: boolean): void;
  /** A cached scene has moved between viewport and deck coordinates. */
  resetScreenAnchor?(): void;

  /**
   * Put her at a point on screen, at a given on-screen radius.
   *
   * The canvas is one fixed full-viewport surface and she is placed within
   * it, rather than living in a canvas of her own inside the page. That is
   * what lets her sit small in the home stage, scroll with it, and then fly
   * out to the middle of the viewport at full size for the ring without a
   * second WebGL context or a handoff between two of her.
   *
   * Both values are CSS pixels relative to the canvas. `radiusPx` is the
   * radius of the shell, so the caller sizes her the way it would size an
   * avatar, with no knowledge of the camera.
   */
  setScreenAnchor(xPx: number, yPx: number, radiusPx: number): void;

  /** A gentle look toward a cookie, independent of the eye-pull gesture. */
  setGaze?(x: number, y: number): void;

  /** What she has on (lib/shop/catalog.ts). An empty outfit is Yumi as she ships. */
  setOutfit?(outfit: YumiOutfit): void;
  /**
   * Pose YU and MI apart, or null to make her one again. While parts are
   * set, pointer input is ignored and the outfit is hidden: a hat belongs on
   * Yumi, not on half of her.
   */
  setParts?(parts: YumiParts | null): void;
  /** Turn to a set view: eased, or at once. */
  setView?(view: YumiView, immediate?: boolean): void;
  /** Turn her as a drag of that many pixels would, for the arrow keys. */
  rotateBy?(dxPx: number, dyPx: number): void;

  pointerDown(clientX: number, clientY: number): void;
  pointerMove(clientX: number, clientY: number): void;
  pointerUp(): void;
  /** Release a cancelled gesture without selecting or opening navigation. */
  pointerCancel?(): void;

  /**
   * Shoot the eye out at a point on screen and snap it back — the whole
   * reach, grab and return, on the same band the reader pulls.
   *
   * Ignored while the reader has hold of the eye, while the film is playing,
   * and while a lunge is already out: she reaches for one cookie at a time.
   * Returns whether the lunge was accepted.
   */
  lungeAt(clientX: number, clientY: number): boolean;

  /** True while a lunge is out or returning. */
  isLunging(): boolean;

  /** The eye's centre in CSS pixels within the canvas, for the ring. */
  eyeScreenPosition(): { x: number; y: number };

  getState(): {
    blink: number;
    stretch: number;
    pull: number;
    dragging: boolean;
    lunging: "out" | "hold" | "back" | null;
  };
};

export function makeStudioEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  /*
   * A painted environment rather than an HDR file: it is four gradients,
   * it costs no request, and the shell only ever shows a soft vertical
   * falloff and one key highlight anyway.
   */
  const source = document.createElement("canvas");
  source.width = 512;
  source.height = 256;
  const ctx = source.getContext("2d")!;

  const sky = ctx.createLinearGradient(0, 0, 0, 256);
  sky.addColorStop(0, "#ffffff");
  sky.addColorStop(0.55, "#e8e4db");
  sky.addColorStop(1, "#9a958c");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 512, 256);

  const key = ctx.createRadialGradient(150, 70, 6, 150, 70, 110);
  key.addColorStop(0, "rgba(255,255,255,1)");
  key.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = key;
  ctx.fillRect(0, 0, 512, 256);

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

export function createYumiScene(
  canvas: HTMLCanvasElement,
  options: YumiSceneOptions = {},
): YumiSceneHandle | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    // An old device, a blocked context, a headless harness. The caller keeps
    // whatever it was showing instead.
    return null;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, options.maxPixelRatio ?? 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  /* Checking each shader's compile and link status asks the GPU and waits
     for the answer: a stall on every first draw. three.js advises turning it
     off in production; development keeps it, where a shader error matters. */
  renderer.debug.checkShaderErrors = process.env.NODE_ENV !== "production";

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 0.46, 0.1, 100);
  camera.position.set(0, 0, 19.5);
  camera.lookAt(0, 0, 0);

  scene.environment = makeStudioEnvironment(renderer);

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
  keyLight.position.set(3.4, 4.2, 5.0);
  const fillLight = new THREE.DirectionalLight(0xffffff, 0.45);
  fillLight.position.set(-4.0, -1.4, 2.6);
  const rimLight = new THREE.DirectionalLight(0xffffff, 0.9);
  rimLight.position.set(-2.4, 2.0, -4.5);
  const ambient = new THREE.HemisphereLight(0xffffff, 0x6b6a64, 0.5);
  scene.add(keyLight, fillLight, rimLight, ambient);
  const LIGHT_REST = { key: 1.5, fill: 0.45, rim: 0.9, ambient: 0.5 };

  // ----------------------------------------------------------- materials
  /* Physical rather than standard so a shop finish can add a clear coat
     (enamel, lacquer, porcelain). With none, it renders as it always has. */
  const shellMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x040507, metalness: 0.5, roughness: 0.4, envMapIntensity: 0.38,
    transparent: true, opacity: 1,
  });
  const silverMaterial = new THREE.MeshStandardMaterial({
    color: 0x8d9399, metalness: 0.95, roughness: 0.23, envMapIntensity: 0.95,
    transparent: true, opacity: 1,
  });
  const eyeMaterial = new THREE.MeshStandardMaterial({
    color: 0xf2f0e8, metalness: 0.03, roughness: 0.2,
    emissive: 0xf2f0e8, emissiveIntensity: 0,
  });
  const pupilMaterial = new THREE.MeshStandardMaterial({
    color: 0x000000, metalness: 0.15, roughness: 0.07, envMapIntensity: 0.5,
  });
  const bezelMaterial = new THREE.MeshStandardMaterial({
    color: 0x030405, metalness: 0.5, roughness: 0.26, envMapIntensity: 0.6,
  });
  const highlightMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const accentMaterial = new THREE.MeshStandardMaterial({
    color: 0x8fa79a, metalness: 0.35, roughness: 0.3,
    transparent: true, opacity: 1,
  });
  /* The eye is not in this list. It is lit and present from the film's first
     frame and the shell condenses around it — the single-eye boot. */
  const fadeMaterials = [shellMaterial, silverMaterial, accentMaterial];

  // ------------------------------------------------------------ geometry
  const model = new THREE.Group();
  model.rotation.order = "YXZ";
  model.position.y = MODEL_REST_Y;
  scene.add(model);

  /* YU (the shell) and MI (the band and the eye) each have a group of their
     own. Together, both are identity and change nothing; see setParts. */
  const yuGroup = new THREE.Group();
  const miGroup = new THREE.Group();
  model.add(yuGroup, miGroup);

  const shell = new THREE.Mesh(
    new THREE.TorusGeometry(SHELL_RADIUS, TUBE_RADIUS, 28, 200, Math.PI * 2 - GAP_HALF * 2),
    shellMaterial,
  );
  shell.rotation.z = GAP_HALF;
  shell.scale.z = SHELL_DEPTH;
  yuGroup.add(shell);

  for (const angle of [GAP_HALF, -GAP_HALF]) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(TUBE_RADIUS, 28, 18), shellMaterial);
    cap.position.set(Math.cos(angle) * SHELL_RADIUS, Math.sin(angle) * SHELL_RADIUS, 0);
    cap.scale.z = SHELL_DEPTH;
    yuGroup.add(cap);
  }

  /*
   * The arm runs from the C's spine into the centre and holds the eye —
   * the middle stroke of an E, not a stalk hanging off the outside.
   * Modelled with its origin at the root and its length along +Y so a
   * lookAt plus a scale is the whole rig.
   */
  const armGeometry = new THREE.CylinderGeometry(ARM_RADIUS, ARM_RADIUS, 1, 40, 1, true);
  armGeometry.translate(0, 0.5, 0);
  const arm = new THREE.Mesh(armGeometry, silverMaterial);
  arm.position.copy(ARM_ROOT);
  miGroup.add(arm);

  const armCollar = new THREE.Mesh(new THREE.SphereGeometry(ARM_RADIUS * 1.5, 24, 16), silverMaterial);
  armCollar.position.copy(ARM_ROOT);
  miGroup.add(armCollar);

  const eyeGroup = new THREE.Group();
  eyeGroup.position.copy(EYE_REST);
  miGroup.add(eyeGroup);

  const eyeBall = new THREE.Mesh(new THREE.SphereGeometry(EYE_RADIUS, 56, 36), eyeMaterial);

  /* Generous, invisible, and low-poly: this is the thing a finger has to
     find, and a finger is not precise. */
  const eyeHit = new THREE.Mesh(
    new THREE.SphereGeometry(EYE_RADIUS * 1.45, 12, 8),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  eyeGroup.add(eyeHit);

  /* Between the eye and its parts, so a blink squashes the whole assembly
     along the screen's vertical whichever way she happens to be turned. */
  const blinkPivot = new THREE.Group();
  eyeGroup.add(blinkPivot);
  blinkPivot.add(eyeBall);

  const lookGroup = new THREE.Group();
  blinkPivot.add(lookGroup);

  const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.3, 40, 26), pupilMaterial);
  pupil.position.set(0, 0, EYE_RADIUS * 0.74);
  lookGroup.add(pupil);

  const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.05, 18, 72), bezelMaterial);
  bezel.position.set(0, 0, EYE_RADIUS * 0.7);
  lookGroup.add(bezel);

  const highlight = new THREE.Mesh(new THREE.SphereGeometry(0.072, 20, 14), highlightMaterial);
  highlight.position.set(-0.17, 0.19, EYE_RADIUS * 0.95);
  lookGroup.add(highlight);

  for (const position of [
    new THREE.Vector3(Math.cos(GAP_HALF) * SHELL_RADIUS, Math.sin(GAP_HALF) * SHELL_RADIUS, TUBE_RADIUS * SHELL_DEPTH * 0.55),
    new THREE.Vector3(Math.cos(-GAP_HALF) * SHELL_RADIUS, Math.sin(-GAP_HALF) * SHELL_RADIUS, TUBE_RADIUS * SHELL_DEPTH * 0.55),
    new THREE.Vector3(-SHELL_RADIUS + TUBE_RADIUS, 0, 0),
  ]) {
    const seam = new THREE.Mesh(new THREE.SphereGeometry(0.082, 20, 14), accentMaterial);
    seam.position.copy(position);
    yuGroup.add(seam);
  }

  const outfit = createOutfitRig({ model, eyeGroup, lookGroup, pupil, shellMaterial });
  /* Pieces just put on, hidden until their shaders are compiled, so trying
     one on never stalls a frame compiling it (where the browser can compile
     in parallel; elsewhere it costs the same, just not mid-frame). */
  const compiling = new Set<THREE.Object3D>();

  // ----------------------------------------------------------- behaviour
  const eyePosition = EYE_REST.clone();
  const eyeVelocity = new THREE.Vector3();
  const dragTarget = EYE_REST.clone();
  let stretchRatio = 1;

  let film: YumiFilmFrame | null = null;
  let parts: YumiParts | null = null;
  let focusLevel = 0;
  let rotationPaused = false;
  let cosmicWanted = 0;
  let cosmicNow = 0;
  const neutralLight = new THREE.Color(0xffffff);
  const cosmicKey = new THREE.Color(0xd8ece8);
  const cosmicRim = new THREE.Color(0xc7a8dc);
  const neutralShell = new THREE.Color(0x040507);
  const cosmicShell = new THREE.Color(0x18272b);
  const rotation = options.inspect
    ? createYumiRotation(model.quaternion, options.reducedMotion, { cruise: 0, damping: 6 })
    : options.continuousRotation
      ? createYumiRotation(model.quaternion, options.reducedMotion)
      : null;
  /* A set view the stand is easing toward; any touch lets go of it. */
  let viewTarget: THREE.Quaternion | null = null;

  /* Where she is asked to be, and where she actually is. The gap between
     them is the flight out to the middle and back. */
  const anchorWanted = { x: 0, y: 0, r: 48 };
  const anchorNow = { x: 0, y: 0, r: 48, started: false };

  let dragging = false;
  let orbiting = false;
  let moved = 0;
  let pitch = 0;
  const lastPointer = { x: 0, y: 0 };
  const dragPlane = new THREE.Plane();
  const raycaster = new THREE.Raycaster();
  const pointerNdc = new THREE.Vector2();

  let blink = 1;
  let blinkClock = 0;
  let nextBlinkAt = 4.5;
  const BLINK_TIME = 0.22;
  let idleSince = performance.now();
  let previous = performance.now();

  const OPEN_THRESHOLD = 0.5;
  const worldScratch = new THREE.Vector3();

  /*
   * The lunge.
   *
   * A chameleon does not pull its tongue back the instant it lands — it
   * holds, then returns loaded. The hold is what makes the reach read as
   * deliberate rather than as a twitch, and it is also where the bite is
   * reported, so the cookie leaves the tray at the moment she reaches it
   * rather than at the moment she started moving.
   */
  type LungePhase = "out" | "hold" | "back";
  let lungePhase: LungePhase | null = null;
  let lungeUntil = 0;
  const LUNGE_HOLD_MS = 170;
  /* Out is faster than a pull and back is faster still. Reaching is an
     intention; returning is a release. */
  const LUNGE_OUT_STIFFNESS = 520;
  const LUNGE_BACK_STIFFNESS = 300;

  // One layout read per rendered frame, shared by projection and pose math.
  // Reading again after renderer/style writes forces layout on iOS.
  let measuredRect = canvas.getBoundingClientRect();
  /* The canvas's own size, before any transform on its ancestors. The shop
     scales its whole stand as the catalogue scrolls (Chi, 2026-10-13); the
     on-screen rect shrinks with it, but the drawing buffer and Yumi's place
     in it must not, or every frame of the scale would resize the renderer.
     Only the stand: everywhere else anchors arrive in on-screen pixels.
     Untransformed, the two agree and the rect's fractions are kept. */
  let layoutSize: { width: number; height: number } = measuredRect;
  const settleLayout = () => {
    if (!options.inspect) { layoutSize = measuredRect; return; }
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    layoutSize = Math.abs(measuredRect.width - width) < 1 && Math.abs(measuredRect.height - height) < 1
      ? measuredRect
      : { width, height };
  };
  settleLayout();
  /** On screen: for mapping a pointer. */
  const canvasRect = () => measuredRect;
  /** In layout: for sizes, anchors and the renderer. */
  const canvasSize = () => layoutSize;
  const measureCanvas = () => { measuredRect = canvas.getBoundingClientRect(); settleLayout(); };

  function toNdc(clientX: number, clientY: number) {
    const rect = canvasRect();
    pointerNdc.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    return pointerNdc;
  }

  function pullProgress() {
    const distance = eyePosition.distanceTo(EYE_REST);
    return Math.min(1, distance / (MAX_PULL - REST_LENGTH));
  }

  function updateIdleBlink(nowMs: number) {
    if (options.reducedMotion) { blink = 1; return; }
    if (!blinkClock) blinkClock = nowMs;
    const since = (nowMs - blinkClock) / 1000;
    if (since < nextBlinkAt) { blink = 1; return; }
    const phase = (since - nextBlinkAt) / BLINK_TIME;
    if (phase >= 1) {
      blink = 1;
      blinkClock = nowMs;
      nextBlinkAt = 4.5 + Math.random() * 3.5;
      return;
    }
    blink = Math.max(0.04, 1 - Math.sin(phase * Math.PI));
  }

  /**
   * The band.
   *
   * Hooke plus viscous damping, integrated in fixed substeps so a dropped
   * frame cannot hand the integrator a step large enough to explode it —
   * which is what a single `dt` of 200ms does to a spring this stiff.
   */
  function integrateSpring(dt: number) {
    const reaching = lungePhase === "out" || lungePhase === "hold";
    const target = dragging || reaching ? dragTarget : EYE_REST;
    const stiffness = lungePhase === "out" ? LUNGE_OUT_STIFFNESS
      : lungePhase === "back" ? LUNGE_BACK_STIFFNESS
      : STIFFNESS;

    const steps = 3;
    const step = dt / steps;
    for (let i = 0; i < steps; i += 1) {
      const toTarget = springScratch.copy(target).sub(eyePosition);
      const acceleration = toTarget.multiplyScalar(stiffness)
        .sub(dampingScratch.copy(eyeVelocity).multiplyScalar(DAMPING));
      eyeVelocity.addScaledVector(acceleration, step);
      eyePosition.addScaledVector(eyeVelocity, step);
    }
  }

  /** Advances the reach. Called once a frame, before the spring integrates. */
  function stepLunge(nowMs: number) {
    if (!lungePhase) return;

    /* The reader always wins the band. Taking hold of the eye mid-reach
       cancels the lunge rather than fighting it for the same target. */
    if (dragging || film) { lungePhase = null; return; }

    if (lungePhase === "out") {
      const reached = eyePosition.distanceTo(dragTarget) < EYE_RADIUS * 0.5;
      if (reached || nowMs > lungeUntil) {
        lungePhase = "hold";
        lungeUntil = nowMs + LUNGE_HOLD_MS;
        options.onLungeArrive?.();
      }
      return;
    }

    if (lungePhase === "hold") {
      if (nowMs > lungeUntil) lungePhase = "back";
      return;
    }

    /* Home when it is both near rest and no longer moving — distance alone
       ends it at the top of the overshoot, mid-wobble. */
    if (eyePosition.distanceTo(EYE_REST) < 0.05 && eyeVelocity.length() < 0.35) {
      lungePhase = null;
      options.onLungeEnd?.();
    }
  }

  /**
   * Point the arm at the eye, stretch it to reach, and squash the eye along
   * the band so it thins as it is pulled — the whole rubber-band read.
   */
  /* Scratch for the per-frame pose: nothing below allocates, so a minute
     of animation is not a minute of garbage for the collector to stop for. */
  const springScratch = new THREE.Vector3();
  const dampingScratch = new THREE.Vector3();
  const rigFromRoot = new THREE.Vector3();
  const rigDirection = new THREE.Vector3();
  const irisView = new THREE.Vector3();

  function poseRig() {
    const fromRoot = rigFromRoot.copy(eyePosition).sub(ARM_ROOT);
    const length = Math.min(fromRoot.length(), MAX_PULL);
    const direction = rigDirection.copy(fromRoot).normalize();

    eyeGroup.position.copy(ARM_ROOT).addScaledVector(direction, length);
    arm.quaternion.setFromUnitVectors(UP, direction);
    arm.scale.set(1, Math.max(0.001, length), 1);

    stretchRatio = length / REST_LENGTH;

    /* Volume-preserving-ish: what it gains along the band it loses across
       it, which is why it reads as rubber rather than as a growing ball. */
    const along = Math.min(1.5, 0.72 + 0.28 * stretchRatio);
    const across = 1 / Math.sqrt(along);

    eyeGroup.quaternion.setFromUnitVectors(FORWARD, direction);
    eyeBall.scale.set(across, across, along);
  }

  /**
   * Keep the iris on the surface of the eye, whatever shape the stretch has
   * left it in, by solving the ellipsoid rather than approximating it. An
   * approximation here is a bezel that sinks into the eyeball at full pull.
   */
  const gaze = new THREE.Vector2();
  function poseIris() {
    const semiSide = EYE_RADIUS * eyeBall.scale.x;
    const semiBand = EYE_RADIUS * eyeBall.scale.z;

    const view = irisView;
    camera.getWorldPosition(view);
    view.x += gaze.x * 6;
    view.y -= gaze.y * 6;
    eyeBall.worldToLocal(view);
    view.normalize();

    const surface = 1 / Math.sqrt(
      (view.x * view.x + view.y * view.y) / (semiSide * semiSide) +
      (view.z * view.z) / (semiBand * semiBand),
    );

    lookGroup.quaternion.setFromUnitVectors(FORWARD, view);
    lookGroup.scale.setScalar(surface / EYE_RADIUS);
  }

  function project(point: THREE.Vector3) {
    const rect = canvasSize();
    worldScratch.copy(point);
    model.localToWorld(worldScratch);
    worldScratch.project(camera);
    return {
      x: (worldScratch.x * 0.5 + 0.5) * rect.width,
      y: (-worldScratch.y * 0.5 + 0.5) * rect.height,
    };
  }

  /** World units per CSS pixel on the z = 0 plane the model sits in. */
  function unitsPerPixel() {
    const rect = canvasSize();
    if (rect.height === 0) return 0.01;
    const visibleHeight = 2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
    return visibleHeight / rect.height;
  }

  /* The shell's own radius in world units, including the tube, so a caller
     asking for a 48px Yumi gets a 96px-wide Yumi. */
  const SHELL_OUTER = SHELL_RADIUS + TUBE_RADIUS;

  function applyAnchor() {
    const rect = canvasSize();
    const upp = unitsPerPixel();
    model.position.x = (anchorNow.x - rect.width / 2) * upp;
    model.position.y = -(anchorNow.y - rect.height / 2) * upp;
    return (anchorNow.r * upp) / SHELL_OUTER;
  }

  let renderedWidth = 0;
  let renderedHeight = 0;
  function resize() {
    measureCanvas();
    const rect = canvasSize();
    if (rect.width === 0 || rect.height === 0) return;
    if (rect.width === renderedWidth && rect.height === renderedHeight) return;
    renderedWidth = rect.width;
    renderedHeight = rect.height;
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width / rect.height;
    camera.position.z = rect.width < 360 ? 21 : 19.5;
    camera.updateProjectionMatrix();
  }

  resize();

  let readyPromise: Promise<void> | null = null;

  return {
    frame(nowMs: number) {
      if (!options.embedded) measureCanvas();
      const dt = Math.min((nowMs - previous) / 1000, 1 / 30);
      previous = nowMs;

      /*
       * Snap on the first frame — easing in from (0,0) would show her
       * sliding in from the corner on load — and ease every time after,
       * which is the flight out to the ring and back.
       */
      if (!anchorNow.started || options.exactAnchor) {
        anchorNow.x = anchorWanted.x;
        anchorNow.y = anchorWanted.y;
        anchorNow.r = anchorWanted.r;
        anchorNow.started = true;
      } else {
        const k = Math.min(1, dt * 7);
        anchorNow.x += (anchorWanted.x - anchorNow.x) * k;
        anchorNow.y += (anchorWanted.y - anchorNow.y) * k;
        anchorNow.r += (anchorWanted.r - anchorNow.r) * k;
      }
      const anchorScale = applyAnchor();

      /* A glass finish is see-through on its own account; the film's fade
         multiplies it rather than replacing it. */
      const finishOpacity = (shellMaterial.userData.finishOpacity as number | undefined) ?? 1;
      outfit.setVisible((!film || film.actor > 0.98) && !parts);
      for (const piece of compiling) piece.visible = false;

      if (film) {
        for (const material of fadeMaterials) material.opacity = film.actor;
        shellMaterial.opacity = film.actor * finishOpacity;
        keyLight.intensity = LIGHT_REST.key * film.light;
        fillLight.intensity = LIGHT_REST.fill * film.light;
        rimLight.intensity = LIGHT_REST.rim * film.light;
        ambient.intensity = LIGHT_REST.ambient * film.light;
        eyeMaterial.emissiveIntensity = film.glow;
        model.position.y += film.actorY;
        model.scale.setScalar(anchorScale * film.actorScale);
        blink = Math.max(0.03, 1 - film.blink);
        if (film.look) {
          model.rotation.y = film.look.x * 0.02;
          model.rotation.x = film.look.y * 0.01;
        } else {
          model.rotation.y += (0 - model.rotation.y) * Math.min(1, dt * 6);
          model.rotation.x += (0 - model.rotation.x) * Math.min(1, dt * 6);
        }
        eyePosition.copy(EYE_REST);
        eyeVelocity.set(0, 0, 0);
      } else {
        for (const material of fadeMaterials) material.opacity = 1;
        shellMaterial.opacity = finishOpacity;
        keyLight.intensity = LIGHT_REST.key;
        fillLight.intensity = LIGHT_REST.fill;
        cosmicNow += (cosmicWanted - cosmicNow) * (options.reducedMotion ? 1 : Math.min(1, dt * 8));
        keyLight.color.copy(neutralLight).lerp(cosmicKey, cosmicNow);
        rimLight.color.copy(neutralLight).lerp(cosmicRim, cosmicNow);
        /* Cosmic lifts her own obsidian to a deep teal. A finish from the shop
           is left alone — jade is jade in either mode — and only the light on
           it changes. */
        if (!outfit.hasShellFinish()) {
          shellMaterial.color.copy(neutralShell).lerp(cosmicShell, cosmicNow);
          shellMaterial.envMapIntensity = 0.38 + cosmicNow * 0.42;
        }
        rimLight.intensity = LIGHT_REST.rim + cosmicNow * 1.1;
        ambient.intensity = LIGHT_REST.ambient;
        eyeMaterial.emissiveIntensity = 0;

        if (viewTarget) {
          const k = options.reducedMotion ? 1 : Math.min(1, dt * 9);
          model.quaternion.slerp(viewTarget, k);
          if (model.quaternion.angleTo(viewTarget) < 0.002) {
            model.quaternion.copy(viewTarget);
            viewTarget = null;
          }
        } else if (rotation) {
          rotation.step(dt, rotationPaused || !!lungePhase || focusLevel > 0);
        } else if (!dragging && !orbiting && nowMs - idleSince > 3200) {
          /* Drifts back to facing you, so a reader who spun her and left
             does not come back to the inside of the shell. */
          model.rotation.y += (0 - model.rotation.y) * Math.min(1, dt * 1.6);
          pitch += (0 - pitch) * Math.min(1, dt * 1.6);
          model.rotation.x = pitch;
        }

        /* Not while the reader has her, and not mid-reach: an eye that
           blinks while it is flying at a cookie has lost the plot. */
        if (!dragging && !lungePhase) updateIdleBlink(nowMs);
        else blink = 1;

        /* focusLevel shrinks her a little further so an open panel has the
           lower half of the screen; the anchor has already placed her. */
        model.scale.setScalar(anchorScale * (1 - 0.18 * focusLevel));
      }

      stepLunge(nowMs);
      integrateSpring(dt);
      poseRig();
      poseIris();
      outfit.sync();

      yuGroup.position.set(parts?.yu.x ?? 0, parts?.yu.y ?? 0, 0);
      yuGroup.rotation.z = parts?.yu.rotation ?? 0;
      miGroup.position.set(parts?.mi.x ?? 0, parts?.mi.y ?? 0, 0);
      miGroup.rotation.z = parts?.mi.rotation ?? 0;

      /* Along the screen's vertical, after the look rotation, so a blink is
         a blink from every angle rather than only from the front. */
      blinkPivot.scale.set(1, Math.max(0.02, blink), 1);

      renderer.render(scene, camera);
    },

    ready() {
      /* Compiled where the browser can do it in parallel, then drawn once:
         the first draw is also where textures and buffers go up to the GPU
         and the driver finishes linking, and the caller keeps the canvas
         hidden until this resolves, so that cost is never a frozen frame
         anyone sees. */
      readyPromise ??= renderer
        .compileAsync(scene, camera)
        .catch(() => undefined)
        .then(() => {
          // Every part, wherever she happens to be: one culled now would
          // pay all of this on its first real frame instead.
          const culled: THREE.Object3D[] = [];
          scene.traverse(object => {
            if (!object.frustumCulled) return;
            object.frustumCulled = false;
            culled.push(object);
          });
          renderer.render(scene, camera);
          for (const object of culled) object.frustumCulled = true;
        });
      return readyPromise;
    },

    resize,

    dispose() {
      outfit.dispose();
      scene.traverse(object => {
        const mesh = object as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
      });
      for (const material of [
        shellMaterial, silverMaterial, eyeMaterial, pupilMaterial,
        bezelMaterial, highlightMaterial, accentMaterial,
      ]) material.dispose();
      scene.environment?.dispose();
      renderer.dispose();
    },

    setFilm(next) {
      film = next;
    },

    setRotationPaused(paused) {
      rotationPaused = paused;
    },
    setParts(next) {
      parts = next;
      if (next) {
        dragging = false;
        orbiting = false;
        lungePhase = null;
      }
    },
    setOutfit(next) {
      const added = outfit.apply(next);
      if (!added.length) return;
      for (const piece of added) {
        piece.visible = true;
        compiling.add(piece);
        // compileAsync gathers what it needs now, while the piece is visible.
        void renderer.compileAsync(piece, camera, scene)
          .catch(() => {})
          .finally(() => { compiling.delete(piece); });
        piece.visible = false;
      }
    },
    setView(view, immediate = false) {
      const euler = {
        front: new THREE.Euler(0, 0, 0),
        "three-quarter": new THREE.Euler(0.12, -0.42, 0, "YXZ"),
        side: new THREE.Euler(0, -Math.PI / 2, 0),
        back: new THREE.Euler(0, Math.PI, 0),
      }[view];
      rotation?.stop();
      const target = new THREE.Quaternion().setFromEuler(euler);
      if (immediate || options.reducedMotion) {
        model.quaternion.copy(target);
        viewTarget = null;
      } else {
        viewTarget = target;
      }
    },
    rotateBy(dxPx, dyPx) {
      viewTarget = null;
      if (rotation) rotation.nudge(dxPx, dyPx);
      else model.rotation.y += dxPx * 0.012;
    },
    setCosmicLevel(level, immediate = false) {
      cosmicWanted = Math.max(0, Math.min(1, level));
      if (immediate) cosmicNow = cosmicWanted;
    },
    resetScreenAnchor() {
      anchorNow.started = false;
      // A cookie reach belongs to the old screen, unlike the shell's spin.
      lungePhase = null;
      eyePosition.copy(EYE_REST);
      eyeVelocity.set(0, 0, 0);
    },

    setFocusLevel(level) {
      focusLevel = level;
    },

    setScreenAnchor(xPx, yPx, radiusPx) {
      anchorWanted.x = xPx;
      anchorWanted.y = yPx;
      anchorWanted.r = radiusPx;
    },

    pointerDown(clientX, clientY) {
      if (film || parts) return;
      measureCanvas();
      idleSince = performance.now();
      moved = 0;
      viewTarget = null;
      rotation?.begin(performance.now());
      lastPointer.x = clientX;
      lastPointer.y = clientY;

      raycaster.setFromCamera(toNdc(clientX, clientY), camera);
      const hit = options.inspect ? [] : raycaster.intersectObject(eyeHit, false);
      if (hit.length > 0) {
        dragging = true;
        /* Drag in the plane facing the camera that passes through the eye,
           so the pull follows the finger instead of sliding away in depth. */
        const normal = new THREE.Vector3();
        camera.getWorldDirection(normal);
        dragPlane.setFromNormalAndCoplanarPoint(normal, hit[0].point);
        return;
      }
      orbiting = true;
    },

    pointerMove(clientX, clientY) {
      if (film || parts) return;
      measureCanvas();
      const dx = clientX - lastPointer.x;
      const dy = clientY - lastPointer.y;
      moved += Math.abs(dx) + Math.abs(dy);
      lastPointer.x = clientX;
      lastPointer.y = clientY;
      idleSince = performance.now();

      if (dragging) {
        raycaster.setFromCamera(toNdc(clientX, clientY), camera);
        const point = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(dragPlane, point)) {
          model.worldToLocal(point);
          const fromRoot = point.sub(ARM_ROOT);
          if (fromRoot.length() > MAX_PULL) fromRoot.setLength(MAX_PULL);
          dragTarget.copy(ARM_ROOT).add(fromRoot);
        }
        return;
      }

      if (orbiting && rotation) {
        rotation.drag(dx, dy, performance.now());
      } else if (orbiting) {
        model.rotation.y += dx * 0.012;
        /* Clamped, because past a right angle there is nothing to look at:
           the shell's gap faces away and the eye is behind it. */
        pitch = THREE.MathUtils.clamp(pitch + dy * 0.008, -0.55, 0.55);
        model.rotation.x = pitch;
      }
    },

    setGaze(x, y) {
      gaze.x += (THREE.MathUtils.clamp(x, -1, 1) - gaze.x) * 0.09;
      gaze.y += (THREE.MathUtils.clamp(y, -1, 1) - gaze.y) * 0.09;
    },

    pointerCancel() {
      if (dragging || orbiting) rotation?.cancel();
      dragging = false;
      orbiting = false;
      eyeVelocity.set(0, 0, 0);
      idleSince = performance.now();
    },

    pointerUp() {
      if (film || parts) return;
      rotation?.release(performance.now(), orbiting && moved >= 6);
      if (dragging) {
        const progress = pullProgress();
        dragging = false;
        eyeVelocity.set(0, 0, 0);
        if (progress > OPEN_THRESHOLD) options.onPullOpen?.();
        else if (moved < 6) options.onTap?.();
      } else if (orbiting && moved < 6) {
        options.onTap?.();
      }
      orbiting = false;
      idleSince = performance.now();
    },

    lungeAt(clientX, clientY) {
      if (film || parts || dragging || orbiting || lungePhase) return false;
      // An embedded canvas is not measured per frame; this is input, so now.
      if (options.embedded) measureCanvas();

      /* The cookie is a DOM element on the page, so its point is unprojected
         onto the same camera-facing plane through the eye that a finger drags
         in. That keeps a reach and a pull the same motion in the same space. */
      raycaster.setFromCamera(toNdc(clientX, clientY), camera);
      const normal = new THREE.Vector3();
      camera.getWorldDirection(normal);
      const eyeWorld = new THREE.Vector3();
      eyeGroup.getWorldPosition(eyeWorld);
      dragPlane.setFromNormalAndCoplanarPoint(normal, eyeWorld);

      const point = new THREE.Vector3();
      if (!raycaster.ray.intersectPlane(dragPlane, point)) return false;

      model.worldToLocal(point);
      const fromRoot = point.sub(ARM_ROOT);
      if (fromRoot.length() > MAX_PULL) fromRoot.setLength(MAX_PULL);
      dragTarget.copy(ARM_ROOT).add(fromRoot);

      lungePhase = "out";
      /* A ceiling, not a duration: the spring normally arrives well inside
         it, and this only catches a cookie it cannot physically reach. */
      lungeUntil = performance.now() + 700;
      idleSince = performance.now();
      return true;
    },

    isLunging() {
      return lungePhase !== null;
    },

    eyeScreenPosition() {
      return project(eyeGroup.position);
    },

    getState() {
      return {
        blink,
        stretch: stretchRatio,
        pull: pullProgress(),
        dragging,
        lunging: lungePhase,
      };
    },
  };
}

export { EYE_REST, MAX_STRETCH, REST_LENGTH };
