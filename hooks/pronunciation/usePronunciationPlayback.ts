"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  playPronunciation,
  playSequence,
  stopPronunciationAudio,
  type AudioSource,
  type PlaybackHandle,
  type PlaybackSpeed,
} from "@/lib/pronunciation/lab/audio";

export type PlaybackPhase = "loading" | "playing" | "done" | "error";

type PlaybackState = { key: string; phase: PlaybackPhase } | null;

/** How long a finished playback keeps its tick before going quiet. */
const DONE_HOLD_MS = 700;

export type PlaybackControls = {
  /** The phase of `key`, or undefined when something else is playing. */
  phaseFor: (key: string) => PlaybackPhase | undefined;
  activeKey: string | null;
  play: (key: string, source: AudioSource, speed?: PlaybackSpeed) => void;
  playSteps: (
    key: string,
    steps: Array<{ source: AudioSource; speed?: PlaybackSpeed; gapMs?: number }>,
    options?: { onStep?: (index: number) => void },
  ) => void;
  stop: () => void;
  isPlaying: boolean;
};

/**
 * One playback at a time, for a whole screen.
 *
 * A token, not a boolean. Tapping a second speaker while the first is
 * sounding has to cancel the first *and* make its callbacks harmless —
 * without that the first playback's `onEnd` arrives late and clears the
 * second one's state, which reads as "the button did nothing". The token is
 * compared inside every callback so a superseded run cannot write anything.
 *
 * Also stops on tab hide and on unmount: audio that keeps talking after the
 * user has left the screen is a bug in every case, and on a phone it
 * competes with whatever they switched to.
 */
export default function usePronunciationPlayback(): PlaybackControls {
  const [playback, setPlayback] = useState<PlaybackState>(null);
  const tokenRef = useRef(0);
  const handleRef = useRef<PlaybackHandle | null>(null);
  const doneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancel = useCallback(() => {
    tokenRef.current += 1;
    if (doneTimerRef.current) {
      clearTimeout(doneTimerRef.current);
      doneTimerRef.current = null;
    }
    handleRef.current?.stop();
    handleRef.current = null;
    stopPronunciationAudio();
  }, []);

  const stop = useCallback(() => {
    cancel();
    setPlayback(null);
  }, [cancel]);

  useEffect(() => {
    function handleVisibility() {
      if (document.hidden) {
        cancel();
        setPlayback(null);
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      cancel();
    };
  }, [cancel]);

  const finish = useCallback((token: number, key: string, phase: PlaybackPhase) => {
    if (tokenRef.current !== token) return;

    setPlayback({ key, phase });

    if (phase === "done") {
      doneTimerRef.current = setTimeout(() => {
        if (tokenRef.current === token) setPlayback(null);
      }, DONE_HOLD_MS);
    }
  }, []);

  const play = useCallback<PlaybackControls["play"]>(
    (key, source, speed = "native") => {
      cancel();
      const token = tokenRef.current;
      setPlayback({ key, phase: "loading" });

      handleRef.current = playPronunciation(source, {
        speed,
        onStart: () => {
          if (tokenRef.current === token) setPlayback({ key, phase: "playing" });
        },
        onEnd: () => finish(token, key, "done"),
        onError: () => finish(token, key, "error"),
      });
    },
    [cancel, finish],
  );

  const playSteps = useCallback<PlaybackControls["playSteps"]>(
    (key, steps, options) => {
      cancel();
      const token = tokenRef.current;
      setPlayback({ key, phase: "loading" });

      let failed = false;

      handleRef.current = playSequence(steps, {
        onStep: (index) => {
          if (tokenRef.current !== token) return;
          setPlayback({ key, phase: "playing" });
          options?.onStep?.(index);
        },
        onError: () => {
          failed = true;
        },
        onEnd: () => finish(token, key, failed ? "error" : "done"),
      });
    },
    [cancel, finish],
  );

  const phaseFor = useCallback(
    (key: string) => (playback?.key === key ? playback.phase : undefined),
    [playback],
  );

  return {
    phaseFor,
    activeKey: playback?.key ?? null,
    play,
    playSteps,
    stop,
    isPlaying: playback?.phase === "playing" || playback?.phase === "loading",
  };
}
