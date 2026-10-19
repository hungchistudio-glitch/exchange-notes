"use client";

import type { InterfaceMode } from "@/lib/appPreferences";
import type { YumiOutfit } from "@/lib/shop/catalog";

/* =========================================================
   Yumi's picture, for a hello

   Taken once, on the sharer's own device, when the hello is made: the same
   scene the app always draws her with (lib/yumi3d/scene.ts), in the outfit
   the server saved with the hello — not whatever this device happens to
   have cached — facing forward, on a transparent background so it sits on
   either look's paper. The page shows it before its live scene is ready,
   and the shared image and link previews are made from it, so all three
   show the same Yumi.

   Waits for every piece to finish compiling before the shot (a piece is
   hidden while it compiles), draws a few frames so the pose has settled,
   and reads the pixels in the same task as the last draw, while the
   drawing buffer still holds them. The scene is released straight after.
   ========================================================= */

/** CSS size of the borrowed canvas; at a pixel ratio of 2 the picture is 720×720. */
const SIZE = 360;

function dataUrlToBlob(url: string): Blob | null {
  const [head, data] = url.split(",");
  if (!head?.startsWith("data:image/png") || !data) return null;
  const bytes = Uint8Array.from(atob(data), (char) => char.charCodeAt(0));
  return new Blob([bytes], { type: "image/png" });
}

export async function captureYumiPoster(outfit: YumiOutfit, look: InterfaceMode): Promise<Blob | null> {
  const holder = document.createElement("div");
  holder.setAttribute("aria-hidden", "true");
  holder.style.cssText = `position:fixed;left:-10000px;top:0;width:${SIZE}px;height:${SIZE}px;pointer-events:none;`;
  const canvas = document.createElement("canvas");
  canvas.style.cssText = `display:block;width:${SIZE}px;height:${SIZE}px;`;
  holder.appendChild(canvas);
  document.body.appendChild(holder);

  try {
    const { createYumiScene } = await import("@/lib/yumi3d/scene");
    const handle = createYumiScene(canvas, { inspect: true, reducedMotion: true, maxPixelRatio: 2 });
    if (!handle) return null;
    try {
      handle.resize();
      handle.setCosmicLevel?.(look === "yumi-cosmic" ? 1 : 0, true);
      handle.setOutfit?.(outfit);
      handle.setView?.("front", true);
      await handle.ready?.();
      await handle.outfitReady?.();
      const start = performance.now();
      let url = "";
      for (let index = 0; index < 4; index += 1) {
        /* The shell at two-thirds of the frame leaves room for a hat above and a cup beside her. */
        handle.setScreenAnchor(SIZE / 2, SIZE / 2, SIZE * 0.34);
        handle.frame(start + index * 16);
        if (index === 3) url = canvas.toDataURL("image/png");
      }
      return dataUrlToBlob(url);
    } finally {
      handle.dispose();
    }
  } catch {
    return null;
  } finally {
    holder.remove();
  }
}
