"use client";

import jsQR from "jsqr";
import { Camera, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import useTranslation from "@/hooks/i18n/useTranslation";
import { exchangeIdFromInviteUrl } from "@/lib/friends";

type FriendQrScannerProps = {
  onDetected: (exchangeId: string) => void;
};

/*
 * jsQR works on raw pixels, so the frame has to land on a canvas first. A
 * phone camera hands back 720p or better, which is far more than a QR code
 * needs and costs real time per frame to scan, so frames are drawn down to
 * this width. Below roughly 480 the finder patterns of a code held at arm's
 * length start to get lost.
 */
const DECODE_WIDTH = 640;

/*
 * Decoding every frame pins a phone CPU at 60fps for no benefit — a code that
 * is in view stays in view. Eight looks a second finds it fast enough to feel
 * instant while leaving the camera preview smooth.
 */
const DECODE_INTERVAL_MS = 125;

export default function FriendQrScanner({
  onDetected,
}: FriendQrScannerProps) {
  const { t } = useTranslation();
  const copy = t.friends.scanner;
  const errorCopy = t.friends.errors;

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastDecodeRef = useRef(0);
  // Remembers the last payload already rejected, so pointing the camera at
  // some other QR code reports "not an Exchange Notes code" once rather than
  // re-setting the same message eight times a second.
  const rejectedRef = useRef("");

  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");

  const stopCamera = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    const video = videoRef.current;

    if (video) {
      video.srcObject = null;
    }

    setScanning(false);
  }, []);

  // A camera left running because the component unmounted mid-scan keeps the
  // hardware light on, which reads as the app spying.
  useEffect(() => stopCamera, [stopCamera]);

  const startDecodeLoop = useCallback(() => {
    // Declared inside so the loop can reschedule itself without the component
    // holding a self-referential callback.
    function tick() {
      frameRef.current = requestAnimationFrame(tick);

      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (
        !video
        || !canvas
        || document.hidden
        || video.readyState < video.HAVE_CURRENT_DATA
        || !video.videoWidth
      ) {
        return;
      }

      const now = performance.now();

      if (now - lastDecodeRef.current < DECODE_INTERVAL_MS) {
        return;
      }

      lastDecodeRef.current = now;

      const scale = Math.min(1, DECODE_WIDTH / video.videoWidth);
      const width = Math.round(video.videoWidth * scale);
      const height = Math.round(video.videoHeight * scale);

      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d", { willReadFrequently: true });

      if (!context) {
        return;
      }

      context.drawImage(video, 0, 0, width, height);

      const result = jsQR(
        context.getImageData(0, 0, width, height).data,
        width,
        height,
        // The codes this app generates are dark-on-light, and letting jsQR
        // also try the inverted reading doubles the per-frame cost for
        // nothing.
        { inversionAttempts: "dontInvert" },
      );

      if (!result) {
        return;
      }

      const exchangeId = exchangeIdFromInviteUrl(result.data);

      if (!exchangeId) {
        if (rejectedRef.current !== result.data) {
          rejectedRef.current = result.data;
          setError(errorCopy.invalidQr);
        }

        return;
      }

      stopCamera();
      onDetected(exchangeId);
    }

    lastDecodeRef.current = 0;
    tick();
  }, [errorCopy.invalidQr, onDetected, stopCamera]);

  const startCamera = useCallback(async () => {
    setError("");
    rejectedRef.current = "";

    // getUserMedia is undefined rather than merely failing outside a secure
    // context, so this check has to come first to say something useful.
    if (!window.isSecureContext) {
      setError(errorCopy.secureContext);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setError(errorCopy.unsupportedCamera);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });

      streamRef.current = stream;
      setScanning(true);

      const video = videoRef.current;

      if (video) {
        video.srcObject = stream;
        await video.play();
      }

      startDecodeLoop();
    } catch (cameraError) {
      const name =
        cameraError instanceof DOMException ? cameraError.name : "";

      if (name === "NotAllowedError" || name === "SecurityError") {
        setError(errorCopy.cameraPermissionDenied);
      } else if (
        name === "NotFoundError"
        || name === "OverconstrainedError"
      ) {
        setError(errorCopy.noCamera);
      } else if (name === "NotReadableError" || name === "AbortError") {
        setError(errorCopy.cameraInUse);
      } else {
        console.error(cameraError);
        setError(errorCopy.cameraUnavailable);
      }

      stopCamera();
    }
  }, [errorCopy, startDecodeLoop, stopCamera]);

  return (
    <div className="mt-5 flex flex-col items-center">
      <p className="text-center text-sm text-black/60">
        {copy.description}
      </p>

      <div className="relative mt-4 flex aspect-square w-full max-w-[260px] items-center justify-center overflow-hidden rounded-3xl border border-line bg-black/[0.03]">
        <video
          ref={videoRef}
          playsInline
          muted
          aria-label={copy.title}
          className={`h-full w-full object-cover ${
            scanning ? "" : "hidden"
          }`}
        />

        {scanning ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-8 rounded-2xl border-2 border-white/80"
          />
        ) : (
          <button
            type="button"
            onClick={startCamera}
            aria-label={copy.start}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-black text-white transition-transform active:scale-95"
          >
            <Camera size={24} strokeWidth={1.8} />
          </button>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {scanning ? (
        <div className="mt-4 flex items-center gap-3">
          <span className="text-sm font-semibold text-ink-soft">
            {copy.scanning}
          </span>

          <button
            type="button"
            onClick={stopCamera}
            aria-label={copy.stop}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-black/60 transition-transform active:scale-95"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>
      ) : (
        <p className="mt-3 text-sm font-semibold text-ink-soft">
          {copy.start}
        </p>
      )}

      {error && (
        <p className="mt-3 text-center text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
