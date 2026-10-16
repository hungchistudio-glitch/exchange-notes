"use client";

import { useEffect, useRef, useState } from "react";
import { useOptionalInterfaceMode } from "@/contexts/InterfaceModeContext";
import { useWornOutfit } from "@/lib/shop/wornOutfit";
import type { YumiSceneHandle } from "@/lib/yumi3d/scene";
import { parkYumiScene, relayedOptions, takeParkedYumiScene, type YumiSceneRelay } from "@/lib/yumi3d/sceneCache";
import YumiLoading from "@/components/yumi3d/YumiLoading";
import styles from "./CosmicHomeYumi.module.css";

/**
 * Both homes borrow the same scene. Until it draws, and for good on a device
 * without WebGL, the shared loader holds her place; no flat Yumi stands in.
 */
export default function CosmicHomeYumi({ paused }: { paused: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mode = useOptionalInterfaceMode();
  const outfit = useWornOutfit();
  const stateRef = useRef({ paused, mode, outfit });
  const [live, setLive] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => { stateRef.current = { paused, mode, outfit }; }, [paused, mode, outfit]);

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
      if (!handle) {
        // No WebGL: the deck around her is drawn, so the crossing may lift.
        setUnavailable(true);
        stateRef.current.mode?.markHomeModeReady?.("yumi-cosmic", "scene");
        return;
      }
      handle.pointerCancel?.();
      handle.setFocusLevel(0);
      handle.resetScreenAnchor?.();
      resize();
      let first = true;
      let dressed: unknown = null;
      const frame = (now: number) => {
        if (cancelled || !handle) return;
        frameId = requestAnimationFrame(frame);
        if (!visible || document.visibilityState !== "visible") return;
        // What she bought in the shop, put on before the frame that shows her.
        if (dressed !== stateRef.current.outfit) {
          dressed = stateRef.current.outfit;
          handle.setOutfit?.(stateRef.current.outfit);
        }
        // Lit for the deck from her first frame here, not eased into it.
        handle.setCosmicLevel?.(1, first);
        first = false;
        handle.setRotationPaused?.(stateRef.current.paused || !!document.querySelector('[aria-modal="true"]'));
        handle.setGaze?.(0, 0);
        handle.frame(now);
      };
      frame(performance.now());
      // Reported once the canvas is shown (the effect below), not here: the
      // frame is drawn, but the class that makes it visible is not committed.
      setLive(true);
    }).catch(() => {
      // Release the transition even without WebGL; the still ring stays.
      if (!cancelled) setUnavailable(true);
      stateRef.current.mode?.markHomeModeReady?.("yumi-cosmic", "scene");
    });
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

  const markHomeModeReady = mode?.markHomeModeReady;
  const waiting = mode?.homeModeTransition?.step === "waiting";
  useEffect(() => {
    if (live && waiting) markHomeModeReady?.("yumi-cosmic", "scene");
  }, [live, waiting, markHomeModeReady]);

  return <div className={styles.figure} data-cosmic-yumi-live={live ? "true" : "false"}>
    <YumiLoading state={live ? "done" : unavailable ? "unavailable" : "loading"} />
    <div ref={hostRef} className={styles.host} />
  </div>;
}
