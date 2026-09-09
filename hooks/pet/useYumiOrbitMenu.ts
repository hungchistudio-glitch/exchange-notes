"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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

/*
 * Long enough to cover the halo's own arrival — the last capability node
 * lands at 470ms (see YumiOrbitMenu.module.css) — so the phase does not flip
 * to "open" while the ring is still assembling.
 */
const OPEN_COMPLETE_MS = 540;
const CLOSE_COMPLETE_MS = 260;

export default function useYumiOrbitMenu() {
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
     * Yumi watches its own capabilities arrive.
     *
     * The delays match the halo's stagger (120ms, then 45ms apart), so the eye
     * reaches each station as that node appears rather than sweeping on an
     * unrelated clock — which is what turns "Yumi looked around" into "Yumi
     * brought these out".
     *
     * There is no first-run tooltip flash any more, and no localStorage key
     * behind it: every node now carries its name and a line saying what it
     * does, permanently. A hint that has to be remembered per device only
     * existed because the labels were hidden.
     */
    schedule(() => setLookTarget("review"), 130);
    schedule(() => setLookTarget("add"), 175);
    schedule(() => setLookTarget("camera"), 220);
    schedule(() => setLookTarget("speak"), 265);
    schedule(() => setLookTarget("collect"), 310);
    schedule(() => setLookTarget("viewer"), 440);
    schedule(() => {
      phaseRef.current = "open";
      setPhase("open");
    }, OPEN_COMPLETE_MS);
  }, [clearTimers, schedule]);

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
