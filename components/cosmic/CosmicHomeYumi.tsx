"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { useOptionalInterfaceMode } from "@/contexts/InterfaceModeContext";
import { useWornOutfit } from "@/lib/shop/wornOutfit";
import type { YumiSceneHandle } from "@/lib/yumi3d/scene";
import { parkYumiScene, relayedOptions, takeParkedYumiScene, type YumiSceneRelay } from "@/lib/yumi3d/sceneCache";
import { openMicGuide, voiceSignal, voiceStage } from "@/lib/voice/signal";
import type { YumiFeeling } from "@/lib/home/yumiFeel";

const CALM: YumiFeeling = { gaze: null, lean: 0, dizzy: false };
import YumiLoading from "@/components/yumi3d/YumiLoading";
import styles from "./CosmicHomeYumi.module.css";

/** How far she draws in while the orbit of six is open around her. */
const SHRUNK = 0.92;

/*
 * How she behaves on the obsidian bridge (Chi, 2026-11-12), in order of
 * precedence: the mode crossing or a sheet over her; the reader's hand on
 * her; the search or the voice; coming back to rest; floating quietly.
 *
 * - Quiet: a float of about 2.5px every six seconds or so and a lean of
 *   under two degrees, never a turn of her own.
 * - Dragged: the full turn and its momentum, as everywhere. Once that has
 *   settled and she has been left alone for three seconds, she turns the
 *   shortest way back to three quarters over 1.4s (scene.ts setRest); not
 *   while the orbit is open or the search has the focus.
 * - The search: while its field has the focus, she looks down at it.
 * - The voice: the level the microphone's own meter already reads
 *   (lib/voice/signal.ts), smoothed, lifts her eye a little and lights a
 *   faint ring (the page's glow element). Nothing is drawn without it.
 * - Reading a picture: she faces the reader and waits.
 */
const REST = { view: "three-quarter", afterMs: 3000, seconds: 1.4 } as const;
const FLOAT_PX = 2.5;
const FLOAT_MS = 6200;
const LEAN_RAD = 0.028;
const LEAN_MS = 7300;

export type YumiAttention = "idle" | "search" | "listening" | "scanning";

/*
 * Where she stands in her canvas, and how big.
 * - "square": the old deck's square core; her shell fills 44% of it.
 * - "stage": the obsidian bridge's whole stage. Her shell is about half the
 *   stage's width, a little above its middle, and never so tall that a hat
 *   above her or a charm below leaves the frame.
 */
function anchorFor(fit: "square" | "stage", width: number, height: number) {
  if (fit === "square") return { x: width / 2, y: height / 2, r: Math.min(width, height) * 0.44 };
  return { x: width / 2, y: height * 0.47, r: Math.min(width * 0.25, height * 0.29) };
}

/*
 * Her reflection on the bridge (Chi, 2026-11-21): the obsidian is a mirror
 * a little under her, where the pool of light lies. The floor line is that
 * far below her shell's foot, in her own radii, and her canvas reaches past
 * the stage's foot far enough for the reflection to fade out (the console
 * under the stage is glass enough to show it; CommandDeck.module.css).
 */
const FLOOR_BELOW = 1.14;
const REFLECTION_ROOM = 1.6;

/** The floor line under her stand, in the stage's px. */
export function cosmicFloorFor(width: number, height: number) {
  const anchor = anchorFor("stage", width, height);
  return anchor.y + anchor.r * FLOOR_BELOW;
}

/** Where her eye goes for what the page is doing; x and y in -1..1. */
function gazeFor(attention: YumiAttention, voice: number, now: number) {
  /* Down at the field, about fifteen degrees: plainly looking, the pupil
     still well inside the eye. */
  if (attention === "search") return { x: 0, y: 0.85 };
  if (attention === "listening") return { x: 0.06 * Math.sin(now / 480) * voice, y: -0.06 - 0.14 * voice };
  return { x: 0, y: 0 };
}

/**
 * Both homes borrow the same scene. Until it draws, and for good on a device
 * without WebGL, the shared loader holds her place; no flat Yumi stands in.
 */
