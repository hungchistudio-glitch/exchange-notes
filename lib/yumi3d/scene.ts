import * as THREE from "three";

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

/** Construction, read from the reference. Shared with the 2D brand mark. */
const SHELL_RADIUS = 1.6;
const TUBE_RADIUS = 0.4;
const SHELL_DEPTH = 1.22;
const GAP_HALF = THREE.MathUtils.degToRad(37.5);
const EYE_RADIUS = 0.6;
const ARM_RADIUS = 0.145;

const ARM_ROOT = new THREE.Vector3(-SHELL_RADIUS, 0, 0);
const EYE_REST = new THREE.Vector3(0.1, 0, 0.05);
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
  /** Skips the idle blink and damps the spring hard. */
  reducedMotion?: boolean;
};

export type YumiSceneHandle = {
  /** Advance the simulation and draw. Call from one rAF loop. */
  frame(nowMs: number): void;
  resize(): void;
  dispose(): void;

  /**
   * Hand the scene a film frame to obey, or null to return it to the live
   * interactive state. While a frame is set, pointer input is ignored.
   */
  setFilm(frame: YumiFilmFrame | null): void;

  /** 0 .. 1. Lifts and shrinks her so a panel can have the lower half. */
  setFocusLevel(level: number): void;

  pointerDown(clientX: number, clientY: number): void;
  pointerMove(clientX: number, clientY: number): void;
  pointerUp(): void;

  /** The eye's centre in CSS pixels within the canvas, for the ring. */
  eyeScreenPosition(): { x: number; y: number };

  getState(): {
    blink: number;
    stretch: number;
    pull: number;
    dragging: boolean;
  };
};

function makeStudioEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
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

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

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
  const shellMaterial = new THREE.MeshStandardMaterial({
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

  const shell = new THREE.Mesh(
    new THREE.TorusGeometry(SHELL_RADIUS, TUBE_RADIUS, 28, 200, Math.PI * 2 - GAP_HALF * 2),
    shellMaterial,
  );
  shell.rotation.z = GAP_HALF;
  shell.scale.z = SHELL_DEPTH;
  model.add(shell);

  for (const angle of [GAP_HALF, -GAP_HALF]) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(TUBE_RADIUS, 28, 18), shellMaterial);
    cap.position.set(Math.cos(angle) * SHELL_RADIUS, Math.sin(angle) * SHELL_RADIUS, 0);
    cap.scale.z = SHELL_DEPTH;
    model.add(cap);
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
  model.add(arm);

  const armCollar = new THREE.Mesh(new THREE.SphereGeometry(ARM_RADIUS * 1.5, 24, 16), silverMaterial);
  armCollar.position.copy(ARM_ROOT);
  model.add(armCollar);

  const eyeGroup = new THREE.Group();
  eyeGroup.position.copy(EYE_REST);
  model.add(eyeGroup);

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
    model.add(seam);
  }

  // ----------------------------------------------------------- behaviour
  const eyePosition = EYE_REST.clone();
  const eyeVelocity = new THREE.Vector3();
  const dragTarget = EYE_REST.clone();
  let stretchRatio = 1;

  let film: YumiFilmFrame | null = null;
  let focusLevel = 0;

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

  function canvasRect() {
    return canvas.getBoundingClientRect();
  }

  function toNdc(clientX: number, clientY: number) {
    const rect = canvasRect();
    pointerNdc.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1,
    );
    return pointerNdc;
  }

  function pullProgress() {
    const distance = eyePosition.clone().sub(EYE_REST).length();
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
    const steps = 3;
    const step = dt / steps;
    for (let i = 0; i < steps; i += 1) {
      const target = dragging ? dragTarget : EYE_REST;
      const toTarget = target.clone().sub(eyePosition);
      const acceleration = toTarget.multiplyScalar(STIFFNESS)
        .sub(eyeVelocity.clone().multiplyScalar(DAMPING));
      eyeVelocity.addScaledVector(acceleration, step);
      eyePosition.addScaledVector(eyeVelocity, step);
    }
  }

  /**
   * Point the arm at the eye, stretch it to reach, and squash the eye along
   * the band so it thins as it is pulled — the whole rubber-band read.
   */
  function poseRig() {
    const fromRoot = eyePosition.clone().sub(ARM_ROOT);
    const length = Math.min(fromRoot.length(), MAX_PULL);
    const direction = fromRoot.clone().normalize();

    eyeGroup.position.copy(ARM_ROOT).addScaledVector(direction, length);
    arm.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    arm.scale.set(1, Math.max(0.001, length), 1);

    stretchRatio = length / REST_LENGTH;

    /* Volume-preserving-ish: what it gains along the band it loses across
       it, which is why it reads as rubber rather than as a growing ball. */
    const along = Math.min(1.5, 0.72 + 0.28 * stretchRatio);
    const across = 1 / Math.sqrt(along);

    eyeGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction);
    eyeBall.scale.set(across, across, along);
  }

  /**
   * Keep the iris on the surface of the eye, whatever shape the stretch has
   * left it in, by solving the ellipsoid rather than approximating it. An
   * approximation here is a bezel that sinks into the eyeball at full pull.
   */
  function poseIris() {
    const semiSide = EYE_RADIUS * eyeBall.scale.x;
    const semiBand = EYE_RADIUS * eyeBall.scale.z;

    const view = new THREE.Vector3();
    camera.getWorldPosition(view);
    eyeBall.worldToLocal(view);
    view.normalize();

    const surface = 1 / Math.sqrt(
      (view.x * view.x + view.y * view.y) / (semiSide * semiSide) +
      (view.z * view.z) / (semiBand * semiBand),
    );

    lookGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), view);
    lookGroup.scale.setScalar(surface / EYE_RADIUS);
  }

  function project(point: THREE.Vector3) {
    const rect = canvasRect();
    worldScratch.copy(point);
    model.localToWorld(worldScratch);
    worldScratch.project(camera);
    return {
      x: (worldScratch.x * 0.5 + 0.5) * rect.width,
      y: (-worldScratch.y * 0.5 + 0.5) * rect.height,
    };
  }

  function resize() {
    const rect = canvasRect();
    if (rect.width === 0 || rect.height === 0) return;
    renderer.setSize(rect.width, rect.height, false);
    camera.aspect = rect.width / rect.height;
    camera.position.z = rect.width < 360 ? 21 : 19.5;
    camera.updateProjectionMatrix();
  }

  resize();

  return {
    frame(nowMs: number) {
      const dt = Math.min((nowMs - previous) / 1000, 1 / 30);
      previous = nowMs;

      if (film) {
        for (const material of fadeMaterials) material.opacity = film.actor;
        keyLight.intensity = LIGHT_REST.key * film.light;
        fillLight.intensity = LIGHT_REST.fill * film.light;
        rimLight.intensity = LIGHT_REST.rim * film.light;
        ambient.intensity = LIGHT_REST.ambient * film.light;
        eyeMaterial.emissiveIntensity = film.glow;
        model.position.y = MODEL_REST_Y + film.actorY;
        model.scale.setScalar(film.actorScale);
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
        keyLight.intensity = LIGHT_REST.key;
        fillLight.intensity = LIGHT_REST.fill;
        rimLight.intensity = LIGHT_REST.rim;
        ambient.intensity = LIGHT_REST.ambient;
        eyeMaterial.emissiveIntensity = 0;

        if (!dragging && !orbiting && nowMs - idleSince > 3200) {
          /* Drifts back to facing you, so a reader who spun her and left
             does not come back to the inside of the shell. */
          model.rotation.y += (0 - model.rotation.y) * Math.min(1, dt * 1.6);
          pitch += (0 - pitch) * Math.min(1, dt * 1.6);
          model.rotation.x = pitch;
        }

        if (!dragging) updateIdleBlink(nowMs);
        else blink = 1;

        model.position.y = MODEL_REST_Y + 3.0 * focusLevel;
        model.scale.setScalar(1 - 0.28 * focusLevel);
      }

      integrateSpring(dt);
      poseRig();
      poseIris();

      /* Along the screen's vertical, after the look rotation, so a blink is
         a blink from every angle rather than only from the front. */
      blinkPivot.scale.set(1, Math.max(0.02, blink), 1);

      renderer.render(scene, camera);
    },

    resize,

    dispose() {
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

    setFocusLevel(level) {
      focusLevel = level;
    },

    pointerDown(clientX, clientY) {
      if (film) return;
      idleSince = performance.now();
      moved = 0;
      lastPointer.x = clientX;
      lastPointer.y = clientY;

      raycaster.setFromCamera(toNdc(clientX, clientY), camera);
      const hit = raycaster.intersectObject(eyeHit, false);
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
      if (film) return;
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

      if (orbiting) {
        model.rotation.y += dx * 0.012;
        /* Clamped, because past a right angle there is nothing to look at:
           the shell's gap faces away and the eye is behind it. */
        pitch = THREE.MathUtils.clamp(pitch + dy * 0.008, -0.55, 0.55);
        model.rotation.x = pitch;
      }
    },

    pointerUp() {
      if (film) return;
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

    eyeScreenPosition() {
      return project(eyeGroup.position);
    },

    getState() {
      return {
        blink,
        stretch: stretchRatio,
        pull: pullProgress(),
        dragging,
      };
    },
  };
}

export { EYE_REST, MAX_STRETCH, REST_LENGTH };
