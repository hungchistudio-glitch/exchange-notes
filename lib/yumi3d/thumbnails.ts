import * as THREE from "three";

import { shopItem } from "@/lib/shop/catalog";

import { buildThumbnailObject, disposeObject } from "./outfit";
import { makeStudioEnvironment } from "./scene";

/* =========================================================
   The catalogue's pictures, rendered here rather than shipped

   A card per piece cannot each have its own WebGL scene — sixty contexts is
   more than a phone will give a page — and a static image per piece would be
   sixty files to keep in step with the code that builds the piece. So each
   picture is rendered once, from the same builder the stand uses, on one
   small borrowed canvas that is released as soon as the batch is done, and
   kept as an object URL for the rest of the session.

   Rendered one per frame, so opening the shop never stalls on sixty.
   ========================================================= */

const SIZE = 192;

const urls = new Map<string, string>();

export function cachedThumbnail(id: string): string | undefined {
  return urls.get(id);
}

let running: Promise<void> | null = null;
const wanted = new Set<string>();
const listeners = new Set<(id: string, url: string) => void>();

export function subscribeToThumbnails(listener: (id: string, url: string) => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Pose: three quarters for things, nearly square-on for flat ones, from above for hats. */
function pose(id: string, pivot: THREE.Object3D) {
  const item = shopItem(id);
  const flat = item?.slot === "pin" || item?.slot === "pupil" || item?.slot === "iris" || item?.slot === "eyewear" || id === "road-sign";
  const hat = item?.slot === "head";
  pivot.rotation.set(hat ? 0.5 : flat ? 0.06 : 0.2, flat ? -0.22 : -0.48, 0);
}

function nextFrame() {
  return new Promise<void>(resolve => {
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => resolve());
    else setTimeout(resolve, 0);
  });
}

async function drain() {
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
  } catch {
    wanted.clear();
    return;
  }
  renderer.setPixelRatio(1);
  renderer.setSize(SIZE, SIZE, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  scene.environment = makeStudioEnvironment(renderer);
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(3.4, 4.2, 5);
  const fill = new THREE.DirectionalLight(0xffffff, 0.5);
  fill.position.set(-4, -1.4, 2.6);
  const rim = new THREE.DirectionalLight(0xffffff, 0.9);
  rim.position.set(-2.4, 2, -4.5);
  scene.add(key, fill, rim, new THREE.HemisphereLight(0xffffff, 0x6b6a64, 0.55));

  const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 100);
  const box = new THREE.Box3();
  const centre = new THREE.Vector3();
  const size = new THREE.Vector3();

  try {
    while (wanted.size) {
      const [id] = wanted;
      wanted.delete(id);
      if (urls.has(id)) continue;

      await nextFrame();
      const object = buildThumbnailObject(id);
      if (!object) continue;

      const pivot = new THREE.Group();
      pivot.add(object);
      pose(id, pivot);
      scene.add(pivot);
      pivot.updateMatrixWorld(true);
      box.setFromObject(pivot);
      box.getCenter(centre);
      box.getSize(size);
      pivot.position.sub(centre);

      // Fit the larger of width and height, with a little air, from in front of its nearest face.
      const half = Math.max(size.x, size.y) / 2 * 1.12;
      const distance = half / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) + size.z / 2;
      camera.position.set(0, 0, distance);
      camera.near = distance / 50;
      camera.far = distance * 4;
      camera.updateProjectionMatrix();
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/png"));
      scene.remove(pivot);
      disposeObject(pivot);
      if (!blob) continue;

      const url = URL.createObjectURL(blob);
      urls.set(id, url);
      for (const listener of listeners) listener(id, url);
    }
  } finally {
    scene.environment?.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
  }
}

/** Ask for pictures of these pieces; listeners hear about each as it lands. */
export function requestThumbnails(ids: readonly string[]) {
  for (const id of ids) if (!urls.has(id)) wanted.add(id);
  if (!wanted.size || running) return;
  running = drain()
    .catch(() => { wanted.clear(); })
    .finally(() => {
      running = null;
      if (wanted.size) requestThumbnails([]);
    });
}
