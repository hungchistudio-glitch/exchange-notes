import type { YumiSceneHandle, YumiSceneOptions } from "@/lib/yumi3d/scene";

/* =========================================================
   Keeping Yumi between screens

   Leaving the home screen used to dispose her: the WebGL renderer, the
   environment map, every geometry and material. Coming back built all of it
   again and compiled the shaders again — measured on 2026-09-28 at two long
   tasks of 86–106ms and 58–90ms and a 150–200ms frozen frame on a fast Mac,
   every time, landing right on top of the page's fade-in. On a phone that
   is the stutter the reader feels when they go home.

   So the home screen parks her instead. The canvas element keeps its WebGL
   context while it is out of the document; nothing draws, because the loop
   that draws belongs to the screen and stops with it. When home mounts
   again it takes her back, puts the same canvas in its place, and carries
   on from the next frame.

   The callbacks a scene was created with are fixed at creation, and they
   belong to whichever home screen is mounted now — so the scene is created
   with a relay, and the screen that takes her points the relay at itself.

   Parked for at most PARK_LIMIT_MS: someone who has left home for a long
   time gets their GPU memory back, and pays for one rebuild on return.
   ========================================================= */

export type YumiSceneRelay = {
  current: Pick<YumiSceneOptions, "onPullOpen" | "onTap" | "onLungeArrive" | "onLungeEnd">;
};

export type ParkedYumiScene = {
  canvas: HTMLCanvasElement;
  handle: YumiSceneHandle;
  relay: YumiSceneRelay;
};

const PARK_LIMIT_MS = 10 * 60 * 1000;

let parked: ParkedYumiScene | null = null;
let expiry: ReturnType<typeof setTimeout> | null = null;

/** Options whose callbacks go wherever the relay currently points. */
export function relayedOptions(
  relay: YumiSceneRelay,
  reducedMotion: boolean,
): YumiSceneOptions {
  return {
    reducedMotion,
    continuousRotation: true,
    onPullOpen: () => relay.current.onPullOpen?.(),
    onTap: () => relay.current.onTap?.(),
    onLungeArrive: () => relay.current.onLungeArrive?.(),
    onLungeEnd: () => relay.current.onLungeEnd?.(),
  };
}

function contextLost(canvas: HTMLCanvasElement) {
  try {
    const gl =
      (canvas.getContext("webgl2") as WebGL2RenderingContext | null) ??
      (canvas.getContext("webgl") as WebGLRenderingContext | null);
    return !gl || gl.isContextLost();
  } catch {
    return true;
  }
}

export function hasParkedYumiScene() {
  return parked !== null;
}

/** Take the parked scene, if there is one and its context survived. */
export function takeParkedYumiScene(): ParkedYumiScene | null {
  const scene = parked;
  parked = null;
  if (expiry) clearTimeout(expiry);
  expiry = null;
  if (!scene) return null;

  /* iOS may drop a background page's WebGL contexts. A lost context draws
     nothing, so she would come back as a blank screen; build her again. */
  if (contextLost(scene.canvas)) {
    scene.handle.dispose();
    return null;
  }

  return scene;
}

export function parkYumiScene(scene: ParkedYumiScene) {
  disposeParkedYumiScene();
  scene.relay.current = {};
  parked = scene;
  expiry = setTimeout(disposeParkedYumiScene, PARK_LIMIT_MS);
}

export function disposeParkedYumiScene() {
  if (expiry) clearTimeout(expiry);
  expiry = null;
  const scene = parked;
  parked = null;
  scene?.handle.dispose();
}
