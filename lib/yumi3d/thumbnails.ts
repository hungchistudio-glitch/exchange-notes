import * as THREE from "three";

import { shopItem } from "@/lib/shop/catalog";

import { buildThumbnailObject, disposeObject } from "./outfit";
import { makeStudioEnvironment } from "./scene";

/* =========================================================
   The catalogue's pictures, rendered here rather than shipped

   A card per piece cannot each have its own WebGL scene — seventy contexts
   is more than a phone will give a page — and a static image per piece would
   be seventy files to keep in step with the code that builds the piece. So
   each picture is rendered from the same builder the stand uses, on one small
   borrowed canvas released as soon as the batch is done.

   Rendering is the expensive part, so normally it is not done here at all:
   every piece ships as a picture in public/shop-thumbs, made by this same
   code ahead of time (scripts/render-shop-thumbnails.mjs). What follows is
   the fallback for a piece without one, done as little and as quietly as
   possible (Chi, 2026-10-12: "動畫很卡"):

     - only for cards that are on screen or about to be;
     - in idle time, one picture at a time, and not at all while the reader
       is turning Yumi on the stand;
     - once per device: each picture is kept in Cache Storage under a version
       that changes when the pieces do, and the next visit just reads it.
   ========================================================= */

const SIZE = 160;

/** Bump when any piece's builder or the thumbnail pose changes. */
export const THUMBNAIL_VERSION = 7;
/* Prefixed so the service worker's clean-up on a new release keeps it. */
const CACHE_NAME = "exchange-notes-shop-thumbnails";

/** The shipped picture of a piece. */
export function shippedThumbnail(id: string): string {
  return `/shop-thumbs/${id}.webp?v=${THUMBNAIL_VERSION}`;
}
const cacheKey = (id: string) => `/__yumi-shop-thumbnail/v${THUMBNAIL_VERSION}/${id}.png`;

const urls = new Map<string, string>();
const wanted = new Set<string>();
const listeners = new Set<() => void>();
let running = false;
let paused = false;
let prunedOldVersions = false;

export function cachedThumbnail(id: string): string | undefined {
  return urls.get(id);
}

/** For useSyncExternalStore: any picture landing notifies; each card reads its own. */
export function subscribeToThumbnails(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Held while the reader is turning Yumi: her frames come first. */
export function pauseThumbnails(pause: boolean) {
  paused = pause;
  if (!pause) kick();
}

function publish(id: string, blob: Blob) {
  urls.set(id, URL.createObjectURL(blob));
  for (const listener of listeners) listener();
}

/** Pose: three quarters for things, nearly square-on for flat ones, from above for hats. */
function pose(id: string, pivot: THREE.Object3D) {
  const item = shopItem(id);
  const flat = item?.slot === "pin" || item?.slot === "pupil" || item?.slot === "iris" || item?.slot === "eyewear" || id === "road-sign";
  const hat = item?.slot === "head";
  pivot.rotation.set(hat ? 0.5 : flat ? 0.06 : 0.2, flat ? -0.22 : -0.48, 0);
}

/** A quiet moment: idle time where the browser offers it, else a short wait. */
function quietMoment() {
  return new Promise<void>(resolve => {
    const wait = () => {
      if (paused) { setTimeout(wait, 200); return; }
      const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
      if (idle) idle(() => resolve(), { timeout: 700 });
      else setTimeout(resolve, 80);
    };
    wait();
  });
}

async function openCache(): Promise<Cache | null> {
  if (typeof caches === "undefined") return null;
  try {
    const cache = await caches.open(CACHE_NAME);
    if (!prunedOldVersions) {
      prunedOldVersions = true;
      const current = `/__yumi-shop-thumbnail/v${THUMBNAIL_VERSION}/`;
      void cache.keys().then(keys => {
        for (const request of keys) {
          if (!new URL(request.url).pathname.startsWith(current)) void cache.delete(request);
        }
      });
    }
    return cache;
  } catch {
    return null;
  }
}

type Studio = { renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera; canvas: HTMLCanvasElement };

function openStudio(size = SIZE): Studio | null {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
  } catch {
    return null;
  }
  renderer.setPixelRatio(1);
  renderer.setSize(size, size, false);
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
  return { renderer, scene, camera: new THREE.PerspectiveCamera(28, 1, 0.05, 100), canvas };
}

