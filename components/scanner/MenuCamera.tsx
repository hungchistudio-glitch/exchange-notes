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
  onCameraError: (message: string) => void;
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
  onCameraError,
}: MenuCameraProps) {
  const { t } = useTranslation();
  const copy = t.scanner.menu;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const agreeingFramesRef = useRef(0);
  const detectedRef = useRef(detected);

  const [ready, setReady] = useState(false);
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

  useEffect(() => {
    let cancelled = false;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        onCameraError(copy.cameraUnavailable);
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 2560 },
            height: { ideal: 1440 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        const [track] = stream.getVideoTracks() as unknown as TorchTrack[];
        setTorchAvailable(Boolean(track?.getCapabilities?.().torch));

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }

        setReady(true);
      } catch (error) {
        if (cancelled) return;

        const denied =
          error instanceof DOMException &&
          (error.name === "NotAllowedError" ||
            error.name === "PermissionDeniedError");

        onCameraError(
          denied ? copy.cameraPermissionDenied : copy.cameraUnavailable,
        );
      }
    }

    void start();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
    // Started once for the life of the screen. The copy strings are only read
    // on failure, and re-running this would mean a second permission prompt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  function importPhoto(file: File) {
    const reader = new FileReader();

    reader.onload = () => {
      const source = typeof reader.result === "string" ? reader.result : "";
      if (!source) return;

      const image = new Image();

      image.onload = () => {
        const scale = Math.min(
          1,
          CAPTURE_MAX_EDGE / Math.max(image.width, image.height),
        );

        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));

        const context = canvas.getContext("2d");
        if (!context) return;

        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        const quality = assessQuality(
          analyseFrame(canvas, canvas.width, canvas.height),
        );

        onCaptured(
          canvas.toDataURL("image/jpeg", CAPTURE_QUALITY),
          quality.usable ? null : quality.reason,
        );
      };

      image.src = source;
    };

    reader.readAsDataURL(file);
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-black">
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
          className="flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md"
        >
          <X size={19} strokeWidth={2} />
        </button>

        <div className="flex flex-col items-end gap-2">
          <SegmentedControl<InterfaceLanguage>
            groupLabel={copy.targetLanguage}
            value={targetLanguage}
            onChange={onTargetLanguageChange}
            className="!bg-black/45 backdrop-blur-md"
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
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-md"
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
          className={`mb-5 text-center text-[13px] font-medium tracking-[0.02em] transition-colors duration-200 ${
            detected ? "text-[#6fd6ff]" : "text-white/70"
          }`}
        >
          {detected ? copy.detected : copy.cameraHint}
        </p>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label={copy.gallery}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-transform active:scale-95"
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
            className="flex h-[74px] w-[74px] items-center justify-center rounded-full border-[3px] border-white/85 transition-transform active:scale-95 disabled:opacity-40"
          >
            <span
              className={`h-[58px] w-[58px] rounded-full transition-colors duration-200 ${
                detected ? "bg-[#6fd6ff]" : "bg-white"
              }`}
            />
          </button>

          <span className="h-12 w-12" aria-hidden="true" />
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) importPhoto(file);
          }}
        />
      </div>
    </div>
  );
}
