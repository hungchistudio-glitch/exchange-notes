"use client";

/* =========================================================
   One camera for every kind of reading

   The capture screen, the menu scanner and the search sheet's image lookup
   each had their own idea of what a camera was. This is the one they share
   now. What differs between them — how big a frame to ask the sensor for,
   what happens to the photograph afterwards — arrives as props; everything
   about pointing a phone at something is here.

   The interaction model, stated once so the handlers below are readable:

   A tap selects. It picks the smallest candidate under the finger, or the
   nearest one just outside it, and makes that the target. Where the camera
   can be aimed, the same tap also sends focus there — the two cooperate,
   and stay separate, exactly as the spec asks: focus decides what the lens
   renders sharply, the target decides what gets read.

   A pinch zooms, on hardware that has a zoom. On hardware that does not —
   every iPhone, in a browser — nothing happens, and no zoom control is
   drawn. See ZoomControl for why a fake one would be worse.

   The shutter freezes whatever target is current at that instant. Not the
   one that arrives a frame later: the reader pressed the button while
   looking at a particular rectangle, and that is the one they meant.

   Nothing here reads a ref while rendering. Both measurements the geometry
   needs — the box on screen and the frame the sensor is delivering — are
   pushed in by observers and events, so the first painted frame has real
   numbers rather than zeroes.
   ========================================================= */

import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, Images, X, Zap, ZapOff } from "lucide-react";

import AnalysingTargetIndicator from "@/components/camera/AnalysingTargetIndicator";
import FocusIndicator from "@/components/camera/FocusIndicator";
import TargetOverlay from "@/components/camera/TargetOverlay";
import ZoomControl from "@/components/camera/ZoomControl";
import { useCameraStream } from "@/hooks/camera/useCameraStream";
import { useElementSize } from "@/hooks/camera/useElementSize";
import { applyZoom, focusAt, setTorch } from "@/lib/media/cameraCapabilities";
import { DEFAULT_TARGET_RECT, MIN_TARGET_SIZE } from "@/lib/media/config";
import {
  clampRect,
  coverLayout,
  ensureMinimumSize,
  normalizedRectToViewport,
  pickTarget,
  sameRects,
  viewportPointToNormalized,
  type NormalizedRect,
  type Size,
} from "@/lib/media/geometry";
import { detectRegions } from "@/lib/media/regionDetection";
import { rasterFromVideo, type Raster } from "@/lib/media/raster";

/** Five times a second, the rate the menu detector settled on. */
const DETECTION_INTERVAL_MS = 200;

/** How long a focus confirmation stays up. */
const FOCUS_VISIBLE_MS = 900;

/** How long the zoom readout lingers after a pinch ends. */
const ZOOM_READOUT_MS = 1200;



export type CameraCapture = {
  raster: Raster;
  targetRect: NormalizedRect;
};

export type TargetCameraCopy = {
  close: string;
  shutter: string;
  torchOn: string;
  torchOff: string;
  photoLibrary: string;
  importFile: string;
  zoom: string;
  zoomLevel: string;
  hint: string;
  selectedTarget: string;
  candidateTarget: string;
  focused: string;
  analysing: string;
  permissionDenied: string;
  unavailable: string;
  retry: string;
};

type TargetCameraProps = {
  copy: TargetCameraCopy;
  onCapture: (capture: CameraCapture) => void;
  onClose: () => void;
  onPickPhoto: (file: File) => void;
  /** Omitted where a screen has no file import. */
  onPickFile?: (file: File) => void;
  fileAccept?: string;
  ideal?: { width: number; height: number };
  /** Shown over the preview while the caller works on a capture. */
  busy?: boolean;
};

