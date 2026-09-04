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

/*
 * One mouthful, and it has to be over before the next one arrives.
 *
 * The old timeline ran 4.2 seconds end to end, of which the last 2.3 were the
 * "satisfied" hold — a smile, looping, with nothing else happening. That is a
 * long time to be told to wait, and the tray was disabled for every
 * millisecond of it, which is what made feeding feel like a queue rather than
 * a hand.
 *
 * The beats are unchanged in shape — bite, four chews, swallow, a beat of
 * satisfaction — and roughly 2.5× faster, which lands the whole mouthful
 * inside the ~1.5s a person will keep watching before reaching for the next
 * cookie. The chew beats are ~150ms apart against ~170ms CSS animations, so
 * each chew is still cut off by the next: that overlap is what reads as
 * chewing rather than as four separate jaw movements.
 */
const STANDARD_TIMELINE = {
  chewOne: 130,
  chewTwo: 290,
  chewThree: 440,
  chewFour: 580,
  swallow: 730,
  satisfied: 1_060,
  end: 1_620,
} as const;

const REDUCED_TIMELINE = {
  chewOne: 60,
  chewTwo: 90,
  chewThree: 120,
  chewFour: 150,
  swallow: 180,
  satisfied: 280,
  end: 620,
} as const;

// Longest a cookie may credibly still be in the air. The flight itself is
// 500ms and its own fallback fires at 700ms; this sits well behind both.
const APPROACH_TIMEOUT_MS = 1_200;

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

  /*
   * Mouth open, waiting for the cookie that was just let go.
   *
   * The timeout is a lock-breaker, not a beat. Anticipation is meant to end
   * when `consume` arrives, but the thing that calls `consume` is a CSS
   * transition on a floating element, and a transition that never fires — a
   * cancelled pointer, a backgrounded tab, an element torn down mid-flight —
   * used to leave Yumi open-mouthed and `isFeeding` stuck true for the rest of
   * the session. The tray was disabled off that flag, so the whole feature
   * died until reload. Nothing downstream should be able to wedge this.
   */
  const beginApproach = useCallback(
    (cookie: Cookie) => {
      clearTimers();
      setActiveCookieId(cookie.id);
      setChewBeat(0);
      setPhase("anticipating");
      schedulePhase("idle", APPROACH_TIMEOUT_MS);
    },
    [clearTimers, schedulePhase],
  );

  const consume = useCallback(
    (cookie: Cookie) => {
      clearTimers();
      setActiveCookieId(cookie.id);
      setChewBeat(0);
      setPhase("biting");

      /*
       * Recorded on the bite, not on the swallow.
       *
       * It used to be a timer at the swallow mark, which `clearTimers()` above
       * then cancelled the moment a second cookie was released — so feeding
       * quickly silently threw feeds away. It also meant the cookie sat back
       * in its slot, draggable again, for the whole 1.3s between arriving in
       * Yumi's mouth and being recorded.
       *
       * By the time `consume` is called the cookie has already flown into the
       * mouth and the tray ghost is gone, so this *is* the moment it stopped
       * existing. No timer, nothing to cancel, nothing to lose.
       */
      onConsumeRef.current(cookie);

      const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;
      const timeline = reducedMotion ? REDUCED_TIMELINE : STANDARD_TIMELINE;

      scheduleChewBeat(1, timeline.chewOne);
      scheduleChewBeat(2, timeline.chewTwo);
      scheduleChewBeat(3, timeline.chewThree);
      scheduleChewBeat(4, timeline.chewFour);
      schedulePhase("swallowing", timeline.swallow);
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
