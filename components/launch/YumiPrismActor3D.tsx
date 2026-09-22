"use client";

import { useEffect, useRef, useState } from "react";

import type { YumiSceneHandle } from "@/lib/yumi3d/scene";
import { yumiPrism3dFrame } from "./yumiPrism3dFrame";

import styles from "./YumiPrismActor3D.module.css";

/* =========================================================
   The opening's lens, in three dimensions

   This is a swap of one thing: the flat pearl lens becomes the Yumi the
   reader is about to touch, so the film resolves into the app instead of
   dissolving to make way for it.

   Nothing about the film changes. It sits inside the existing
   `data-track="actor"` element, which means the arrival — the opacity, the
   damped overshoot, the scale — is still the compositor animating that
   element, exactly as it does for the SVG. Only the blink, the glow and the
   pre-lockup look are driven from here, because those are the parts a flat
   lens could fake and a model cannot.

   Until the scene reports itself live the SVG underneath is what shows, and
   on a device that cannot start WebGL it is what keeps showing. The opening
   is the first thing a reader ever sees; it does not get to be the thing
   that fails.
   ========================================================= */

export type YumiPrismActor3DProps = {
  /**
   * The film's clock, as the ref the review route already scrubs.
   *
   * A ref rather than a number because scrubbing does not re-render — the
   * review controls write the time and repaint imperatively, the way the
   * rest of this film is driven. Left undefined in production, where this
   * runs its own clock from mount alongside the compositor's animations.
   */
  timeRef?: { readonly current: number } | null;
  reduced?: boolean;
  /** Told once, so the flat lens can step aside rather than double up. */
  onLive?: () => void;
};

export default function YumiPrismActor3D({
  timeRef,
  reduced = false,
  onLive,
}: YumiPrismActor3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [live, setLive] = useState(false);

  /*
   * The loop reads these rather than closing over the props, so a scrub
   * repaints without tearing the scene down and rebuilding it — and they
   * are written in an effect rather than during render, because a render
   * that mutates a ref is a render with a side effect in it.
   */
  const clockRef = useRef(timeRef);
  const reducedRef = useRef(reduced);
  const onLiveRef = useRef(onLive);

  useEffect(() => {
    clockRef.current = timeRef;
    reducedRef.current = reduced;
    onLiveRef.current = onLive;
  }, [onLive, reduced, timeRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let handle: YumiSceneHandle | null = null;
    let raf = 0;
    let cancelled = false;
    let started = 0;

    void import("@/lib/yumi3d/scene")
      .then(({ createYumiScene }) => {
        if (cancelled) return;
        handle = createYumiScene(canvas, { reducedMotion: reducedRef.current });
        if (!handle) return;

        setLive(true);
        onLiveRef.current?.();

        const loop = (now: number) => {
          if (cancelled || !handle) return;
          if (!started) started = now;

          const clock = clockRef.current;
          const t = clock ? clock.current : now - started;
          handle.setFilm(yumiPrism3dFrame(t, reducedRef.current));

          /* Centred and filling its box. The box is the actor element, which
             the film is already moving and scaling, so she inherits the
             arrival rather than having a second one of her own. */
          const rect = canvas.getBoundingClientRect();
          handle.setScreenAnchor(
            rect.width / 2,
            rect.height / 2,
            Math.min(rect.width, rect.height) * 0.46,
          );

          handle.frame(now);
          raf = requestAnimationFrame(loop);
        };

        raf = requestAnimationFrame(loop);
      })
      .catch(() => {
        /* The flat lens is already on screen and correct. */
      });

    const onResize = () => handle?.resize();
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      handle?.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`${styles.canvas} ${live ? styles.live : ""}`}
      aria-hidden="true"
    />
  );
}
