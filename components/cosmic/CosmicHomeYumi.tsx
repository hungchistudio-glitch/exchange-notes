"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useOptionalInterfaceMode } from "@/contexts/InterfaceModeContext";
import type { YumiSceneHandle } from "@/lib/yumi3d/scene";
import { parkYumiScene, relayedOptions, takeParkedYumiScene, type YumiSceneRelay } from "@/lib/yumi3d/sceneCache";
import styles from "./CosmicHomeYumi.module.css";

/** Both homes borrow the same scene; the SVG remains the no-WebGL fallback. */
export default function CosmicHomeYumi({ paused, children }: { paused: boolean; children: ReactNode }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mode = useOptionalInterfaceMode();
  const stateRef = useRef({ paused, mode });
  const [live, setLive] = useState(false);
  useEffect(() => { stateRef.current = { paused, mode }; }, [paused, mode]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let frameId = 0;
    let visible = true;
    let pointer: number | null = null;
    const parked = takeParkedYumiScene();
    const canvas = parked?.canvas ?? document.createElement("canvas");
    canvas.className = styles.canvas;
    canvas.setAttribute("aria-hidden", "true");
    host.appendChild(canvas);
    const relay: YumiSceneRelay = parked?.relay ?? { current: {} };
    relay.current = {};
    let handle: YumiSceneHandle | null = parked?.handle ?? null;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const blocked = () => stateRef.current.paused || !!stateRef.current.mode?.modeTransition || !!document.querySelector('[aria-modal="true"]');
    const down = (event: PointerEvent) => {
      if (!handle || blocked() || !event.isPrimary || event.button !== 0 || pointer !== null) return;
      pointer = event.pointerId;
      canvas.setPointerCapture?.(pointer);
      handle.pointerDown(event.clientX, event.clientY);
    };
    const move = (event: PointerEvent) => {
      if (pointer === event.pointerId) handle?.pointerMove(event.clientX, event.clientY);
    };
    const finish = (event: PointerEvent) => {
      if (pointer !== event.pointerId) return;
      pointer = null;
      if (event.type === "pointerup") handle?.pointerUp();
      else handle?.pointerCancel?.();
      if (canvas.hasPointerCapture?.(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    };
    const cancel = () => {
      if (pointer === null) return;
      const id = pointer;
      pointer = null;
      handle?.pointerCancel?.();
      if (canvas.hasPointerCapture?.(id)) canvas.releasePointerCapture(id);
    };
    const onHidden = () => { if (document.visibilityState !== "visible") cancel(); };
    window.addEventListener("blur", cancel);
    document.addEventListener("visibilitychange", onHidden);
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", finish);
    canvas.addEventListener("pointercancel", finish);
    canvas.addEventListener("lostpointercapture", finish);
    const resize = () => {
      if (!handle) return;
      handle.resize();
      const { width, height } = canvas.getBoundingClientRect();
      handle.setScreenAnchor(width / 2, height / 2, Math.min(width, height) * .44);
    };
    const sizeObserver = new ResizeObserver(resize);
    sizeObserver.observe(host);
    const visibilityObserver = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; });
    visibilityObserver.observe(host);
    const ready = handle ? Promise.resolve(handle) : import("@/lib/yumi3d/scene").then(({ createYumiScene }) => cancelled ? null : createYumiScene(canvas, relayedOptions(relay, reduced)));
    void ready.then(created => {
      if (cancelled) { if (created && !parked) created.dispose(); return; }
      handle = created;
      if (!handle) return;
      handle.pointerCancel?.();
      handle.setFocusLevel(0);
      handle.resetScreenAnchor?.();
      resize();
      const frame = (now: number) => {
        if (cancelled || !handle) return;
        frameId = requestAnimationFrame(frame);
        if (!visible || document.visibilityState !== "visible") return;
        const { mode: currentMode } = stateRef.current;
        handle.setCosmicLevel?.(currentMode?.modeTransition === "leaving-cosmic" ? 0 : 1);
        handle.setRotationPaused?.(stateRef.current.paused || !!document.querySelector('[aria-modal="true"]'));
        const origin = currentMode?.eclipseTransition;
        const eye = handle.eyeScreenPosition();
        const rect = origin ? canvas.getBoundingClientRect() : null;
        handle.setGaze?.(origin && rect && !reduced ? (origin.x - rect.left - eye.x) / 180 : 0, origin && rect && !reduced ? (origin.y - rect.top - eye.y) / 180 : 0);
        handle.frame(now);
      };
      frame(performance.now());
      setLive(true);
    }).catch(() => { /* Retain the existing, fully usable SVG deck. */ });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
      sizeObserver.disconnect();
      visibilityObserver.disconnect();
      window.removeEventListener("blur", cancel);
      document.removeEventListener("visibilitychange", onHidden);
      cancel();
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", finish);
      canvas.removeEventListener("pointercancel", finish);
      canvas.removeEventListener("lostpointercapture", finish);
      handle?.pointerCancel?.();
      if (handle) parkYumiScene({ canvas, handle, relay });
      canvas.remove();
    };
  }, []);

  return <div className={styles.figure} data-cosmic-yumi-live={live ? "true" : "false"}>
    <div className={styles.fallback} aria-hidden={live}>{children}</div>
    <div ref={hostRef} className={styles.host} />
  </div>;
}
