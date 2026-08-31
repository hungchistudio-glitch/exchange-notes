"use client";

/* =========================================================
   A still picture, with the same target behaviour as the camera

   One component for two jobs that turn out to be the same job: choosing a
   target on a photograph that came out of the library, and adjusting the
   crop on one that just came off the shutter. Both are "here is an image,
   point at the part that matters", and building them separately is how the
   app ended up with two image pipelines in the first place.

   The zoom here is a viewer zoom — it moves the picture on the glass, not a
   lens — and that is honest because there is no lens involved. The spec's
   requirement is that it must not corrupt the stored coordinates, which is
   handled in lib/media/geometry: the zoom is folded into the layout, and
   every conversion already goes through the layout, so there is no path
   that can forget to undo it.
   ========================================================= */

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, RotateCcw, X } from "lucide-react";

import { DEFAULT_TARGET_RECT, MIN_TARGET_SIZE } from "@/lib/media/config";
import {
  clampRect,
  containLayout,
  ensureMinimumSize,
  normalizedRectToViewport,
  pickTarget,
  viewportPointToNormalized,
  withViewerTransform,
  type NormalizedRect,
  type Point,
} from "@/lib/media/geometry";
import { detectRegions } from "@/lib/media/regionDetection";
import AnalysingTargetIndicator from "@/components/camera/AnalysingTargetIndicator";
import TargetOverlay from "@/components/camera/TargetOverlay";
import { useElementSize } from "@/hooks/camera/useElementSize";

const MAX_VIEWER_ZOOM = 6;



export type TargetImageViewerCopy = {
  close: string;
  confirm: string;
  reset: string;
  hint: string;
  selectedTarget: string;
  candidateTarget: string;
  busy: string;
  previousPage: string;
  nextPage: string;
  /** Carries {page} and {count}. */
  pageLabel: string;
};

/**
 * The page controls, for a source that has pages.
 *
 * Absent for a photograph, which is the ordinary case — a stepper reading
 * "1 of 1" over a picture somebody took is furniture.
 */
export type PageNavigation = {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
};

type TargetImageViewerProps = {
  /** An object URL or data URL for the image being examined. */
  src: string;
  copy: TargetImageViewerCopy;
  initialTarget?: NormalizedRect | null;
  onConfirm: (target: NormalizedRect) => void;
  onClose: () => void;
  busy?: boolean;
  pages?: PageNavigation | null;
};

