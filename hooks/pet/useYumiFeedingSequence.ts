"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import type { Cookie } from "@/lib/pet/types";

export type YumiFeedingPhase =
  | "idle"
  | "anticipating"
  | "biting"
  | "chewing"
  | "swallowing"
  | "satisfied";

type YumiFeedingSequenceOptions = {
  onConsume: (cookie: Cookie) => void;
};

const STANDARD_TIMELINE = {
  chewOne: 230,
  chewTwo: 500,
  chewThree: 780,
  chewFour: 1_015,
  swallow: 1_290,
  satisfied: 1_900,
  end: 4_200,
} as const;

const REDUCED_TIMELINE = {
  chewOne: 80,
  chewTwo: 120,
  chewThree: 160,
  chewFour: 200,
  swallow: 240,
  satisfied: 380,
  end: 900,
} as const;

export default function useYumiFeedingSequence({
  onConsume,
}: YumiFeedingSequenceOptions) {
  const [phase, setPhase] =
    useState<YumiFeedingPhase>("idle");
  const [activeCookieId, setActiveCookieId] =
    useState<string | null>(null);
  const [chewBeat, setChewBeat] = useState(0);

  const onConsumeRef = useRef(onConsume);
  const timersRef = useRef<
    Array<ReturnType<typeof setTimeout>>
  >([]);

  useEffect(() => {
    onConsumeRef.current = onConsume;
  }, [onConsume]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((timer) => {
      clearTimeout(timer);
    });
    timersRef.current = [];
  }, []);

  const schedulePhase = useCallback(
    (nextPhase: YumiFeedingPhase, delayMs: number) => {
      const timer = setTimeout(() => {
        setPhase(nextPhase);

        if (nextPhase === "idle") {
          setActiveCookieId(null);
          setChewBeat(0);
        }
      }, delayMs);

      timersRef.current.push(timer);
    },
    [],
  );

  const scheduleChewBeat = useCallback(
    (beat: number, delayMs: number) => {
      const timer = setTimeout(() => {
        setPhase("chewing");
        setChewBeat(beat);
      }, delayMs);
      timersRef.current.push(timer);
    },
    [],
  );

  const beginApproach = useCallback(
    (cookie: Cookie) => {
      clearTimers();
      setActiveCookieId(cookie.id);
      setChewBeat(0);
      setPhase("anticipating");
    },
    [clearTimers],
  );

  const consume = useCallback(
    (cookie: Cookie) => {
      clearTimers();
      setActiveCookieId(cookie.id);
      setChewBeat(0);
      setPhase("biting");

      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const timeline = reducedMotion ? REDUCED_TIMELINE : STANDARD_TIMELINE;

      scheduleChewBeat(1, timeline.chewOne);
      scheduleChewBeat(2, timeline.chewTwo);
      scheduleChewBeat(3, timeline.chewThree);
      scheduleChewBeat(4, timeline.chewFour);
      schedulePhase("swallowing", timeline.swallow);

      const consumeTimer = setTimeout(() => {
        onConsumeRef.current(cookie);
      }, timeline.swallow);
      timersRef.current.push(consumeTimer);

      schedulePhase("satisfied", timeline.satisfied);
      schedulePhase("idle", timeline.end);
    },
    [clearTimers, scheduleChewBeat, schedulePhase],
  );

  useEffect(() => clearTimers, [clearTimers]);

  return {
    phase,
    activeCookieId,
    chewBeat,
    isFeeding: phase !== "idle",
    beginApproach,
    consume,
  };
}
