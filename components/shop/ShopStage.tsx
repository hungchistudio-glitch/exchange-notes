"use client";

import { Minus, Plus, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode, type WheelEvent } from "react";

import YumiLoading from "@/components/yumi3d/YumiLoading";
import type { Scene } from "@/lib/shop/atmosphere";
import type { YumiOutfit } from "@/lib/shop/catalog";
import type { YumiSceneHandle, YumiView } from "@/lib/yumi3d/scene";
import { isScrolling } from "@/lib/shop/scrollQuiet";
import { pauseThumbnails } from "@/lib/yumi3d/thumbnails";

import OrbitalBackdrop from "./OrbitalBackdrop";
import StationDock from "./StationDock";
import styles from "./YumiShop.module.css";

/* =========================================================
   The try-on stand

   Yumi's own scene (lib/yumi3d/scene.ts) in its inspect mode: any drag
   turns her freely in every direction, two fingers or the buttons zoom, and
   the set views turn her to face, side or back. A turn eases out and stays
   where it was left; changing a piece, the language or the mode never
   resets the camera.

   One canvas, drawn only while it is on screen and the page is visible.
   Gestures are taken only on the stand itself (touch-action: none there),
   so the catalogue under it scrolls normally.
   ========================================================= */

export type ShopStageLabels = {
  stage: string;
  hint: string;
  views: string;
  front: string;
  side: string;
  back: string;
  resetView: string;
  zoomIn: string;
  zoomOut: string;
  unavailable: string;
};

/** Full frame rate for a while: she is being handled, or easing after it. */
function wake(until: { current: number }, ms = 1600) {
  until.current = performance.now() + ms;
}

const ZOOM_MIN = 0.7;
const ZOOM_MAX = 1.8;

