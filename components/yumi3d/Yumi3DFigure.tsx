"use client";

import { useEffect, useRef, useState } from "react";

import type { YumiSceneHandle } from "@/lib/yumi3d/scene";

import styles from "./Yumi3DFigure.module.css";

/* =========================================================
   A Yumi that drops into a box

   The home screen's ring and the opening film each drive the scene in their
   own way. This is for everywhere else — the landing page, the tutorial —
   where she is simply present: she can be turned, her eye can be pulled and
   let go, and she blinks on her own.

   It renders `children` underneath and only paints over them once the scene
   reports itself live, so the flat mark is what a device without WebGL keeps
   showing, and what everyone sees until the engine chunk has arrived. On the
   landing page that matters twice over: it is the page that has to paint
   before anyone has signed in, and the one where a blank square would be the
   first thing a stranger ever saw.
   ========================================================= */

export type Yumi3DFigureProps = {
  /** The flat mark to show underneath, and to keep if 3D never starts. */
  children: React.ReactNode;
  /** Turn her and pull her eye. Off where she is illustration, not subject. */
  interactive?: boolean;
  /** Fired on a pull past the threshold, for a tutorial step to advance on. */
  onPullOpen?: () => void;
  /** Her radius as a fraction of the box's shorter side. */
  fill?: number;
  className?: string;
};

export default function Yumi3DFigure({
  children,
  interactive = true,
  onPullOpen,
  fill = 0.42,
  className,
}: Yumi3DFigureProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<YumiSceneHandle | null>(null);
  const [live, setLive] = useState(false);

  const onPullOpenRef = useRef(onPullOpen);
  const fillRef = useRef(fill);
  useEffect(() => {
    onPullOpenRef.current = onPullOpen;
    fillRef.current = fill;
  }, [fill, onPullOpen]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const box = boxRef.current;
    if (!canvas || !box) return;

    let handle: YumiSceneHandle | null = null;
    let raf = 0;
    let cancelled = false;
    let visible = true;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /*
     * Nothing is drawn while she is scrolled away. A WebGL loop running for
     * a figure nobody is looking at is a phone getting warm for no reason,
     * and the landing page has two of her.
     */
    /* Guarded, because this also renders under a test renderer and on the
       odd browser without it — and "I cannot tell whether she is on screen"
       has to mean "draw her", not "never draw her". */
    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(
            entries => { visible = entries.some(entry => entry.isIntersecting); },
            { rootMargin: "120px" },
          );
    observer?.observe(box);

    void import("@/lib/yumi3d/scene")
      .then(({ createYumiScene }) => {
        if (cancelled) return;
        handle = createYumiScene(canvas, {
          reducedMotion: reduced,
          onPullOpen: () => onPullOpenRef.current?.(),
        });
        if (!handle) return;

        sceneRef.current = handle;
        setLive(true);

        const loop = (now: number) => {
          if (cancelled || !handle) return;
          if (visible) {
            const rect = canvas.getBoundingClientRect();
            handle.setScreenAnchor(
              rect.width / 2,
              rect.height / 2,
              Math.min(rect.width, rect.height) * fillRef.current,
            );
            handle.frame(now);
          }
          raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
      })
      .catch(() => {
        /* The flat mark underneath is already right. */
      });

    const onResize = () => handle?.resize();
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      observer?.disconnect();
      window.removeEventListener("resize", onResize);
      sceneRef.current = null;
      handle?.dispose();
    };
  }, []);

  return (
    <div ref={boxRef} className={`${styles.box} ${className ?? ""}`}>
      <div className={live ? styles.replaced : undefined}>{children}</div>

      <canvas
        ref={canvasRef}
        className={`${styles.canvas} ${live ? styles.live : ""} ${
          interactive ? styles.interactive : ""
        }`}
        aria-hidden="true"
        onPointerDown={event => {
          if (!interactive) return;
          sceneRef.current?.pointerDown(event.clientX, event.clientY);
          event.currentTarget.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={event => {
          if (!interactive) return;
          sceneRef.current?.pointerMove(event.clientX, event.clientY);
        }}
        onPointerUp={() => interactive && sceneRef.current?.pointerUp()}
        onPointerCancel={() => interactive && sceneRef.current?.pointerUp()}
      />
    </div>
  );
}