export default function TargetImageViewer({
  src,
  copy,
  initialTarget = null,
  onConfirm,
  onClose,
  busy = false,
  pages = null,
}: TargetImageViewerProps) {
  const { ref: frameRef, size: boxSize, measure } =
    useElementSize<HTMLDivElement>();
  const imageRef = useRef<HTMLImageElement | null>(null);

  const [natural, setNatural] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [target, setTarget] = useState<NormalizedRect | null>(initialTarget);
  const [candidates, setCandidates] = useState<NormalizedRect[]>([]);
  /*
   * Turning a page remounts this whole component — the caller keys it on the
   * page number. A target chosen on page two must not survive onto page
   * three, where it would point at whatever happens to sit in the same
   * rectangle, and remounting is the version of that which cannot be
   * forgotten in a later edit.
   */
  const [viewer, setViewer] = useState<{ scale: number; offset: Point }>({
    scale: 1,
    offset: { x: 0, y: 0 },
  });

  /* ---------- candidates, once, when the image is ready ---------- */

  const onLoad = useCallback(() => {
    const image = imageRef.current;

    if (!image?.naturalWidth) return;

    const size = { width: image.naturalWidth, height: image.naturalHeight };
    setNatural(size);

    /*
     * Run once rather than on an interval. A still picture's candidates do
     * not change, and re-detecting them while the reader pans would be work
     * spent producing the same answer.
     */
    setCandidates(detectRegions(image, size.width, size.height));
  }, []);

  /* ---------- geometry ---------- */

  /*
   * Derived during render from state, never read off a ref. The viewer's
   * own zoom and pan are folded in here rather than undone at each call
   * site, which is what makes "zooming must not corrupt the coordinates"
   * true by construction instead of by vigilance.
   */
  const layout =
    natural && boxSize?.width
      ? withViewerTransform(containLayout(natural, boxSize), boxSize, viewer)
      : null;

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

  /* ---------- gestures ---------- */

  const gesture = useRef<{
    pointers: Map<number, Point>;
    startDistance: number;
    startScale: number;
    startOffset: Point;
    startCentre: Point;
    panned: boolean;
  }>({
    pointers: new Map(),
    startDistance: 0,
    startScale: 1,
    startOffset: { x: 0, y: 0 },
    startCentre: { x: 0, y: 0 },
    panned: false,
  });

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const state = gesture.current;

      state.pointers.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });

      if (state.pointers.size === 1) {
        state.startOffset = viewer.offset;
        state.startCentre = { x: event.clientX, y: event.clientY };
        state.panned = false;
        return;
      }

      if (state.pointers.size === 2) {
        const [a, b] = [...state.pointers.values()];
        state.startDistance = Math.hypot(a.x - b.x, a.y - b.y);
        state.startScale = viewer.scale;
        state.startOffset = viewer.offset;
        state.panned = true;
      }
    },
    [viewer],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const state = gesture.current;

      if (!state.pointers.has(event.pointerId)) return;

      state.pointers.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });

      if (state.pointers.size === 2) {
        const [a, b] = [...state.pointers.values()];
        const distance = Math.hypot(a.x - b.x, a.y - b.y);

        if (state.startDistance <= 0) return;

        setViewer({
          scale: Math.min(
            MAX_VIEWER_ZOOM,
            Math.max(1, state.startScale * (distance / state.startDistance)),
          ),
          offset: state.startOffset,
        });
        return;
      }

      if (state.pointers.size === 1 && viewer.scale > 1) {
        const dx = event.clientX - state.startCentre.x;
        const dy = event.clientY - state.startCentre.y;

        // A few pixels of travel is a tap with a shaky hand, not a pan.
        if (Math.hypot(dx, dy) > 6) state.panned = true;

        setViewer((current) => ({
          scale: current.scale,
          offset: {
            x: state.startOffset.x + dx,
            y: state.startOffset.y + dy,
          },
        }));
      }
    },
    [viewer.scale],
  );

  const onPointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const state = gesture.current;
      const wasMultiTouch = state.pointers.size > 1;
      const panned = state.panned;

      state.pointers.delete(event.pointerId);

      if (state.pointers.size > 0) return;

      state.startDistance = 0;

      // A pinch or a pan is not a tap.
      if (wasMultiTouch || panned || busy || !natural || !layout) return;

      const box = measure();
      if (!box) return;

      const point = viewportPointToNormalized(
        { x: event.clientX - box.left, y: event.clientY - box.top },
        natural,
        layout,
      );

      const picked = pickTarget(candidates, point);

      setTarget(
        picked
          ? clampRect(picked)
          : ensureMinimumSize(
              clampRect({
                x: point.x - DEFAULT_TARGET_RECT.width / 2,
                y: point.y - DEFAULT_TARGET_RECT.height / 2,
                width: DEFAULT_TARGET_RECT.width,
                height: DEFAULT_TARGET_RECT.height,
              }),
              MIN_TARGET_SIZE,
            ),
      );
    },
    [natural, layout, measure, candidates, busy],
  );

  /* Wheel zoom, for the desktop case. */
  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    function onWheel(event: WheelEvent) {
      if (!event.ctrlKey && Math.abs(event.deltaY) < 2) return;

      event.preventDefault();

      setViewer((current) => ({
        scale: Math.min(
          MAX_VIEWER_ZOOM,
          Math.max(1, current.scale * (event.deltaY < 0 ? 1.1 : 1 / 1.1)),
        ),
        offset: current.offset,
      }));
    }

    // Non-passive, because the whole point is to stop the browser zooming
    // the page out from under the picture.
    frame.addEventListener("wheel", onWheel, { passive: false });

    return () => frame.removeEventListener("wheel", onWheel);
  }, [frameRef]);

  const overlayCandidates = candidates
    .map(toBoxFraction)
    .filter((rect): rect is NormalizedRect => rect !== null);

  const overlayTarget = target ? toBoxFraction(target) : null;

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
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/*
          Positioned by the same transform the geometry uses, so what the
          reader sees and what gets cropped cannot drift apart.
        */}
        {/* eslint-disable-next-line @next/next/no-img-element -- an object
            URL for a photograph that is already on this device; next/image
            cannot optimise one and would only add a proxy hop. */}
        <img
          ref={imageRef}
          src={src}
          alt=""
          onLoad={onLoad}
          className="absolute inset-0 h-full w-full object-contain"
          style={{
            transform: `translate(${viewer.offset.x}px, ${viewer.offset.y}px) scale(${viewer.scale})`,
            transformOrigin: "center center",
          }}
        />

        <TargetOverlay
          candidates={overlayCandidates}
          selected={overlayTarget}
          selectedLabel={copy.selectedTarget}
          candidateLabel={copy.candidateTarget}
          busy={busy}
        />
      </div>

      <div
        className="pointer-events-none absolute inset-x-0 flex items-start justify-between px-4"
        style={{ top: "max(1rem, env(safe-area-inset-top))" }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={copy.close}
          className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-md transition-transform active:scale-90"
        >
          <X size={20} strokeWidth={1.8} aria-hidden="true" />
        </button>

        {viewer.scale > 1 && (
          <button
            type="button"
            onClick={() => setViewer({ scale: 1, offset: { x: 0, y: 0 } })}
            aria-label={copy.reset}
            className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-md transition-transform active:scale-90"
          >
            <RotateCcw size={18} strokeWidth={1.8} aria-hidden="true" />
          </button>
        )}
      </div>

      <div
        className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-4 bg-gradient-to-t from-black/60 to-transparent pt-16"
        style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
      >
        {/* The same indicator the camera uses, so a photograph read from
            the library waits the same way one read through the lens does. */}
        <AnalysingTargetIndicator active={busy} label={copy.busy} />

        {!busy && (
          <p className="rounded-full bg-black/35 px-3 py-1.5 text-[11px] font-medium tracking-wide text-white/90 backdrop-blur-md">
            {copy.hint}
          </p>
        )}

        {pages && pages.pageCount > 1 && (
          <div className="flex items-center gap-2 rounded-full bg-black/35 p-1 backdrop-blur-md">
            <button
              type="button"
              disabled={busy || pages.page <= 1}
              onClick={() => pages.onPageChange(pages.page - 1)}
              aria-label={copy.previousPage}
              className="flex h-9 w-9 items-center justify-center rounded-full text-white transition active:bg-white/15 disabled:opacity-35"
            >
              <ChevronLeft size={18} strokeWidth={2} aria-hidden="true" />
            </button>

            <span className="min-w-[68px] text-center text-[12px] font-semibold tabular-nums text-white">
              {copy.pageLabel
                .replace("{page}", String(pages.page))
                .replace("{count}", String(pages.pageCount))}
            </span>

            <button
              type="button"
              disabled={busy || pages.page >= pages.pageCount}
              onClick={() => pages.onPageChange(pages.page + 1)}
              aria-label={copy.nextPage}
              className="flex h-9 w-9 items-center justify-center rounded-full text-white transition active:bg-white/15 disabled:opacity-35"
            >
              <ChevronRight size={18} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        )}

        <button
          type="button"
          disabled={busy || !natural}
          onClick={() => onConfirm(clampRect(target ?? DEFAULT_TARGET_RECT))}
          className="flex items-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-semibold text-black transition-transform active:scale-95 disabled:opacity-45"
        >
          <Check size={18} strokeWidth={2.2} aria-hidden="true" />
          {copy.confirm}
        </button>
      </div>
    </section>
  );
}
