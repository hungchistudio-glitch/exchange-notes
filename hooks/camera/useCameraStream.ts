"use client";

/* =========================================================
   One camera, opened and closed properly

   Three screens each grew their own copy of this: the capture screen, the
   menu camera and the QR scanner. They disagreed about almost everything
   that matters — whether the preview comes back after the photo picker
   steals it, whether a cancelled picker restarts the stream, whether the
   stream is stopped when the component unmounts mid-open. The menu camera
   had the most complete answer, having been debugged against real iPhones;
   this is that answer, extracted, with capability reading added.

   The hard part is not opening a camera. It is that a stream can be taken
   away at any moment — the photo picker on iOS suspends the video element,
   a call arrives, the app is backgrounded — and the failure mode is not an
   error but a frozen frame, which looks exactly like a working camera
   pointed at something that is not moving.
   ========================================================= */

import { useCallback, useEffect, useRef, useState } from "react";

import {
  NO_CAPABILITIES,
  readCapabilities,
  type CameraCapabilities,
} from "@/lib/media/cameraCapabilities";

export type CameraStatus =
  | "idle"
  | "starting"
  | "live"
  | "denied"
  | "unavailable";

export type UseCameraStreamOptions = {
  /**
   * There is no `active` flag, and that is deliberate.
   *
   * Mounting this hook *is* asking for the camera; unmounting releases it.
   * A flag would mean a code path that stops a live stream from inside an
   * effect body, which this project's cascading-render rule forbids and
   * which is redundant anyway — the caller can simply not render the
   * component that wants a camera.
   */
  facing?: "environment" | "user";
  /**
   * What to ask the sensor for.
   *
   * Menus want everything the hardware has; naming one object does not. The
   * request is an `ideal`, so a camera that cannot manage it returns what
   * it can rather than failing.
   */
  ideal?: { width: number; height: number };
};

export type CameraStream = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  stream: MediaStream | null;
  status: CameraStatus;
  capabilities: CameraCapabilities;
  /** Release the stream so the photo picker can have the camera. */
  suspend: () => void;
  /** Take it back. Safe to call when it was never suspended. */
  resume: () => void;
  /**
   * Hold the preview on its current frame.
   *
   * What the reader sees after the shutter should be the picture they took,
   * not the room continuing to move behind a progress message — the live
   * preview made a three-second wait look like the tap had done nothing.
   * The stream stays open, so unfreezing is instant and costs no permission
   * prompt.
   */
  freeze: () => void;
  /** Let the preview run again. */
  unfreeze: () => void;
  retry: () => void;
};

const DEFAULT_IDEAL = { width: 1920, height: 1080 };

export function useCameraStream({
  facing = "environment",
  ideal = DEFAULT_IDEAL,
}: UseCameraStreamOptions = {}): CameraStream {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startingRef = useRef(false);
  const releasedRef = useRef(false);
  /*
   * Set while the caller has deliberately given the camera up — to the
   * photo picker, mostly. Distinguishes "no stream because we let go" from
   * "no stream because it never opened", which need opposite responses when
   * the page becomes visible again.
   */
  const suspendedRef = useRef(false);
  /*
   * Set while the preview is deliberately held on one frame. The visibility
   * handler below plays a paused video on the way back, which is right for a
   * video iOS paused on its own and wrong for one we stopped on purpose.
   */
  const frozenRef = useRef(false);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [capabilities, setCapabilities] =
    useState<CameraCapabilities>(NO_CAPABILITIES);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    const video = videoRef.current;

    if (video) {
      video.pause();
      video.srcObject = null;
    }

    setStream(null);
    setCapabilities(NO_CAPABILITIES);
  }, []);

  const start = useCallback(async () => {
    if (streamRef.current || startingRef.current) return;

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unavailable");
      return;
    }

    startingRef.current = true;
    setStatus("starting");

    try {
      const opened = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: ideal.width },
          height: { ideal: ideal.height },
        },
        audio: false,
      });

      /*
       * The screen may have gone while the permission prompt was up. Handing
       * the stream to a dead component leaks a camera that stays lit until
       * the tab closes — the light on the phone stays on, which readers
       * notice and rightly dislike.
       */
      if (releasedRef.current) {
        opened.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = opened;
      setStream(opened);
      setCapabilities(readCapabilities(opened));
      setStatus("live");

      if (videoRef.current) {
        videoRef.current.srcObject = opened;
        await videoRef.current.play()?.catch(() => {});
      }
    } catch (error) {
      if (releasedRef.current) return;

      const denied =
        error instanceof DOMException &&
        (error.name === "NotAllowedError" ||
          error.name === "PermissionDeniedError");

      setStatus(denied ? "denied" : "unavailable");
    } finally {
      startingRef.current = false;
    }
  }, [facing, ideal.height, ideal.width]);

  useEffect(() => {
    releasedRef.current = false;

    /*
     * Deferred a tick: starting sets state, and doing that synchronously in
     * an effect body trips this project's cascading-render rule. The
     * permission prompt lands in the same frame either way.
     */
    queueMicrotask(() => {
      if (!releasedRef.current) void start();
    });

    return () => {
      releasedRef.current = true;
      // Read off the ref rather than through stop(), because this runs after
      // the component is gone and setState would warn.
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [start]);

  const suspend = useCallback(() => {
    suspendedRef.current = true;
    stop();
  }, [stop]);

  const resume = useCallback(() => {
    suspendedRef.current = false;
    void start();
  }, [start]);

  const freeze = useCallback(() => {
    frozenRef.current = true;
    videoRef.current?.pause();
  }, []);

  const unfreeze = useCallback(() => {
    frozenRef.current = false;
    /*
     * `?.catch` on the result, not just on the element: play() is specified
     * to return a promise but does not everywhere — jsdom returns undefined,
     * and so do older mobile browsers. Calling .catch on that throws, which
     * turned "let the preview run again" into a crash on mount.
     */
    void videoRef.current?.play()?.catch(() => {});
  }, []);

  /**
   * The preview comes back when the screen does.
   *
   * Inherited wholesale from the menu camera, where it was arrived at the
   * hard way. Opening the photo picker, taking a call or switching apps
   * suspends the video element on iOS and it does not always resume itself.
   * A cancelled picker fires no event of its own on every browser, which is
   * why this hangs off visibility rather than off the input.
   */
  useEffect(() => {
    function revive() {
      if (document.hidden) return;

      if (!streamRef.current && suspendedRef.current) {
        suspendedRef.current = false;
        void start();
        return;
      }

      // A frame held on purpose is not a frame iOS took away.
      if (frozenRef.current) return;

      const video = videoRef.current;
      if (!video || !video.paused || !video.srcObject) return;

      void video.play()?.catch(() => {});
    }

    document.addEventListener("visibilitychange", revive);
    window.addEventListener("focus", revive);

    return () => {
      document.removeEventListener("visibilitychange", revive);
      window.removeEventListener("focus", revive);
    };
  }, [start]);

  /*
   * The element is given the stream here as well as at open time. A video
   * that mounts after the stream arrives — the overlay animating in, say —
   * would otherwise show black forever.
   */
  useEffect(() => {
    const video = videoRef.current;

    if (!video || !stream || video.srcObject === stream) return;

    video.srcObject = stream;
    void video.play()?.catch(() => {});
  }, [stream]);

  const retry = useCallback(() => {
    setStatus("idle");
    void start();
  }, [start]);

  return {
    videoRef,
    stream,
    status,
    capabilities,
    suspend,
    resume,
    freeze,
    unfreeze,
    retry,
  };
}
