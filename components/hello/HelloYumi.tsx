"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

import type { InterfaceMode } from "@/lib/appPreferences";
import type { YumiOutfit } from "@/lib/shop/catalog";
import type { YumiSceneHandle } from "@/lib/yumi3d/scene";

import styles from "./Hello.module.css";

/* =========================================================
   The sharer's Yumi, come to visit

   Her own scene (lib/yumi3d/scene.ts) in the shop stand's inspect mode,
   dressed in the outfit saved with the hello — never the visitor's, and
   never a drawing of her made some other way.

   The picture taken when the hello was made shows at once, in the frame
   she will stand in; the live scene takes over in the same frame, at the
   same size, once her shaders are ready, so nothing moves and nothing
   waits on WebGL to be readable. Without WebGL, or before it is ready, the
   picture is the answer — and without a picture there is an empty frame
   and her name, never a different Yumi standing in for this one.

   Arriving, she turns from three-quarters to face the visitor. After that
   she is still until handled: a sideways drag turns her, an up-and-down
   one scrolls the page (touch-action: pan-y on the frame), and the arrow
   keys turn her from the keyboard. She is drawn only while on screen and
   while the tab is visible, at half rate when at rest.
   ========================================================= */

/** How long after she appears she turns to face the visitor. */
const TURN_DELAY_MS = 150;
/** Full frame rate for this long after she appears or is handled. */
const ACTIVE_MS = 1200;

type HelloYumiProps = {
  outfit: YumiOutfit;
  /** False when a piece no longer exists: the picture only, then. */
  complete?: boolean;
  look: InterfaceMode;
  posterUrl: string | null;
  /** What she is, for a screen reader: "Jean's Yumi, dressed as…". */
  label: string;
  dragHint: string;
};

export default function HelloYumi({ outfit, complete = true, look, posterUrl, label, dragHint }: HelloYumiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<YumiSceneHandle | null>(null);
  const activeUntil = useRef(0);
  const [live, setLive] = useState(false);

  /* The outfit and look are a snapshot: read once, when she is made. */
  const outfitRef = useRef(outfit);
  const lookRef = useRef(look);

  /* A piece has gone from the shop: the live scene would dress her
     differently from the hello that was sent, so the picture stays. */
  const pictureOnly = !complete && Boolean(posterUrl);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || pictureOnly) return;

    let handle: YumiSceneHandle | null = null;
    let raf = 0;
    let turnTimer = 0;
    let cancelled = false;
    let onScreen = true;
    let frame = 0;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver((entries) => {
            onScreen = entries.some((entry) => entry.isIntersecting);
          });
    observer?.observe(canvas);

    let size = { width: canvas.clientWidth, height: canvas.clientHeight };
    const draw = (now: number) => {
      if (!handle) return;
      const radius = Math.min(size.width, size.height) * 0.3;
      handle.setScreenAnchor(size.width * 0.5, size.height * 0.5, radius);
      handle.frame(now);
    };

    const loop = (now: number) => {
      if (cancelled || !handle) return;
      frame += 1;
      const busy = now < activeUntil.current;
      if (onScreen && !document.hidden && (busy || frame % 2 === 0)) draw(now);
      raf = requestAnimationFrame(loop);
    };

    void import("@/lib/yumi3d/scene")
      .then(async ({ createYumiScene }) => {
        if (cancelled) return;
        handle = createYumiScene(canvas, { inspect: true, reducedMotion: reduced, maxPixelRatio: 2 });
        if (!handle) return;
        handleRef.current = handle;
        handle.setCosmicLevel?.(lookRef.current === "yumi-cosmic" ? 1 : 0, true);
        handle.setOutfit?.(outfitRef.current);
        handle.setView?.(reduced ? "front" : "three-quarter", true);
        await handle.ready?.();
        if (cancelled) return;
        draw(performance.now());
        setLive(true);
        activeUntil.current = performance.now() + ACTIVE_MS;
        raf = requestAnimationFrame(loop);
        if (!reduced) {
          turnTimer = window.setTimeout(() => handle?.setView?.("front"), TURN_DELAY_MS);
        }
      })
      .catch(() => {
        /* No 3D: the picture stays, and the page works the same. */
      });

    const onResize = () => {
      size = { width: canvas.clientWidth, height: canvas.clientHeight };
      handle?.resize();
    };
    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(onResize);
    resizeObserver?.observe(canvas);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(turnTimer);
      observer?.disconnect();
      resizeObserver?.disconnect();
      handleRef.current = null;
      handle?.dispose();
    };
  }, [pictureOnly]);

  const wake = () => {
    activeUntil.current = performance.now() + ACTIVE_MS;
  };

  const onPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    activeUntil.current = Number.POSITIVE_INFINITY;
    handleRef.current?.pointerDown(event.clientX, event.clientY);
  };
  const onPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (event.buttons === 0 && event.pointerType === "mouse") return;
    handleRef.current?.pointerMove(event.clientX, event.clientY);
  };
  const onPointerUp = () => {
    handleRef.current?.pointerUp();
    wake();
  };
  /* The browser took the gesture for a scroll: let her go, untouched. */
  const onPointerCancel = () => {
    handleRef.current?.pointerCancel?.();
    wake();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    const step = 28;
    const turns: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const turn = turns[event.key];
    if (!turn || !handleRef.current?.rotateBy) return;
    event.preventDefault();
    handleRef.current.rotateBy(turn[0], turn[1]);
    wake();
  };

  return (
    <div className={styles.yumiFrame} data-live={live ? "true" : "false"}>
      {posterUrl ? (
        // A plain img: the poster is a public file with its own cache, and
        // must show before anything else on the page has loaded.
        // eslint-disable-next-line @next/next/no-img-element
        <img className={styles.poster} src={posterUrl} alt={live ? "" : label} decoding="async" />
      ) : live ? null : (
        <span className="sr-only">{label}</span>
      )}
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        role="img"
        aria-label={live ? `${label}. ${dragHint}` : undefined}
        aria-hidden={live ? undefined : true}
        tabIndex={live ? 0 : -1}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onLostPointerCapture={onPointerUp}
        onKeyDown={onKeyDown}
      />
      {live ? (
        <p className={styles.dragHint} aria-hidden="true">
          {dragHint}
        </p>
      ) : null}
    </div>
  );
}
