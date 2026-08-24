"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";

import BottomSheet from "@/components/foundation/overlays/BottomSheet";
import useTranslation from "@/hooks/i18n/useTranslation";
import {
  clampOffset,
  cropRect,
  minimumCoverScale,
  zoomAround,
  type Point,
} from "@/lib/media/circleCrop";

/* =========================================================
   Choosing what ends up inside the circle

   A profile photo is shown in a circle everywhere in the app, and until now
   the circle was chosen by CSS: the file went to storage untouched and
   `object-cover` kept whatever happened to be in the middle. For a photo
   taken in portrait that is usually somebody's chin.

   So the crop happens here, before the upload, and what is uploaded is
   exactly the square the reader framed. The circle drawn below is the same
   circle components/foundation/media/Avatar.tsx draws — same shape, same
   cover behaviour — so there is no gap between the preview and the result.
   ========================================================= */

/** The exported avatar's edge, in pixels. */
const OUTPUT_SIZE = 512;

/** How far past "just covers the circle" a reader may zoom in. */
const MAX_ZOOM = 4;

const JPEG_QUALITY = 0.9;

type Props = {
  /** Object URL of the file being cropped. */
  src: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (cropped: Blob) => void;
};

export default function AvatarCropper({
  src,
  busy,
  onCancel,
  onConfirm,
}: Props) {
  const { t } = useTranslation();
  const copy = t.settings.profile;

  const imageRef = useRef<HTMLImageElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  /** Natural size of the decoded image, after any EXIF rotation. */
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(
    null,
  );
  /** Edge of the square viewport, measured rather than assumed. */
  const [viewport, setViewport] = useState(0);

  /*
   * Zoom is stored relative to "just covers the circle", not in absolute
   * pixels, so it survives the image and the viewport being measured — both
   * of which arrive after the first render. An absolute scale would have to
   * be reset from an effect once they land, which is a render writing state
   * about a value it could have derived.
   */
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });
  const [failed, setFailed] = useState(false);

  /*
   * The smallest scale at which the image still covers the whole circle.
   *
   * Everything is expressed relative to it: a reader can zoom in but never
   * out past the point where the stone of the circle would show through, so
   * there is no state in which a transparent wedge can be exported.
   */
  const minScale = natural ? minimumCoverScale(natural, viewport) : 1;
  const scale = minScale * zoom;

  const clamp = useCallback(
    (next: Point, atScale: number): Point =>
      natural ? clampOffset(next, natural, atScale, viewport) : next,
    [natural, viewport],
  );

  /* ---------- loading ---------- */

  useEffect(() => {
    /*
     * Nothing is reset here: the caller remounts this component for each new
     * photo, so `src` never changes within one mount and the initial state
     * is already the empty one.
     */
    const image = new Image();
    imageRef.current = image;

    image.onload = () => {
      /*
       * naturalWidth/Height report the *oriented* size in every browser this
       * app supports, and drawImage honours the same orientation — so a
       * photo taken sideways is measured and exported the same way round it
       * is displayed.
       */
      setNatural({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => setFailed(true);
    image.src = src;

    return () => {
      image.onload = null;
      image.onerror = null;
    };
  }, [src]);

  /* Measure the circle rather than assume it: it is sized in CSS so it can
     adapt to a narrow phone, and every calculation here depends on it. */
  useEffect(() => {
    const element = viewportRef.current;
    if (!element) return;

    /*
     * No synchronous first measure: ResizeObserver fires once on observe, so
     * the initial size arrives through the same path as every later one.
     */
    const observer = new ResizeObserver(() =>
      setViewport(element.clientWidth),
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  /* ---------- gestures ---------- */

  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<{
    distance: number;
    scale: number;
    offset: Point;
    focus: Point;
  } | null>(null);
  const drag = useRef<{ from: Point; offset: Point } | null>(null);

  /**
   * Zoom about a point rather than about the centre.
   *
   * Pinching around the middle of two fingers is what every photo app does,
   * and it is the difference between zooming *into* a face and zooming into
   * the centre of the frame and then having to drag the face back.
   */
  const zoomAbout = useCallback(
    (nextScale: number, focus: Point, from: { scale: number; offset: Point }) => {
      if (!natural) return;

      const next = zoomAround(
        nextScale,
        focus,
        from,
        { min: minScale, max: minScale * MAX_ZOOM },
        natural,
        viewport,
      );

      setZoom(next.scale / minScale);
      setOffset(next.offset);
    },
    [minScale, natural, viewport],
  );

  function localPoint(event: { clientX: number; clientY: number }): Point {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: event.clientX - rect.left - rect.width / 2,
      y: event.clientY - rect.top - rect.height / 2,
    };
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (busy) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      gesture.current = {
        distance: Math.hypot(a.x - b.x, a.y - b.y),
        scale,
        offset,
        focus: localPoint({
          clientX: (a.x + b.x) / 2,
          clientY: (a.y + b.y) / 2,
        }),
      };
      drag.current = null;
      return;
    }

    drag.current = { from: { x: event.clientX, y: event.clientY }, offset };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!pointers.current.has(event.pointerId)) return;

    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    if (pointers.current.size >= 2 && gesture.current) {
      const [a, b] = [...pointers.current.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (distance <= 0) return;

      const start = gesture.current;
      zoomAbout(
        (start.scale * distance) / start.distance,
        start.focus,
        { scale: start.scale, offset: start.offset },
      );
      return;
    }

    const active = drag.current;
    if (!active) return;

    setOffset(
      clamp(
        {
          x: active.offset.x + (event.clientX - active.from.x),
          y: active.offset.y + (event.clientY - active.from.y),
        },
        scale,
      ),
    );
  }

  function endPointer(event: ReactPointerEvent<HTMLDivElement>) {
    pointers.current.delete(event.pointerId);

    if (pointers.current.size < 2) gesture.current = null;
    if (pointers.current.size === 0) drag.current = null;
  }

  function handleWheel(event: ReactWheelEvent<HTMLDivElement>) {
    if (busy) return;

    zoomAbout(scale * (event.deltaY < 0 ? 1.12 : 1 / 1.12), localPoint(event), {
      scale,
      offset,
    });
  }

  /* ---------- export ---------- */

  function confirm() {
    const image = imageRef.current;
    if (!image || !natural || !viewport || busy) return;

    const rect = cropRect(natural, viewport, scale, offset);

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;

    const context = canvas.getContext("2d");
    if (!context) {
      setFailed(true);
      return;
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";

    /*
     * A square, not a circle. The mask belongs to whatever draws the avatar
     * — Avatar is already `rounded-full` — and a transparent corner baked in
     * here would show as a hard edge anywhere the photo is drawn on a
     * different colour, and would force PNG on a photograph.
     */
    context.drawImage(
      image,
      rect.x,
      rect.y,
      rect.size,
      rect.size,
      0,
      0,
      OUTPUT_SIZE,
      OUTPUT_SIZE,
    );

    canvas.toBlob(
      (blob) => (blob ? onConfirm(blob) : setFailed(true)),
      "image/jpeg",
      JPEG_QUALITY,
    );
  }

  const ready = Boolean(natural && viewport && !failed);

  return (
    <BottomSheet
      open
      onClose={onCancel}
      title={copy.cropTitle}
      description={copy.cropDescription}
    >
      <div className="p-5">
        <div className="mx-auto w-full max-w-[320px]">
          {/*
            The circle. `touch-action: none` because every gesture inside it
            is ours — without it the browser pans the sheet instead of the
            photo, and a pinch zooms the whole page.
          */}
          <div
            ref={viewportRef}
            role="application"
            aria-label={copy.cropViewportLabel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endPointer}
            onPointerCancel={endPointer}
            onLostPointerCapture={endPointer}
            onWheel={handleWheel}
            className="relative aspect-square w-full touch-none overflow-hidden rounded-full bg-black/[0.06] select-none"
          >
            {ready ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src}
                alt=""
                draggable={false}
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 top-1/2 max-w-none origin-center"
                style={{
                  width: natural!.width,
                  height: natural!.height,
                  transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                }}
              />
            ) : null}

            {!ready ? (
              <span className="absolute inset-0 flex items-center justify-center text-[12px] font-medium text-ink-faint">
                {failed ? copy.cropError : copy.loading}
              </span>
            ) : null}
          </div>

          <label className="mt-6 block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
              {copy.cropZoom}
            </span>

            {/*
              A slider as well as the gestures, and not only for polish: pinch
              is unavailable with a mouse, on a trackpad without gestures, and
              to anyone driving the page from a keyboard. The range is the
              same one the gestures move through.
            */}
            <input
              type="range"
              min={1}
              max={MAX_ZOOM}
              step={0.01}
              value={scale / minScale}
              disabled={!ready || busy}
              aria-label={copy.cropZoom}
              onChange={(event) =>
                zoomAbout(minScale * Number(event.target.value), { x: 0, y: 0 }, {
                  scale,
                  offset,
                })
              }
              className="mt-3 h-11 w-full accent-black disabled:opacity-40"
            />
          </label>
        </div>

        <div className="mt-2 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex h-12 items-center justify-center rounded-full border border-black/[0.09] bg-white text-[14px] font-semibold text-black transition active:scale-[0.99] disabled:opacity-40"
          >
            {copy.cropCancel}
          </button>

          <button
            type="button"
            onClick={confirm}
            disabled={!ready || busy}
            className="flex h-12 items-center justify-center rounded-full bg-black text-[14px] font-semibold text-white transition active:scale-[0.99] disabled:opacity-40"
          >
            {busy ? copy.cropSaving : copy.cropConfirm}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