export default function TargetCamera({
  copy,
  onCapture,
  onClose,
  onPickPhoto,
  onPickFile,
  fileAccept = "application/pdf",
  ideal,
  busy = false,
}: TargetCameraProps) {
  const { ref: frameRef, size: boxSize, measure } =
    useElementSize<HTMLDivElement>();
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const {
    videoRef,
    stream,
    status,
    capabilities,
    suspend,
    resume,
    freeze,
    unfreeze,
    retry,
  } = useCameraStream({ ideal });

  const [natural, setNatural] = useState<Size | null>(null);
  const [candidates, setCandidates] = useState<NormalizedRect[]>([]);
  const [target, setTarget] = useState<NormalizedRect | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [readoutVisible, setReadoutVisible] = useState(false);
  const [focusPoint, setFocusPoint] = useState<{
    x: number;
    y: number;
    id: number;
  } | null>(null);

  /*
   * The lens position, with the hardware's own base as the value until the
   * reader moves it. Derived rather than synced from an effect: a zoom that
   * lives in state and is initialised by an effect spends one render
   * disagreeing with the lens.
   */
  const [zoomOverride, setZoomOverride] = useState<number | null>(null);
  const zoom = zoomOverride ?? capabilities.zoom?.min ?? 1;

  /*
   * The target the shutter will use, kept in a ref as well as in state.
   * Reading it from state inside the capture handler would read the value
   * from the render the button was drawn in, which is one detection tick
   * behind what the reader is looking at.
   */
  const targetRef = useRef<NormalizedRect | null>(null);
  useEffect(() => {
    targetRef.current = target;
  }, [target]);

  const focusTimer = useRef<number | null>(null);
  const readoutTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (focusTimer.current) window.clearTimeout(focusTimer.current);
      if (readoutTimer.current) window.clearTimeout(readoutTimer.current);
    },
    [],
  );

  /* ---------- live candidates ---------- */

  useEffect(() => {
    if (status !== "live" || busy) return;

    const interval = window.setInterval(() => {
      const video = videoRef.current;

      // Nothing to read from a hidden tab, and reading anyway keeps a
      // backgrounded phone's GPU busy for no one's benefit.
      if (!video || document.hidden || !video.videoWidth) return;

      const next = detectRegions(video, video.videoWidth, video.videoHeight);

      /*
       * Keeping the previous array when nothing moved is what makes this
       * affordable. React bails out on an identical reference, so a camera
       * held still costs one pixel pass every 200ms and no render at all —
       * rather than re-rendering a full-screen component five times a
       * second to draw the same four rectangles.
       */
      setCandidates((current) => (sameRects(current, next) ? current : next));
    }, DETECTION_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, [status, busy, videoRef]);

  /* ---------- geometry ---------- */

  /*
   * Computed during render from two pieces of state, so it is always the
   * layout the reader is actually looking at. Under object-cover a fraction
   * of the sensor frame is not a fraction of the screen — the strips either
   * side are real pixels the reader cannot see — and this is what keeps a
   * tap and a drawn rectangle agreeing about that.
   */
  const layout =
    natural && boxSize?.width ? coverLayout(natural, boxSize) : null;

  const toBoxFraction = useCallback(
    (rect: NormalizedRect): NormalizedRect | null => {
      if (!natural || !boxSize?.width || !layout) return null;

      const viewportRect = normalizedRectToViewport(rect, natural, layout);

      return {
        x: viewportRect.x / boxSize.width,
        y: viewportRect.y / boxSize.height,
        width: viewportRect.width / boxSize.width,
        height: viewportRect.height / boxSize.height,
      };
    },
    [natural, boxSize, layout],
  );

  /* ---------- tapping ---------- */

  const handleTap = useCallback(
    async (event: React.PointerEvent<HTMLDivElement>) => {
      if (busy || status !== "live" || !natural || !layout) return;

      const box = measure();
      if (!box) return;

      const local = {
        x: event.clientX - box.left,
        y: event.clientY - box.top,
      };

      const point = viewportPointToNormalized(local, natural, layout);
      const picked = pickTarget(candidates, point);

      setTarget(
        picked
          ? clampRect(picked)
          : /*
             * A tap on nothing still means something: it moves the target
             * to where the reader pointed. Doing nothing here would make
             * the camera feel broken on a plain object with no text on it,
             * which is half of what this app is used for.
             */
            ensureMinimumSize(
              clampRect({
                x: point.x - DEFAULT_TARGET_RECT.width / 2,
                y: point.y - DEFAULT_TARGET_RECT.height / 2,
                width: DEFAULT_TARGET_RECT.width,
                height: DEFAULT_TARGET_RECT.height,
              }),
              MIN_TARGET_SIZE,
            ),
      );

      /*
       * Focus is asked for, and the indicator is only drawn if the camera
       * said yes. An animation over a lens that did not move is the same
       * lie as a fake zoom, one second long.
       */
      if (!(await focusAt(stream, capabilities, point))) return;

      setFocusPoint({ x: local.x, y: local.y, id: Date.now() });

      if (focusTimer.current) window.clearTimeout(focusTimer.current);
      focusTimer.current = window.setTimeout(
        () => setFocusPoint(null),
        FOCUS_VISIBLE_MS,
      );
    },
    [busy, status, natural, layout, measure, candidates, stream, capabilities],
  );

  /* ---------- pinch ---------- */

  const pinchRef = useRef({
    pointers: new Map<number, { x: number; y: number }>(),
    startDistance: 0,
    startZoom: 1,
  });

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const pinch = pinchRef.current;

      pinch.pointers.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });

      if (pinch.pointers.size !== 2 || !capabilities.zoom) return;

      const [a, b] = [...pinch.pointers.values()];
      pinch.startDistance = Math.hypot(a.x - b.x, a.y - b.y);
      pinch.startZoom = zoom;

      if (readoutTimer.current) window.clearTimeout(readoutTimer.current);
      setReadoutVisible(true);
    },
    [capabilities.zoom, zoom],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const pinch = pinchRef.current;

      if (!pinch.pointers.has(event.pointerId)) return;

      pinch.pointers.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });

      if (pinch.pointers.size !== 2 || !capabilities.zoom) return;
      if (pinch.startDistance <= 0) return;

      const [a, b] = [...pinch.pointers.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);

      void applyZoom(
        stream,
        capabilities,
        pinch.startZoom * (distance / pinch.startDistance),
      ).then((applied) => {
        if (applied !== null) setZoomOverride(applied);
      });
    },
    [capabilities, stream],
  );

  const endPointer = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const pinch = pinchRef.current;
      const wasPinching = pinch.pointers.size === 2;

      pinch.pointers.delete(event.pointerId);

      if (wasPinching) {
        pinch.startDistance = 0;

        readoutTimer.current = window.setTimeout(
          () => setReadoutVisible(false),
          ZOOM_READOUT_MS,
        );

        // A pinch that ends is not a tap; swallowing it here keeps the
        // target from jumping to wherever the last finger came up.
        return;
      }

      if (pinch.pointers.size === 0 && event.type === "pointerup") {
        void handleTap(event);
      }
    },
    [handleTap],
  );

  /* ---------- shutter ---------- */

  const capture = useCallback(() => {
    const video = videoRef.current;

    if (!video || busy || status !== "live") return;

    const raster = rasterFromVideo(video);

    if (!raster) return;

    /*
     * The preview stops here, on the frame that was just taken.
     *
     * It used to carry on running through the whole recognition — three to
     * seven seconds of the room moving behind a progress message, which
     * reads as the shutter not having fired. Holding the frame is what makes
     * the wait obviously *about* the picture you just took.
     */
    freeze();

    onCapture({
      raster,
      targetRect: clampRect(targetRef.current ?? DEFAULT_TARGET_RECT),
    });
  }, [videoRef, busy, status, onCapture, freeze]);

  /*
   * Let it run again when the caller is done and has not navigated away.
   * Most callers close the camera on an answer, so this usually matters
   * only for a failure — where the reader is left looking at a live camera
   * they can immediately use again rather than a frozen one they cannot.
   */
  useEffect(() => {
    if (!busy) unfreeze();
  }, [busy, unfreeze]);

  /* ---------- pickers ---------- */

  const openPicker = useCallback(
    (input: HTMLInputElement | null) => {
      if (!input) return;
      // The camera is given up so the picker can have it; the stream hook's
      // visibility handler takes it back whether or not a file was chosen.
      suspend();
      input.click();
    },
    [suspend],
  );

  useEffect(() => {
    const inputs = [photoInputRef.current, fileInputRef.current];

    function onCancel() {
      resume();
    }

    inputs.forEach((input) => input?.addEventListener("cancel", onCancel));

    return () => {
      inputs.forEach((input) => input?.removeEventListener("cancel", onCancel));
    };
  }, [resume]);

  const overlayCandidates = candidates
    .map(toBoxFraction)
    .filter((rect): rect is NormalizedRect => rect !== null);

  /*
   * The centre region stands in until the reader picks something.
   *
   * `target` started as null and the overlay draws nothing without one — so
   * a reader who never tapped saw no frame at all, and, once the shutter
   * went, no scanning animation either, because that is drawn on the target.
   * The shutter has always fallen back to this same rectangle; the screen
   * simply never said so.
   */
  const effectiveTarget = target ?? DEFAULT_TARGET_RECT;
  const overlayTarget = toBoxFraction(effectiveTarget);
  const unavailable = status === "denied" || status === "unavailable";

  return (
      /*
       * Above the surfaces that open it, below the ones that outrank
       * everything.
       *
       * This screen sat at z-100 and the lexicon search sheet sits at
       * z-130, so tapping the camera key inside that sheet started the
       * stream — the recording light came on — and drew the viewfinder
       * underneath the sheet that launched it. A working camera nobody
       * could see.
       *
       * 150 clears the sheet (130) and the tutorial (120), and stays under
       * the service-worker notice (200) and the top modal layer (300),
       * which the camera never shares a moment with.
       */
    <section className="fixed inset-0 z-[150] overflow-hidden overscroll-none bg-black">
      <div
        ref={frameRef}
        className="absolute inset-0 touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
      >
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          onLoadedMetadata={(event) =>
            setNatural({
              width: event.currentTarget.videoWidth,
              height: event.currentTarget.videoHeight,
            })
          }
          className="absolute inset-0 h-full w-full object-cover"
        />

        {!unavailable && (
          <TargetOverlay
            candidates={overlayCandidates}
            selected={overlayTarget}
            selectedLabel={copy.selectedTarget}
            candidateLabel={copy.candidateTarget}
            busy={busy}
          />
        )}

        <FocusIndicator point={focusPoint} label={copy.focused} />
      </div>

      {/* Top row: only what the moment needs. */}
      <div
        className="pointer-events-none absolute inset-x-0 flex items-start justify-between px-4"
        style={{ top: "max(1rem, env(safe-area-inset-top))" }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={copy.close}
          className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-md transition-transform duration-150 active:scale-90"
        >
          <X size={20} strokeWidth={1.8} aria-hidden="true" />
        </button>

        {capabilities.torch && (
          <button
            type="button"
            onClick={async () => {
              const next = !torchOn;
              if (await setTorch(stream, next)) setTorchOn(next);
            }}
            aria-pressed={torchOn}
            aria-label={torchOn ? copy.torchOff : copy.torchOn}
            className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-md transition-transform duration-150 active:scale-90"
          >
            {torchOn ? (
              <Zap size={20} strokeWidth={1.8} aria-hidden="true" />
            ) : (
              <ZapOff size={20} strokeWidth={1.8} aria-hidden="true" />
            )}
          </button>
        )}
      </div>

      {unavailable && (
        <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 rounded-3xl bg-black/60 p-6 text-center text-white backdrop-blur-xl">
          <p className="text-sm leading-relaxed">
            {status === "denied" ? copy.permissionDenied : copy.unavailable}
          </p>

          {/*
            The library is offered here as a real control, not only as the
            small key in the corner.

            This screen replaced a plain file input, which needed no camera
            permission at all — so the first thing a reader who has denied
            it, or who is on an origin they never granted, now meets is a
            black rectangle. "Try again" cannot help them: on iOS the
            decision is sticky per site and is changed in Settings, not by
            asking twice. Choosing a photo can help them, immediately, and
            it is the path this key used to take anyway.
          */}
          <div className="mt-4 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => openPicker(photoInputRef.current)}
              className="w-full rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black"
            >
              {copy.photoLibrary}
            </button>

            <button
              type="button"
              onClick={retry}
              className="w-full rounded-full border border-white/30 px-5 py-2.5 text-sm font-semibold text-white"
            >
              {copy.retry}
            </button>
          </div>
        </div>
      )}

      {/* Thumb zone: hint, zoom, then the three controls. */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-4 bg-gradient-to-t from-black/55 to-transparent pt-16"
        style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
      >
        {/*
          Above the zoom control and the shutter, centred, and clear of the
          target frame — which is drawn over the preview, not down here.
        */}
        <AnalysingTargetIndicator active={busy} label={copy.analysing} />

        {!busy && !unavailable && (
          <p className="rounded-full bg-black/25 px-3 py-1.5 text-[11px] font-medium tracking-wide text-white/90 backdrop-blur-md">
            {copy.hint}
          </p>
        )}

        <ZoomControl
          capabilities={capabilities}
          zoom={zoom}
          onZoom={(value) => {
            void applyZoom(stream, capabilities, value).then((applied) => {
              if (applied !== null) setZoomOverride(applied);
            });
          }}
          readoutVisible={readoutVisible}
          label={copy.zoom}
          formatLevel={(level) => copy.zoomLevel.replace("{level}", level)}
        />

        <div className="pointer-events-auto flex w-full items-center justify-center gap-10 px-8">
          <button
            type="button"
            onClick={() => openPicker(photoInputRef.current)}
            aria-label={copy.photoLibrary}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md transition-transform active:scale-90"
          >
            <Images size={20} strokeWidth={1.7} aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={capture}
            disabled={busy || unavailable}
            aria-label={copy.shutter}
            className="flex h-[74px] w-[74px] items-center justify-center rounded-full border-[3px] border-white/90 transition-transform duration-150 active:scale-90 disabled:opacity-40"
          >
            <span className="h-[58px] w-[58px] rounded-full bg-white shadow-[0_2px_12px_rgba(0,0,0,0.3)]" />
          </button>

          {onPickFile ? (
            <button
              type="button"
              onClick={() => openPicker(fileInputRef.current)}
              aria-label={copy.importFile}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-md transition-transform active:scale-90"
            >
              <FileText size={20} strokeWidth={1.7} aria-hidden="true" />
            </button>
          ) : (
            // Keeps the shutter centred without a second layout branch.
            <span className="h-12 w-12" aria-hidden="true" />
          )}
        </div>
      </div>

      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onPickPhoto(file);
          else resume();
        }}
      />

      {onPickFile && (
        <input
          ref={fileInputRef}
          type="file"
          accept={fileAccept}
          className="hidden"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) onPickFile(file);
            else resume();
          }}
        />
      )}
    </section>
  );
}
