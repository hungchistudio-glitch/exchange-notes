"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  IGNITION_NODE_MS,
  placeCapabilities,
  type HaloSurface,
} from "@/lib/pet/commandHalo";

export type YumiOrbitPhase =
  | "closed"
  | "opening"
  | "open"
  | "closing";

export type YumiLookTarget =
  | "viewer"
  | "review"
  | "add"
  | "camera"
  | "speak"
  | "collect"
  | "food";

const CLOSE_COMPLETE_MS = 260;
/* Two stations lit at the same moment (one on each flank) are looked at
   one after the other, this far apart. */
const LOOK_APART_MS = 60;

/*
 * Where Yumi looks while the halo lights, and when: each station a moment
 * after the spark reaches it (lib/pet/commandHalo.ts, ignitionDelay), then
 * back to the reader. The phase turns "open" once the last node has
 * settled, so it never reads open while the ring is still assembling.
 */
function ignitionPlan(surface: HaloSurface) {
  const lit = placeCapabilities(surface)
    .map((capability) => ({ look: capability.look, at: capability.ignition }))
    .sort((a, b) => a.at - b.at);
  const looks: Array<{ look: YumiLookTarget; at: number }> = [];
  for (const { look, at } of lit) {
    const previous = looks[looks.length - 1];
    looks.push({ look, at: Math.max(at + 10, previous ? previous.at + LOOK_APART_MS : 0) });
  }
  const last = lit.length ? lit[lit.length - 1].at : 0;
  return {
    looks,
    backToViewer: Math.max(last + 160, (looks[looks.length - 1]?.at ?? 0) + 120),
    openAt: last + IGNITION_NODE_MS + 20,
  };
}

export default function useYumiOrbitMenu(surface: HaloSurface = "vocabulary") {
  const [phase, setPhase] = useState<YumiOrbitPhase>("closed");
  const [lookTarget, setLookTarget] =
    useState<YumiLookTarget>("viewer");
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const phaseRef = useRef<YumiOrbitPhase>("closed");

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current = [];
  }, []);

  const schedule = useCallback((callback: () => void, delay: number) => {
    const timer = setTimeout(callback, delay);
    timersRef.current.push(timer);
  }, []);

  const open = useCallback(() => {
    if (phaseRef.current === "open" || phaseRef.current === "opening") return;

    clearTimers();
    phaseRef.current = "opening";
    setPhase("opening");
    setLookTarget("viewer");

    /*
     * Yumi watches its own capabilities light.
     *
     * The eye reaches each station as the spark lights it rather than
     * sweeping on an unrelated clock, which is what turns "Yumi looked
     * around" into "Yumi brought these out".
     *
     * There is no first-run tooltip flash any more, and no localStorage key
     * behind it: every node now carries its name and a line saying what it
     * does, permanently. A hint that has to be remembered per device only
     * existed because the labels were hidden.
     */
    const plan = ignitionPlan(surface);
    for (const { look, at } of plan.looks) {
      schedule(() => setLookTarget(look), at);
    }
    schedule(() => setLookTarget("viewer"), plan.backToViewer);
    schedule(() => {
      phaseRef.current = "open";
      setPhase("open");
    }, plan.openAt);
  }, [clearTimers, schedule, surface]);

  const close = useCallback(() => {
    if (phaseRef.current === "closed" || phaseRef.current === "closing") return;

    clearTimers();
    phaseRef.current = "closing";
    setPhase("closing");
    setLookTarget("collect");

    schedule(() => setLookTarget("camera"), 55);
    schedule(() => setLookTarget("review"), 110);
    schedule(() => setLookTarget("viewer"), 170);
    schedule(() => {
      phaseRef.current = "closed";
      setPhase("closed");
    }, CLOSE_COMPLETE_MS);
  }, [clearTimers, schedule]);

  const toggle = useCallback(() => {
    if (phaseRef.current === "closed" || phaseRef.current === "closing") {
      open();
    } else {
      close();
    }
  }, [close, open]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }

    function handleVisibilityChange() {
      if (document.visibilityState !== "visible") close();
    }

    function handleCloseRequest() {
      close();
    }

    const appScroller = document.querySelector<HTMLElement>(
      "[data-app-scroll-viewport]",
    );

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleCloseRequest, { passive: true });
    appScroller?.addEventListener("scroll", handleCloseRequest, {
      passive: true,
    });
    window.addEventListener("exchange-notes:close-yumi-menu", handleCloseRequest);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleCloseRequest);
      appScroller?.removeEventListener("scroll", handleCloseRequest);
      window.removeEventListener(
        "exchange-notes:close-yumi-menu",
        handleCloseRequest,
      );
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearTimers();
    };
  }, [clearTimers, close]);

  return {
    phase,
    lookTarget,
    isVisible: phase !== "closed",
    isOpen: phase === "open" || phase === "opening",
    open,
    close,
    toggle,
    lookAt: setLookTarget,
  };
}
