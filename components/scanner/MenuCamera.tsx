"use client";

import { Images, X, Zap, ZapOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import SegmentedControl from "@/components/foundation/forms/SegmentedControl";
import useTranslation from "@/hooks/i18n/useTranslation";
import styles from "@/components/scanner/MenuCamera.module.css";
import {
  analyseFrame,
  assessQuality,
  DETECTION_LOCK_FRAMES,
  DETECTION_RELEASE_FRAMES,
} from "@/lib/scanner/imageAnalysis";
import type { InterfaceLanguage } from "@/lib/appPreferences";

/*
 * The long edge of the photo that gets sent for reading.
 *
 * 1800 rather than the 1024 the rest of this app uses for vision: a menu is
 * 9pt type photographed from a metre away, and every pixel dropped here is a
 * price that comes back wrong. It is the single biggest lever on quality in
 * the whole feature.
 */
const CAPTURE_MAX_EDGE = 1800;
const CAPTURE_QUALITY = 0.92;

// Five times a second. Fast enough that the marker lands while the user is
// still lining up, slow enough to leave the preview alone.
const DETECTION_INTERVAL_MS = 200;

type MenuCameraProps = {
  detected: boolean;
  targetLanguage: InterfaceLanguage;
  onTargetLanguageChange: (language: InterfaceLanguage) => void;
  onDetectionChange: (detected: boolean) => void;
  onCaptured: (
    image: string,
    quality: "dark" | "glare" | "blur" | null,
  ) => void;
  onClose: () => void;
};

/*
 * The lamp is not in the standard capability or constraint types, and on the
 * browsers that do have it the shape is the same everywhere: a boolean in
 * capabilities, a boolean in an `advanced` constraint. Typed locally rather
 * than asserted at each call site.
 */
type TorchCapabilities = { torch?: boolean };

type TorchTrack = Omit<MediaStreamTrack, "getCapabilities"> & {
  getCapabilities?: () => TorchCapabilities;
};

export default function MenuCamera({
  detected,
  targetLanguage,
  onTargetLanguageChange,
  onDetectionChange,
  onCaptured,
  onClose,
}: MenuCameraProps) {
  const { t } = useTranslation();
  const copy = t.scanner.menu;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const agreeingFramesRef = useRef(0);
  const detectedRef = useRef(detected);
  const startingRef = useRef(false);
  const closedRef = useRef(false);
  const pickingRef = useRef(false);

  const [ready, setReady] = useState(false);
  /*
   * A camera that would not open is reported here rather than on a screen of
   * its own, because the answer to it is on this screen: the photo picker in
   * the corner works with no camera permission at all, and sending someone to
   * an error page with a "try again" button takes that away from them.
   */
  const [cameraError, setCameraError] = useState("");
  const [importError, setImportError] = useState("");
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [capturing, setCapturing] = useState(false);

  /*
   * The detector reads the current answer from a ref rather than from the
   * prop, so its interval does not have to be torn down and rebuilt every
   * time the lock flips. Mirrored in an effect, because writing a ref during
   * render is not allowed.
   */
  useEffect(() => {
    detectedRef.current = detected;
  }, [detected]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    const video = videoRef.current;
    if (video) {
      video.pause();
      video.srcObject = null;
    }

    setReady(false);
    setTorchOn(false);
  }, []);

  const startCamera = useCallback(async () => {
    if (streamRef.current || startingRef.current) return;

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(copy.cameraUnavailable);
      return;
    }

    startingRef.current = true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 2560 },
          height: { ideal: 1440 },
        },
        audio: false,
      });

      if (closedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      setCameraError("");

      const [track] = stream.getVideoTracks() as unknown as TorchTrack[];
      setTorchAvailable(Boolean(track?.getCapabilities?.().torch));

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      setReady(true);
    } catch (error) {
      if (closedRef.current) return;

      const denied =
        error instanceof DOMException &&
        (error.name === "NotAllowedError" ||
          error.name === "PermissionDeniedError");

      setCameraError(
        denied ? copy.cameraPermissionDenied : copy.cameraUnavailable,
      );
    } finally {
      startingRef.current = false;
    }
  }, [copy.cameraPermissionDenied, copy.cameraUnavailable]);

  useEffect(() => {
    closedRef.current = false;

    // Deferred a tick: starting the camera sets state, and doing that
    // synchronously in an effect body trips this project's cascading-render
    // rule. The permission prompt lands in the same frame either way.
    queueMicrotask(() => {
      void startCamera();
    });

    return () => {
      closedRef.current = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
    // Started once for the life of the screen. startCamera guards against a
    // second stream, but re-running this on every identity change would still
    // mean a needless teardown.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
   * Cancelling the picker, precisely.
   *
   * The visibility handler below is the fallback that works everywhere; this
   * is the exact signal where it exists (Safari 16.4+, Chrome 113+), so the
   * camera is back before the sheet has finished sliding away.
   */
  useEffect(() => {
    const input = fileInputRef.current;
    if (!input) return;

    function onCancel() {
      pickingRef.current = false;
      void startCamera();
    }

    input.addEventListener("cancel", onCancel);
    return () => input.removeEventListener("cancel", onCancel);
  }, [startCamera]);

  /*
   * The preview comes back when the screen does.
   *
   * Opening the photo picker, taking a call, or switching apps suspends the
   * video element on iOS, and it does not always resume itself — leaving a
   * frozen frame that looks exactly like a working camera pointed at
   * something that is not moving.
   */
  useEffect(() => {
    function resume() {
      if (document.hidden) return;

      /*
       * Coming back from the picker with no photo chosen: the stream was
       * released to let the picker open, so take it back. Cancelling a file
       * picker fires no event of its own on every browser, which is why this
       * hangs off visibility rather than off the input.
       */
      if (!streamRef.current && !cameraError) {
        /*
         * Cleared here as well as on the input's own events: a browser with
         * neither a cancel event nor a change event — an older Safari, a
         * picker dismissed by a system interruption — would otherwise leave
         * this set forever and the camera off for the rest of the session.
         * Restarting a camera that was about to unmount costs nothing;
         * leaving a dead preview costs the whole screen.
         */
        pickingRef.current = false;
        void startCamera();
        return;
      }

      const video = videoRef.current;
      if (!video || !video.paused) return;

      void video.play().catch(() => {});
    }

    document.addEventListener("visibilitychange", resume);
    window.addEventListener("focus", resume);

    return () => {
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("focus", resume);
    };
  }, [cameraError, startCamera]);

  /*
   * Detection, with hysteresis in frames rather than a timer: two agreeing
   * looks to lock on, four to let go. A marker that flickers while someone is
   * lining up a shot is worse than no marker.
   */
  useEffect(() => {
    if (!ready) return;

    const interval = window.setInterval(() => {
      const video = videoRef.current;
      if (!video || document.hidden) return;

      const analysis = analyseFrame(
        video,
        video.videoWidth,
        video.videoHeight,
      );

      if (!analysis) return;

      const wantsDetected = analysis.looksLikeDocument;

      if (wantsDetected === detectedRef.current) {
        agreeingFramesRef.current = 0;
        return;
      }

      agreeingFramesRef.current += 1;

      const needed = wantsDetected
        ? DETECTION_LOCK_FRAMES
        : DETECTION_RELEASE_FRAMES;

      if (agreeingFramesRef.current >= needed) {
        agreeingFramesRef.current = 0;
        onDetectionChange(wantsDetected);
      }
    }, DETECTION_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [ready, onDetectionChange]);

  const toggleTorch = useCallback(async () => {
    const [track] = (streamRef.current?.getVideoTracks() ??
      []) as unknown as TorchTrack[];
    if (!track) return;

    const next = !torchOn;

    try {
      await track.applyConstraints({
        advanced: [{ torch: next }],
      } as unknown as MediaTrackConstraints);
      setTorchOn(next);
    } catch {
      setTorchAvailable(false);
    }
  }, [torchOn]);

  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video || capturing) return;

    const { videoWidth, videoHeight } = video;
    if (!videoWidth || !videoHeight) return;

    setCapturing(true);

    const scale = Math.min(1, CAPTURE_MAX_EDGE / Math.max(videoWidth, videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(videoWidth * scale);
    canvas.height = Math.round(videoHeight * scale);

    const context = canvas.getContext("2d");

    if (!context) {
      setCapturing(false);
      return;
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Judged on the frame that was actually kept, not on the preview.
    const quality = assessQuality(
      analyseFrame(canvas, canvas.width, canvas.height),
    );

    onCaptured(
      canvas.toDataURL("image/jpeg", CAPTURE_QUALITY),
      quality.usable ? null : quality.reason,
    );

    setCapturing(false);
  }, [capturing, onCaptured]);

  /**
   * Decodes a chosen photo into something drawable.
   *
   * createImageBitmap first: it hands back a decoded image without the base64
   * round trip a FileReader forces, which on a 12-megapixel HEIC is the
   * difference between a pause and a stall. FileReader stays as the fallback
   * for browsers without it.
   */
  async function decodePhoto(
    file: File,
  ): Promise<ImageBitmap | HTMLImageElement> {
    if (typeof createImageBitmap === "function") {
      try {
        return await createImageBitmap(file);
      } catch {
        // A format this browser cannot decode, or a corrupt file. The path
        // below fails the same way, and reports it once.
      }
    }

    const source = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () =>
        typeof reader.result === "string"
          ? resolve(reader.result)
          : reject(new Error("unreadable"));
      reader.onerror = () => reject(new Error("unreadable"));
      reader.readAsDataURL(file);
    });

    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("undecodable"));
      image.src = source;
    });
  }

  /**
   * Opens the photo picker, with the camera released first.
   *
   * iOS will not present a file picker while a getUserMedia stream is live —
   * the tap does nothing at all, which is exactly what it looked like. Both
   * calls stay inside the click handler so the user activation that permits a
   * picker is still the one the tap created.
   */
  function openPicker() {
    pickingRef.current = true;
    stopCamera();
    fileInputRef.current?.click();
  }

  async function importPhoto(file: File) {
    setImportError("");

    try {
      const decoded = await decodePhoto(file);

      const scale = Math.min(
        1,
        CAPTURE_MAX_EDGE / Math.max(decoded.width, decoded.height),
      );

      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(decoded.width * scale));
      canvas.height = Math.max(1, Math.round(decoded.height * scale));

      const context = canvas.getContext("2d");
      if (!context) throw new Error("no-canvas");

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(decoded, 0, 0, canvas.width, canvas.height);

      if (typeof ImageBitmap !== "undefined" && decoded instanceof ImageBitmap) {
        decoded.close();
      }

      const quality = assessQuality(
        analyseFrame(canvas, canvas.width, canvas.height),
      );

      onCaptured(
        canvas.toDataURL("image/jpeg", CAPTURE_QUALITY),
        quality.usable ? null : quality.reason,
      );
    } catch {
      /*
       * Reported on the camera rather than by throwing the user to an error
       * screen: they are one tap from either choosing a different photo or
       * taking the shot themselves, and both beat a dead end.
       */
      setImportError(copy.importFailed);
    }
  }

  return (
    <div
      /*
       * Literal black and white throughout this screen. Cosmic Mode repoints
       * --color-black and --color-white at its own palette — which is right
       * for every panel in the app and wrong for a viewfinder, where black is
       * the absence of picture and white is the shutter.
       */
      /*
       * Above the dock, which is fixed across the whole bottom of the screen
       * at z-40 and renders after the page. At an equal z-index it won and
       * took every tap in the bottom strip with it — including the photo
       * picker in the corner, which is why that button did nothing at all.
       * Still below sheets and modals at z-100.
       */
      className="fixed inset-0 z-50 flex flex-col bg-[#000000]"
    >
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="absolute inset-0 h-full w-full object-cover"
      />

      <div
        className={`${styles.field} ${detected ? styles.locked : ""}`}
        style={{ "--scan-height": "100%" } as React.CSSProperties}
      >
        <span className={`${styles.corner} ${styles.topLeft}`} />
        <span className={`${styles.corner} ${styles.topRight}`} />
        <span className={`${styles.corner} ${styles.bottomLeft}`} />
        <span className={`${styles.corner} ${styles.bottomRight}`} />
        {detected ? <span className={styles.scanLine} /> : null}
      </div>

      {/* Top bar */}
      <div
        className="relative flex items-start justify-between gap-3 px-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.75rem)" }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={copy.close}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#000000]/45 text-[#ffffff] backdrop-blur-md"
        >
          <X size={19} strokeWidth={2} />
        </button>

        <div className="flex flex-col items-end gap-2">
          <SegmentedControl<InterfaceLanguage>
            groupLabel={copy.targetLanguage}
            value={targetLanguage}
            onChange={onTargetLanguageChange}
            className="!bg-[#000000]/45 backdrop-blur-md"
            options={[
              { value: "english", content: "EN", label: "English" },
              { value: "traditional-chinese", content: "中", label: "繁體中文" },
            ]}
          />

          {torchAvailable ? (
            <button
              type="button"
              onClick={() => void toggleTorch()}
              aria-label={torchOn ? copy.torchOff : copy.torchOn}
              aria-pressed={torchOn}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-[#000000]/45 text-[#ffffff] backdrop-blur-md"
            >
              {torchOn ? (
                <Zap size={18} strokeWidth={2} />
              ) : (
                <ZapOff size={18} strokeWidth={2} />
              )}
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex-1" />

      {/* Status + controls */}
      <div
        className="relative px-6 pb-8"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 2rem)" }}
      >
        <p
          aria-live="polite"
          className={`mb-5 text-center text-[13px] font-medium leading-5 tracking-[0.02em] transition-colors duration-200 ${
            importError || cameraError
              ? "text-amber-300"
              : detected
                ? "text-[#6fd6ff]"
                : "text-[#ffffff]/70"
          }`}
        >
          {importError ||
            cameraError ||
            (detected ? copy.detected : copy.cameraHint)}
        </p>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={openPicker}
            aria-label={copy.gallery}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ffffff]/10 text-[#ffffff] backdrop-blur-md transition-transform active:scale-95"
          >
            <Images size={20} strokeWidth={1.8} />
          </button>

          {/*
            Never disabled by detection. The detector is a hint about what the
            camera can see, not a gate on the shutter — a menu it fails to
            recognise is exactly the menu someone needs to photograph.
          */}
          <button
            type="button"
            onClick={capture}
            disabled={!ready || capturing}
            aria-label={copy.capture}
            className="flex h-[74px] w-[74px] items-center justify-center rounded-full border-[3px] border-[#ffffff]/85 transition-transform active:scale-95 disabled:opacity-40"
          >
            <span
              className={`h-[58px] w-[58px] rounded-full transition-colors duration-200 ${
                detected ? "bg-[#6fd6ff]" : "bg-[#ffffff]"
              }`}
            />
          </button>

          <span className="h-12 w-12" aria-hidden="true" />
        </div>

        {/*
          Visually hidden rather than display:none, and rendered rather than
          removed. Safari will not open a file picker for an input it does not
          consider laid out, which is the whole of "the button does nothing".
        */}
        <input
          ref={fileInputRef}
          type="file"
          /*
           * image/* rather than a list of formats. An iPhone's library is
           * HEIC, and an accept list that leaves it out does not filter the
           * picker — it greys nearly every photo in it out. Whatever comes
           * back is re-encoded to JPEG on the canvas anyway.
           */
          accept="image/*"
          aria-label={copy.gallery}
          className="absolute bottom-0 left-0 h-px w-px opacity-0"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            pickingRef.current = false;

            if (file) {
              void importPhoto(file);
            } else {
              void startCamera();
            }
          }}
        />
      </div>
    </div>
  );
}
