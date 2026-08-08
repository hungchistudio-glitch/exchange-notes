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
  | "food";

const OPEN_COMPLETE_MS = 460;
const CLOSE_COMPLETE_MS = 330;
const ORBIT_HINT_STORAGE_KEY = "exchange-notes:yumi-orbit-hint-seen";

export default function useYumiOrbitMenu() {
  const [phase, setPhase] = useState<YumiOrbitPhase>("closed");
  const [lookTarget, setLookTarget] =
    useState<YumiLookTarget>("viewer");
  const [showHints, setShowHints] = useState(false);
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

    try {
      const shouldShowHints =
        window.localStorage.getItem(ORBIT_HINT_STORAGE_KEY) !== "1";
      setShowHints(shouldShowHints);

      if (shouldShowHints) {
        window.localStorage.setItem(ORBIT_HINT_STORAGE_KEY, "1");
        schedule(() => setShowHints(false), 2_450);
      }
    } catch {
      setShowHints(false);
    }

    schedule(() => setLookTarget("review"), 70);
    schedule(() => setLookTarget("add"), 145);
    schedule(() => setLookTarget("camera"), 225);
    schedule(() => setLookTarget("viewer"), 360);
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
    setLookTarget("camera");

    schedule(() => setLookTarget("add"), 70);
    schedule(() => setLookTarget("review"), 140);
    schedule(() => setLookTarget("viewer"), 220);
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

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleCloseRequest, { passive: true });
    window.addEventListener("exchange-notes:close-yumi-menu", handleCloseRequest);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleCloseRequest);
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
    showHints,
    open,
    close,
    toggle,
    lookAt: setLookTarget,
  };
}
