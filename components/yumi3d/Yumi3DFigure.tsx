"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

import type { YumiSceneHandle } from "@/lib/yumi3d/scene";

import YumiLoading from "./YumiLoading";
import styles from "./Yumi3DFigure.module.css";

/* =========================================================
   A Yumi that drops into a box

   The home screen's ring and the opening film each drive the scene in their
   own way. This is for everywhere else — the landing page, the tutorial —
   where she is simply present: she can be turned, her eye can be pulled and
   let go, and she blinks on her own.

   Until the scene reports itself live the box holds YumiLoading, never the
   old flat mark: there is one Yumi, and a stranger on the landing page should
   not meet a different one first and watch her be swapped. The box keeps its
   size the whole time, so nothing around it moves when she arrives. A device
   that cannot start WebGL keeps the still ring rather than a substitute.
   ========================================================= */

/*
 * How long a scene that has neither started nor failed is given before the
 * loader stops running. The chunk is a few hundred kilobytes; a network that
 * has not delivered it by now is one where a spinning band would only be
 * saying "still nothing" forever. A late arrival still takes over.
 */
const FIGURE_GIVE_UP_MS = 15_000;

export type Yumi3DFigureProps = {
  /** Turn her and pull her eye. Off where she is illustration, not subject. */
  interactive?: boolean;
  /** Fired on a pull past the threshold, for a tutorial step to advance on. */
  onPullOpen?: () => void;
  /** Her radius as a fraction of the box's shorter side. */
  fill?: number;
  /** Where she looks, -1..1 each way, or null to look where she likes. */
  gaze?: { x: number; y: number } | null;
  /**
   * Shoot her eye at an element and snap it back, once per change of key:
   * how she takes a cookie, and how she answers a word remembered.
   */
  reach?: { key: number; target: RefObject<HTMLElement | null> };
  className?: string;
};

export default function Yumi3DFigure({
  interactive = true,
  onPullOpen,
  fill = 0.42,
  gaze = null,
  reach,
  className,
}: Yumi3DFigureProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<YumiSceneHandle | null>(null);
  const [status, setStatus] = useState<"loading" | "live" | "unavailable">(
    "loading",
  );
  const live = status === "live";

  const onPullOpenRef = useRef(onPullOpen);
  const fillRef = useRef(fill);
  const gazeRef = useRef(gaze);
  useEffect(() => {
    onPullOpenRef.current = onPullOpen;
    fillRef.current = fill;
    gazeRef.current = gaze;
  }, [fill, gaze, onPullOpen]);

  const reachKey = reach?.key ?? 0;
  const reachTarget = reach?.target;
  useEffect(() => {
    const element = reachTarget?.current;
    if (!reachKey || !element) return;
    const rect = element.getBoundingClientRect();
    sceneRef.current?.lungeAt(rect.left + rect.width / 2, rect.top + rect.height / 2);
  }, [reachKey, reachTarget]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const box = boxRef.current;
    if (!canvas || !box) return;

    let handle: YumiSceneHandle | null = null;
    let raf = 0;
    let cancelled = false;
    let visible = true;
    let requested = false;
    let giveUp = 0;

    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* The canvas's size, read when it changes rather than every frame: a
       layout read per frame forces a layout per frame while the page
       scrolls. */
    const size = { width: canvas.clientWidth, height: canvas.clientHeight };

    /*
     * Nothing is drawn while she is scrolled away: the loop stops, rather
     * than spinning to skip frames. A WebGL loop running for a figure nobody
     * is looking at is a phone getting warm for no reason.
     */
    const loop = (now: number) => {
      raf = 0;
      if (cancelled || !handle || !visible) return;
      handle.setScreenAnchor(
        size.width / 2,
        size.height / 2,
        Math.min(size.width, size.height) * fillRef.current,
      );
      // Eased inside the scene, so it is set every frame; null eases home.
      handle.setGaze?.(gazeRef.current?.x ?? 0, gazeRef.current?.y ?? 0);
      handle.frame(now);
      raf = requestAnimationFrame(loop);
    };
    const run = () => {
      if (!raf && handle && visible && !cancelled) raf = requestAnimationFrame(loop);
    };

    /*
     * And she is not made until she is about to be seen: the engine chunk,
     * a WebGL context and her buffers wait until the box is within a
     * screen or so, so a page that has her far down does not pay for her
     * on arrival.
     */
    const request = () => {
      if (requested || cancelled) return;
      requested = true;
      giveUp = window.setTimeout(
        () => setStatus(current => (current === "loading" ? "unavailable" : current)),
        FIGURE_GIVE_UP_MS,
      );

      void import("@/lib/yumi3d/scene")
        .then(({ createYumiScene }) => {
          if (cancelled) return;
          handle = createYumiScene(canvas, {
            reducedMotion: reduced,
            onPullOpen: () => onPullOpenRef.current?.(),
          });
          window.clearTimeout(giveUp);
          if (!handle) {
            setStatus("unavailable");
            return;
          }

          sceneRef.current = handle;
          setStatus("live");
          run();
        })
        .catch(() => {
          window.clearTimeout(giveUp);
          if (!cancelled) setStatus("unavailable");
        });
    };

    /* Guarded, because this also renders under a test renderer and on the
       odd browser without it — and "I cannot tell whether she is on screen"
       has to mean "draw her", not "never draw her". */
    const near =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(
            entries => { if (entries.some(entry => entry.isIntersecting)) request(); },
            { rootMargin: "600px 0px" },
          );
    near?.observe(box);
    if (!near) request();

    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(
            entries => {
              visible = entries.some(entry => entry.isIntersecting);
              run();
            },
            { rootMargin: "120px" },
          );
    observer?.observe(box);

    const onResize = () => {
      size.width = canvas.clientWidth;
      size.height = canvas.clientHeight;
      handle?.resize();
    };
    const resizer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(onResize);
    resizer?.observe(canvas);
    if (!resizer) window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      window.clearTimeout(giveUp);
      cancelAnimationFrame(raf);
      near?.disconnect();
      observer?.disconnect();
      resizer?.disconnect();
      if (!resizer) window.removeEventListener("resize", onResize);
      sceneRef.current = null;
      handle?.dispose();
    };
  }, []);

  return (
    <div ref={boxRef} className={`${styles.box} ${className ?? ""}`}>
      <YumiLoading state={live ? "done" : status} />

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