export default function ShopStage({
  outfit,
  isCosmic,
  labels,
  corner,
  scene,
  celebrateKey,
}: {
  outfit: YumiOutfit;
  isCosmic: boolean;
  labels: ShopStageLabels;
  /** The weather on Earth below her window (lib/shop/atmosphere). */
  scene: Scene;
  /** Changes once per purchase, for the sky's celebration. */
  celebrateKey: number;
  /** A control for the stand's top right: the mode switch, which is its lighting. */
  corner?: ReactNode;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<YumiSceneHandle | null>(null);
  const zoomRef = useRef(1);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef(0);
  /* A drag's horizontal speed, handed to the sky as wind. */
  /* Until when she is being handled (or easing after it): full frame rate.
     At rest she only blinks, and every other frame is plenty. */
  const activeUntil = useRef(0);
  const [live, setLive] = useState(false);
  const [failed, setFailed] = useState(false);
  const [turned, setTurned] = useState(false);
  const [view, setView] = useState<YumiView | null>("three-quarter");

  const outfitRef = useRef(outfit);
  const cosmicRef = useRef(isCosmic);

  useEffect(() => {
    outfitRef.current = outfit;
    handleRef.current?.setOutfit?.(outfit);
    wake(activeUntil);
  }, [outfit]);

  useEffect(() => {
    cosmicRef.current = isCosmic;
    handleRef.current?.setCosmicLevel?.(isCosmic ? 1 : 0);
  }, [isCosmic]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const box = boxRef.current;
    if (!canvas || !box) return;

    let handle: YumiSceneHandle | null = null;
    let raf = 0;
    let cancelled = false;
    let onScreen = true;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const observer = typeof IntersectionObserver === "undefined"
      ? null
      : new IntersectionObserver(entries => { onScreen = entries.some(e => e.isIntersecting); });
    observer?.observe(box);

    /* The canvas's size, read when it changes rather than on every frame:
       a layout read per frame during a scroll forces layout per frame. */
    let size = { width: canvas.clientWidth, height: canvas.clientHeight };
    const loopOnce = (now: number) => {
      if (!handle) return;
      const rect = size;
      /* Sized by the shorter side, a little high of centre: a hat adds
         more above her than a charm hangs below. */
      const radius = Math.min(rect.width * 0.27, rect.height * 0.25) * zoomRef.current;
      handle.setScreenAnchor(rect.width * 0.5, rect.height * 0.47, radius);
      handle.frame(now);
    };


    let frame = 0;
    const loop = (now: number) => {
      if (cancelled || !handle) return;
      frame += 1;
      const busy = now < activeUntil.current;
      if (onScreen && !document.hidden && !isScrolling(now) && (busy || frame % 2 === 0)) loopOnce(now);
      raf = requestAnimationFrame(loop);
    };

    void import("@/lib/yumi3d/scene")
      .then(({ createYumiScene }) => {
        if (cancelled) return;
        /* Full sharpness again (Chi, 2026-10-13): the half-rate idle frames
           are what keep the stand smooth, not a softer image. */
        handle = createYumiScene(canvas, { inspect: true, reducedMotion: reduced });
        if (!handle) {
          setFailed(true);
          return;
        }
        handleRef.current = handle;
        handle.setCosmicLevel?.(cosmicRef.current ? 1 : 0, true);
        handle.setOutfit?.(outfitRef.current);
        handle.setView?.("three-quarter", true);
        setLive(true);
        if (process.env.NODE_ENV === "development") {
          // For checking the stand from a script while the window is hidden.
          (window as unknown as { __yumiStand?: unknown }).__yumiStand = {
            handle,
            zoom(value: number) { zoomRef.current = value; },
            draw(times = 1) {
              for (let i = 0; i < times; i += 1) loopOnce(performance.now() + i * 16);
            },
          };
        }
        raf = requestAnimationFrame(loop);
      })
      .catch(() => setFailed(true));

    const onResize = () => {
      size = { width: canvas.clientWidth, height: canvas.clientHeight };
      handle?.resize();
    };
    window.addEventListener("resize", onResize);
    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(onResize);
    resizeObserver?.observe(canvas);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      observer?.disconnect();
      resizeObserver?.disconnect();
      window.removeEventListener("resize", onResize);
      handleRef.current = null;
      handle?.dispose();
      pauseThumbnails(false);
    };
  }, []);

  function zoomBy(factor: number) {
    wake(activeUntil, 600);
    zoomRef.current = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoomRef.current * factor));
  }

  function turnTo(next: YumiView) {
    wake(activeUntil);
    setView(next);
    handleRef.current?.setView?.(next);
  }

  function resetView() {
    zoomRef.current = 1;
    turnTo("three-quarter");
  }

  function spread() {
    const [a, b] = [...pointers.current.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  }

  function onPointerDown(event: PointerEvent<HTMLCanvasElement>) {
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    event.currentTarget.setPointerCapture?.(event.pointerId);
    // Her frames first while she is in hand; the catalogue's pictures wait.
    activeUntil.current = Number.POSITIVE_INFINITY;
    pauseThumbnails(true);
    if (pointers.current.size === 1) {
      handleRef.current?.pointerDown(event.clientX, event.clientY);
    } else {
      // A second finger turns a turn into a pinch.
      handleRef.current?.pointerCancel?.();
      pinch.current = spread();
    }
  }

  function onPointerMove(event: PointerEvent<HTMLCanvasElement>) {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size >= 2) {
      const next = spread();
      if (pinch.current > 0 && next > 0) zoomBy(next / pinch.current);
      pinch.current = next;
      return;
    }
    handleRef.current?.pointerMove(event.clientX, event.clientY);
    if (!turned) setTurned(true);
    if (view) setView(null);
  }

  function onPointerEnd(event: PointerEvent<HTMLCanvasElement>) {
    const wasSingle = pointers.current.size === 1;
    pointers.current.delete(event.pointerId);
    if (wasSingle) handleRef.current?.pointerUp();
    if (pointers.current.size === 0) {
      wake(activeUntil, 1800); // the flick's inertia
      pauseThumbnails(false);
    }
    if (pointers.current.size < 2) pinch.current = 0;
  }

  function onWheel(event: WheelEvent<HTMLCanvasElement>) {
    // A trackpad pinch arrives as ctrl+wheel. A plain wheel scrolls the page.
    if (!event.ctrlKey) return;
    zoomBy(Math.exp(-event.deltaY * 0.01));
  }

  function onKeyDown(event: KeyboardEvent<HTMLCanvasElement>) {
    const step = 28;
    const turns: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step],
    };
    if (turns[event.key]) {
      event.preventDefault();
      wake(activeUntil);
      handleRef.current?.rotateBy?.(...turns[event.key]);
      setView(null);
    } else if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      zoomBy(1.15);
    } else if (event.key === "-") {
      event.preventDefault();
      zoomBy(1 / 1.15);
    }
  }

  return (
    <div ref={boxRef} className={styles.stage}>
      <OrbitalBackdrop scene={scene} celebrateKey={celebrateKey} />
      {/* A boutique plinth: a spotlight from above, polished stone and a
          contact shadow under her (Chi, 2026-10-13). Her live reflection
          was dropped: copying each 3D frame back for it was the costliest
          thing an iPhone did here. */}
      <StationDock />

      {/* Only the 3D Yumi stands here. Until she draws the loader holds
          her place, and on a device without WebGL it stays, still, with the
          reason under it — never the old flat Yumi (Chi, 2026-10-15). */}
      <YumiLoading state={live ? "done" : failed ? "unavailable" : "loading"} />
      {failed && !live && (
        <p className={styles.stageNote}>{labels.unavailable}</p>
      )}

      <canvas
        ref={canvasRef}
        className={styles.stageCanvas}
        data-live={live ? "true" : "false"}
        tabIndex={live ? 0 : -1}
        role="img"
        aria-label={labels.stage}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onLostPointerCapture={onPointerEnd}
        onWheel={onWheel}
        onKeyDown={onKeyDown}
      />

      {corner && <div className={styles.corner}>{corner}</div>}

      {live && (
        <>
          <div className={styles.views} role="group" aria-label={labels.views}>
            {(["front", "side", "back"] as const).map(key => (
              <button
                key={key}
                type="button"
                className={styles.viewKey}
                aria-pressed={view === key}
                onClick={() => turnTo(key)}
              >
                {labels[key]}
              </button>
            ))}
          </div>

          <div className={styles.zoomKeys}>
            <button type="button" className={styles.roundKey} aria-label={labels.zoomIn} onClick={() => zoomBy(1.2)}>
              <Plus size={18} strokeWidth={1.8} aria-hidden="true" />
            </button>
            <button type="button" className={styles.roundKey} aria-label={labels.zoomOut} onClick={() => zoomBy(1 / 1.2)}>
              <Minus size={18} strokeWidth={1.8} aria-hidden="true" />
            </button>
          </div>

          <button type="button" className={`${styles.roundKey} ${styles.resetKey}`} aria-label={labels.resetView} onClick={resetView}>
            <RotateCcw size={17} strokeWidth={1.8} aria-hidden="true" />
          </button>

          <p className={styles.hint} data-hidden={turned ? "true" : "false"} aria-hidden="true">
            {labels.hint}
          </p>
        </>
      )}
    </div>
  );
}