export default function CosmicHomeYumi({
  paused,
  fit = "square",
  shrink = false,
  attention = "idle",
  holdRest = false,
  glowRef,
}: {
  paused: boolean;
  fit?: "square" | "stage";
  /** Draw in a little, for the orbit of six around her. */
  shrink?: boolean;
  /** What the page is doing, for where she looks. */
  attention?: YumiAttention;
  /** No coming back to rest just now: the orbit is open, or the search has the focus. */
  holdRest?: boolean;
  /** Given the voice's level as --voice-level while she listens, for a faint ring. */
  glowRef?: RefObject<HTMLElement | null>;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mode = useOptionalInterfaceMode();
  const outfit = useWornOutfit();
  const stateRef = useRef({ paused, mode, outfit, shrink, fit, attention, holdRest, glowRef });
  const [live, setLive] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    stateRef.current = { paused, mode, outfit, shrink, fit, attention, holdRest, glowRef };
  }, [paused, mode, outfit, shrink, fit, attention, holdRest, glowRef]);

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
    /* A tap on her in her earmuffs is the way to turn the microphone on
       (Chi, 2026-11-27); otherwise a tap is only her eye's pull. */
    relay.current = { onTap: () => { if (voiceStage.deaf) openMicGuide(); } };
    let handle: YumiSceneHandle | null = parked?.handle ?? null;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* A sheet over her, from what the page does rather than a query every
       frame: looked for again only when the page's tree changes. */
    const hasModal = () => !!document.querySelector('[aria-modal="true"]');
    let modalOpen = hasModal();
    const modalWatch = new MutationObserver(() => { modalOpen = hasModal(); });
    modalWatch.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-modal"] });

    const blocked = () => stateRef.current.paused || !!stateRef.current.mode?.modeTransition || modalOpen;
    /* The canvas reaches below the stage for her reflection, over the
       console; only the stage itself takes a touch, so the host (the
       stage's own box) listens and the canvas lets every touch through. */
    const surface = host;
    const down = (event: PointerEvent) => {
      if (!handle || blocked() || !event.isPrimary || event.button !== 0 || pointer !== null) return;
      pointer = event.pointerId;
      surface.setPointerCapture?.(pointer);
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
      if (surface.hasPointerCapture?.(event.pointerId)) surface.releasePointerCapture(event.pointerId);
    };
    const cancel = () => {
      if (pointer === null) return;
      const id = pointer;
      pointer = null;
      handle?.pointerCancel?.();
      if (surface.hasPointerCapture?.(id)) surface.releasePointerCapture(id);
    };
    surface.addEventListener("pointerdown", down);
    surface.addEventListener("pointermove", move);
    surface.addEventListener("pointerup", finish);
    surface.addEventListener("pointercancel", finish);
    surface.addEventListener("lostpointercapture", finish);

    /* Measured on resize only, never in the frame. */
    let box = { width: 0, height: 0 };
    let scale = stateRef.current.shrink ? SHRUNK : 1;
    let floatY = 0;
    const place = () => {
      if (!handle || !box.width) return;
      const anchor = anchorFor(stateRef.current.fit, box.width, box.height);
      handle.setScreenAnchor(anchor.x, anchor.y + floatY, anchor.r * scale);
    };
    let floorTold: number | null = null;
    const resize = () => {
      if (!handle) return;
      /* The stage's own size, before any arrival transform on it. */
      const width = host.clientWidth;
      const height = host.clientHeight;
      box = { width, height };
      const reflecting = stateRef.current.fit === "stage" && width > 0 && height > 0;
      if (reflecting) {
        const anchor = anchorFor("stage", width, height);
        const floor = Math.round(cosmicFloorFor(width, height) * 2) / 2;
        const below = Math.max(0, Math.ceil(floor + anchor.r * REFLECTION_ROOM - height));
        canvas.style.height = below ? `${height + below}px` : "";
        stateRef.current.glowRef?.current?.style.setProperty("--yumi-floor", `${floor}px`);
        if (floor !== floorTold) {
          floorTold = floor;
          handle.setGround?.({ kind: "reflection", floorY: floor });
        }
      }
      handle.resize();
      place();
    };
    const sizeObserver = new ResizeObserver(resize);
    sizeObserver.observe(host);

    /*
     * One loop, and only while she can be seen: it stops scheduling itself
     * when she leaves the screen or the page is hidden, and is woken again
     * when she comes back. The scene caps a frame's step, so a return from
     * the background is never one large jump.
     */
    let first = true;
    let dressed: unknown = null;
    let heldRest: boolean | null = null;
    let voice = 0;
    let lastNow = 0;
    let lean = 0;
    /* The phone's tilt and shake (lib/home/yumiFeel.ts), loaded with her
       scene rather than with the page. */
    let feel: ReturnType<typeof import("@/lib/home/yumiFeel").createYumiFeel> | null = null;
    void import("@/lib/home/yumiFeel").then(module => {
      if (cancelled) return;
      feel = module.createYumiFeel(reduced);
    }).catch(() => {});
    const running = () => visible && document.visibilityState === "visible" && !cancelled;
    const frame = (now: number) => {
      frameId = 0;
      if (!handle || !running()) return;
      const state = stateRef.current;
      const dt = lastNow ? Math.max(0, Math.min(0.05, (now - lastNow) / 1000)) : 1 / 60;
      lastNow = now;
      // What she bought in the shop, put on before the frame that shows her.
      if (dressed !== state.outfit) {
        dressed = state.outfit;
        handle.setOutfit?.(state.outfit);
      }
      // Lit for the deck from her first frame here, not eased into it.
      handle.setCosmicLevel?.(1, first);
      first = false;

      const quiet = blocked();
      handle.setRotationPaused?.(state.paused || modalOpen);
      const hold = state.holdRest || quiet;
      if (hold !== heldRest) {
        heldRest = hold;
        handle.holdRest?.(hold);
      }

      /* The voice's level, quick to rise and slow to fall. */
      const level = state.attention === "listening" ? voiceSignal.level : 0;
      voice += (level - voice) * (1 - Math.exp(-dt * (level > voice ? 16 : 4)));
      const glow = state.glowRef?.current;
      if (glow && (voice > 0.002 || glow.style.getPropertyValue("--voice-level") !== "0")) {
        glow.style.setProperty("--voice-level", voice > 0.002 ? voice.toFixed(3) : "0");
      }
      const feeling = feel?.step(now, dt) ?? CALM;
      const felt = state.attention === "idle" && !quiet ? feeling.gaze : null;
      /* At the key that was pressed while it listens, the pupil opening
         with the voice; earmuffs with no microphone (Chi, 2026-11-27). */
      const hearing = voiceStage.phase === "listening";
      handle.setListening?.(hearing ? voiceSignal.level : null);
      handle.setEarmuffs?.(voiceStage.deaf);
      const mic = hearing && !reduced ? voiceStage.mic : null;
      const eye = mic ? handle.eyeScreenPosition() : null;
      const gaze = mic && eye
        ? { x: (mic.x - eye.x) / 180 + 0.05 * Math.sin(now / 480) * voice, y: (mic.y - eye.y) / 180 }
        : felt ?? gazeFor(state.attention, voice, now);
      handle.setGaze?.(gaze.x, gaze.y);

      /* Floating quietly; still under the reader's hand, and under reduced motion. */
      const floating = !reduced && pointer === null && !quiet;
      const wantedFloat = floating ? Math.sin((now / FLOAT_MS) * Math.PI * 2) * FLOAT_PX : 0;
      const wantedLean = floating
        ? Math.sin((now / LEAN_MS) * Math.PI * 2 + 1.1) * LEAN_RAD + (state.attention === "idle" ? feeling.lean : 0)
        : 0;
      lean += (wantedLean - lean) * Math.min(1, dt * 3);
      handle.setNavigationLean?.(lean);
      /* Drawn in for the orbit, or out again; placed when anything moved. */
      const wantedScale = state.shrink ? SHRUNK : 1;
      const nextScale = reduced || Math.abs(wantedScale - scale) < 0.002 ? wantedScale : scale + (wantedScale - scale) * 0.2;
      if (nextScale !== scale || Math.abs(wantedFloat - floatY) > 0.01) {
        scale = nextScale;
        floatY = wantedFloat;
        place();
      }

      handle.frame(now);
      frameId = requestAnimationFrame(frame);
    };
    const wake = () => {
      if (!frameId && handle && running()) {
        lastNow = 0;
        frameId = requestAnimationFrame(frame);
      }
    };
    const visibilityObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      wake();
    });
    visibilityObserver.observe(host);
    const onVisibility = () => {
      if (document.visibilityState !== "visible") cancel();
      wake();
    };
    window.addEventListener("blur", cancel);
    document.addEventListener("visibilitychange", onVisibility);

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
      /* A still stand here: three quarters from her first frame, and back
         to it after a turn (the Standard home gets its cruise back as she
         leaves, below). */
      handle.setView?.(REST.view, true);
      handle.setRest?.(REST);
      resize();
      // A first frame now, so the canvas is never shown empty.
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
      frameId = 0;
      sizeObserver.disconnect();
      visibilityObserver.disconnect();
      modalWatch.disconnect();
      window.removeEventListener("blur", cancel);
      document.removeEventListener("visibilitychange", onVisibility);
      cancel();
      feel?.dispose();
      surface.removeEventListener("pointerdown", down);
      surface.removeEventListener("pointermove", move);
      surface.removeEventListener("pointerup", finish);
      surface.removeEventListener("pointercancel", finish);
      surface.removeEventListener("lostpointercapture", finish);
      stateRef.current.glowRef?.current?.style.setProperty("--voice-level", "0");
      /* The scene is shared: no reflection, and its own height, for the next. */
      canvas.style.height = "";
      if (handle) {
        handle.setGround?.(null);
        handle.pointerCancel?.();
        /* The scene is shared: hand it back as the Standard home expects it. */
        handle.setRest?.(null);
        handle.holdRest?.(false);
        handle.setNavigationLean?.(0);
        handle.setGaze?.(0, 0);
        parkYumiScene({ canvas, handle, relay });
      }
      canvas.remove();
    };
  }, []);

  const markHomeModeReady = mode?.markHomeModeReady;
  const waiting = mode?.homeModeTransition?.step === "waiting";
  useEffect(() => {
    if (live && waiting) markHomeModeReady?.("yumi-cosmic", "scene");
  }, [live, waiting, markHomeModeReady]);

  return <div className={styles.figure} data-fit={fit} data-cosmic-yumi-live={live ? "true" : "false"}>
    <YumiLoading state={live ? "done" : unavailable ? "unavailable" : "loading"} />
    <div ref={hostRef} className={styles.host} />
  </div>;
}
