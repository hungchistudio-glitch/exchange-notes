import * as THREE from "three";

import { buildThumbnailObject, disposeObject } from "@/lib/yumi3d/outfit";
import { makeStudioEnvironment } from "@/lib/yumi3d/scene";

/* =========================================================
   A relic shown whole (Chi, 2026-11-11: "答對七題後的獎品，應該要有個動畫
   跑出顯示得到的神秘物品"; chose the gate sending it out and a full-screen
   showing). The relic that has just flown out of the star gate arrives
   here: it comes in small and spinning, settles to a slow turn in a cold
   light, with a halo behind it and a few motes circling it. The piece is
   the shop's own model (buildThumbnailObject), so it is what she will wear.

   Its own small renderer on the reveal's canvas, drawn only while the
   reveal is open; under reduced motion it holds still at a three-quarter
   turn. components/starweaver/RelicReveal.tsx loads this lazily.
   ========================================================= */

export type RelicShowcase = {
  /** Resolves once the relic has been drawn for the first time. */
  ready: Promise<void>;
  dispose(): void;
};

const easeOut = (t: number) => 1 - (1 - t) ** 3;

function glowTexture(): THREE.CanvasTexture {
  const paper = document.createElement("canvas");
  paper.width = paper.height = 128;
  const ink = paper.getContext("2d")!;
  const gradient = ink.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "rgba(236,250,252,0.95)");
  gradient.addColorStop(0.3, "rgba(150,214,226,0.45)");
  gradient.addColorStop(0.7, "rgba(140,130,230,0.12)");
  gradient.addColorStop(1, "rgba(124,196,209,0)");
  ink.fillStyle = gradient;
  ink.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(paper);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createRelicShowcase(
  canvas: HTMLCanvasElement,
  itemId: string,
  { reducedMotion = false }: { reducedMotion?: boolean } = {},
): RelicShowcase | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    return null;
  }
  let piece: THREE.Object3D | null = null;
  try {
    piece = buildThumbnailObject(itemId);
  } catch {
    piece = null;
  }
  if (!piece) {
    renderer.dispose();
    return null;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const environment = makeStudioEnvironment(renderer);
  scene.environment = environment;
  scene.add(new THREE.HemisphereLight(0xffffff, 0x1d2330, 0.55));
  const key = new THREE.DirectionalLight(0xfff6ea, 2.4);
  key.position.set(3, 5, 4);
  scene.add(key);
  /* A cold rim from behind, the gate's light still on it. */
  const rim = new THREE.DirectionalLight(0x9fe3ee, 2.4);
  rim.position.set(-4, 2, -3);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0xc4ccff, 0.6);
  fill.position.set(-3, -1, 3);
  scene.add(fill);

  /* The piece, centred and made the same size whatever it is. */
  const sphere = new THREE.Box3().setFromObject(piece).getBoundingSphere(new THREE.Sphere());
  piece.position.sub(sphere.center);
  const holder = new THREE.Group();
  holder.add(piece);
  holder.scale.setScalar(1 / Math.max(0.05, sphere.radius));
  const spinner = new THREE.Group();
  spinner.add(holder);
  scene.add(spinner);

  const glow = glowTexture();
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glow, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  halo.position.z = -0.6;
  halo.scale.setScalar(3.4);
  scene.add(halo);
  /* A few motes on a tilted orbit round it. */
  const orbit = new THREE.Group();
  orbit.rotation.set(1.1, 0, 0.35);
  scene.add(orbit);
  const moteMaterial = new THREE.SpriteMaterial({ map: glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  for (let i = 0; i < 18; i++) {
    const mote = new THREE.Sprite(moteMaterial);
    const angle = (i / 18) * Math.PI * 2;
    const radius = 1.45 + 0.12 * Math.sin(i * 2.3);
    mote.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
    mote.scale.setScalar(0.08 + 0.05 * ((i * 7) % 3));
    orbit.add(mote);
  }

  const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 50);
  camera.position.set(0, 0.35, 1.25 / Math.sin(THREE.MathUtils.degToRad(14)));
  camera.lookAt(0, 0, 0);

  function fit() {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  let frame = 0;
  let disposed = false;
  let started = 0;
  let last = 0;
  function draw(now: number) {
    if (disposed) return;
    if (!started) started = last = now;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const s = (now - started) / 1000;
    if (reducedMotion) {
      spinner.rotation.y = 0.6;
    } else {
      /* In small and spinning; then a slow turn and a breath. */
      const arrive = easeOut(Math.min(1, s / 0.7));
      spinner.scale.setScalar(0.55 + 0.45 * arrive);
      spinner.rotation.y += dt * (0.55 + 5 * (1 - arrive));
      spinner.position.y = Math.sin(s * 1.2) * 0.04;
      orbit.rotation.z += dt * 0.35;
      (halo.material as THREE.SpriteMaterial).opacity = 0.75 + 0.15 * Math.sin(s * 1.6);
    }
    renderer.render(scene, camera);
    if (!reducedMotion && !document.hidden) frame = requestAnimationFrame(draw);
    else frame = 0;
  }

  const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => {
    fit();
    if (!frame && !disposed) frame = requestAnimationFrame(draw);
  });
  observer?.observe(canvas);
  const onVisibility = () => { if (!document.hidden && !frame && !disposed) frame = requestAnimationFrame(draw); };
  document.addEventListener("visibilitychange", onVisibility);
  fit();

  const ready = renderer.compileAsync(scene, camera).catch(() => undefined).then(() => {
    if (disposed) return;
    renderer.render(scene, camera);
    frame = requestAnimationFrame(draw);
  });

  return {
    ready,
    dispose() {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      observer?.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      /* Nothing goes while its compile is in flight (lib/yumi3d/AGENTS.md). */
      void ready.finally(() => {
        disposeObject(holder);
        (halo.material as THREE.Material).dispose();
        moteMaterial.dispose();
        glow.dispose();
        environment.dispose();
        renderer.dispose();
      });
    },
  };
}
