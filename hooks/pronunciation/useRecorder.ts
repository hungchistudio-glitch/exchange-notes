"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";

import {
  INITIAL_RECORDER_STATE,
  MAX_RECORDING_MS,
  preferredRecordingMimeType,
  recorderReducer,
  recordingSupported,
  type RecorderState,
} from "@/lib/pronunciation/lab/recording";

/* =========================================================
   The microphone

   Everything effectful about recording, in one place, so that the rule that
   matters is enforceable in one place: when this hook goes away, the
   microphone goes away with it.

   A live MediaStream keeps the browser's recording indicator lit and, on a
   phone, keeps the microphone hardware awake. Leaving one behind after a
   route change is the kind of bug a user reads as spying rather than as a
   leak, so the teardown below covers every exit — unmount, stop, discard,
   error, and the timeout that ends an attempt nobody ended themselves.
   ========================================================= */

export type RecorderControls = {
  state: RecorderState;
  supported: boolean;
  start: () => Promise<void>;
  stop: () => void;
  /** Throws the clip away and returns to idle, releasing its object URL. */
  discard: () => void;
};

export default function useRecorder(): RecorderControls {
  const [state, dispatch] = useReducer(recorderReducer, INITIAL_RECORDER_STATE);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const startedAtRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clipUrlRef = useRef<string | null>(null);
  /** False once the component is gone, so late callbacks stop touching state. */
  const mountedRef = useRef(true);

  const releaseStream = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const recorder = recorderRef.current;
    if (recorder) {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      recorder.onerror = null;
      if (recorder.state !== "inactive") {
        try {
          recorder.stop();
        } catch {
          // Already stopping. The tracks below are what actually matters.
        }
      }
      recorderRef.current = null;
    }

    // The tracks, not just the recorder: stopping a MediaRecorder does not
    // release the microphone, and this is the line that turns the indicator
    // off.
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const revokeClip = useCallback(() => {
    if (clipUrlRef.current) {
      URL.revokeObjectURL(clipUrlRef.current);
      clipUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    if (!recordingSupported()) {
      dispatch({ type: "unsupported" });
    }

    return () => {
      mountedRef.current = false;
      releaseStream();
      revokeClip();
    };
  }, [releaseStream, revokeClip]);

  const stop = useCallback(() => {
    const recorder = recorderRef.current;

    if (recorder && recorder.state !== "inactive") {
      // Leaves onstop attached — that handler is what produces the clip.
      // The stream itself is released there.
      try {
        recorder.stop();
      } catch {
        releaseStream();
      }
      return;
    }

    releaseStream();
  }, [releaseStream]);

  const discard = useCallback(() => {
    releaseStream();
    revokeClip();
    dispatch({ type: "discard" });
  }, [releaseStream, revokeClip]);

  const start = useCallback(async () => {
    if (!recordingSupported()) {
      dispatch({ type: "unsupported" });
      return;
    }

    // A previous attempt's stream and clip go before a new one begins.
    releaseStream();
    revokeClip();
    dispatch({ type: "request" });

    let stream: MediaStream;

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      if (!mountedRef.current) return;

      const name = error instanceof DOMException ? error.name : "";
      dispatch(
        name === "NotAllowedError" || name === "SecurityError"
          ? { type: "denied" }
          : { type: "failed", error: "recorder-failed" },
      );
      return;
    }

    /*
     * The permission dialog is slow enough that a user can leave while it is
     * open. Landing here unmounted means the stream must be released
     * immediately rather than handed to a recorder nothing will ever stop.
     */
    if (!mountedRef.current) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }

    streamRef.current = stream;
    chunksRef.current = [];

    let recorder: MediaRecorder;

    try {
      const mimeType = preferredRecordingMimeType();
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    } catch {
      releaseStream();
      if (mountedRef.current) {
        dispatch({ type: "failed", error: "recorder-failed" });
      }
      return;
    }

    recorderRef.current = recorder;
    startedAtRef.current = Date.now();

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };

    recorder.onerror = () => {
      releaseStream();
      if (mountedRef.current) {
        dispatch({ type: "failed", error: "recorder-failed" });
      }
    };

    recorder.onstop = () => {
      const durationMs = Date.now() - startedAtRef.current;
      const chunks = chunksRef.current;
      chunksRef.current = [];

      releaseStream();

      if (!mountedRef.current) return;

      if (chunks.length === 0) {
        dispatch({ type: "failed", error: "no-audio" });
        return;
      }

      const blob = new Blob(chunks, {
        type: recorder.mimeType || "audio/webm",
      });
      const url = URL.createObjectURL(blob);

      // The previous URL is revoked here rather than in the reducer, which
      // has to stay pure — React may call it more than once per action.
      revokeClip();
      clipUrlRef.current = url;

      dispatch({ type: "captured", clipUrl: url, durationMs });
    };

    try {
      recorder.start();
    } catch {
      releaseStream();
      if (mountedRef.current) {
        dispatch({ type: "failed", error: "recorder-failed" });
      }
      return;
    }

    dispatch({ type: "started" });

    // Nobody means to record for ten seconds to say one word, and a
    // recording that never stops is a microphone that never releases.
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      stop();
    }, MAX_RECORDING_MS);
  }, [releaseStream, revokeClip, stop]);

  return {
    state,
    supported: state.status !== "unsupported",
    start,
    stop,
    discard,
  };
}