function closeStudio(studio: Studio) {
  studio.scene.environment?.dispose();
  studio.renderer.dispose();
  studio.renderer.forceContextLoss();
}

function drawThumbnail(studio: Studio, id: string): THREE.Group | null {
  const object = buildThumbnailObject(id);
  if (!object) return null;
  const { renderer, scene, camera } = studio;

  const pivot = new THREE.Group();
  pivot.add(object);
  pose(id, pivot);
  scene.add(pivot);
  pivot.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(pivot);
  const centre = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
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
  return pivot;
}

async function render(studio: Studio, id: string, type = "image/png", quality?: number): Promise<Blob | null> {
  const pivot = drawThumbnail(studio, id);
  if (!pivot) return null;
  try {
    return await new Promise<Blob | null>(resolve => studio.canvas.toBlob(resolve, type, quality));
  } finally {
    studio.scene.remove(pivot);
    disposeObject(pivot);
  }
}

async function drain() {
  const cache = await openCache();
  let studio: Studio | null = null;
  try {
    while (wanted.size) {
      const [id] = wanted;
      wanted.delete(id);
      if (urls.has(id)) continue;

      // Kept from an earlier visit: no rendering at all.
      const kept = await cache?.match(cacheKey(id)).catch(() => undefined);
      if (kept) {
        publish(id, await kept.blob());
        continue;
      }

      await quietMoment();
      studio ??= openStudio();
      if (!studio) { wanted.clear(); return; }
      const blob = await render(studio, id);
      if (!blob) continue;
      publish(id, blob);
      void cache?.put(cacheKey(id), new Response(blob, { headers: { "Content-Type": "image/png" } })).catch(() => {});
    }
  } finally {
    if (studio) closeStudio(studio);
  }
}

function kick() {
  if (running || !wanted.size || paused) return;
  running = true;
  void drain()
    .catch(() => { wanted.clear(); })
    .finally(() => {
      running = false;
      if (wanted.size) kick();
    });
}

/** Ask for a picture of each of these pieces; subscribers hear as each lands. */
export function requestThumbnails(ids: readonly string[]) {
  for (const id of ids) if (!urls.has(id)) wanted.add(id);
  kick();
}

/**
 * Every listed piece rendered at once, as data URLs, for the script that
 * writes public/shop-thumbs (through app/yumi-shop-thumbnails-review). Not
 * used by the shop itself.
 */
export async function renderThumbnailSet(
  ids: readonly string[],
  size = 256,
  type = "image/webp",
  quality = 0.9,
  cancelled: () => boolean = () => false,
  onProgress?: (done: number, total: number) => void,
): Promise<Record<string, string>> {
  if (cancelled()) return {};
  const studio = openStudio(size);
  if (!studio) return {};
  const out: Record<string, string> = {};
  try {
    for (const id of ids) {
      if (cancelled()) break;
      const pivot = drawThumbnail(studio, id);
      if (!pivot) continue;
      try {
        // Offline export only. Avoid background-tab Blob/FileReader throttling;
        // the live shop continues to encode asynchronously in idle time.
        out[id] = studio.canvas.toDataURL(type, quality);
        onProgress?.(Object.keys(out).length, ids.length);
      } finally {
        studio.scene.remove(pivot);
        disposeObject(pivot);
      }
      await new Promise<void>(resolve => setTimeout(resolve, 0));
    }
  } finally {
    closeStudio(studio);
  }
  return out;
}
