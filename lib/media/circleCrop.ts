/* =========================================================
   Framing a photo inside a circle

   The arithmetic behind components/settings/AvatarCropper.tsx, kept apart
   from it because this is the part that can be wrong without looking wrong:
   a crop rectangle that is off by a factor somewhere still produces a
   perfectly plausible square, just not the one the reader framed. Here it
   can be checked against numbers instead of against a screenshot.

   One convention throughout: `offset` is a translation of the *image*
   relative to the centre of the viewport, in viewport pixels. Dragging the
   photo right moves the sampled window left, which is why the crop maths
   subtracts it.
   ========================================================= */

export type Size = { width: number; height: number };
export type Point = { x: number; y: number };

/**
 * The smallest scale at which the image still covers the whole circle.
 *
 * The floor for every zoom, so there is no state in which the background
 * shows through a corner of the circle — and therefore none in which an
 * avatar can be exported with a blank wedge in it.
 */
export function minimumCoverScale(natural: Size, viewport: number): number {
  if (natural.width <= 0 || natural.height <= 0 || viewport <= 0) return 1;

  return Math.max(viewport / natural.width, viewport / natural.height);
}

/**
 * The offset, pulled back to the furthest the image may travel before one of
 * its edges enters the circle.
 *
 * Each axis is clamped on its own: a wide photo scaled to cover a square has
 * slack to spare left and right and none at all top to bottom, and it should
 * still be draggable sideways.
 */
export function clampOffset(
  offset: Point,
  natural: Size,
  scale: number,
  viewport: number,
): Point {
  const room = (span: number) => Math.max(0, (span * scale - viewport) / 2);

  const limit = (value: number, span: number) => {
    const bound = room(span);
    return Math.min(bound, Math.max(-bound, value));
  };

  return {
    x: limit(offset.x, natural.width),
    y: limit(offset.y, natural.height),
  };
}

/**
 * A new scale and offset for a zoom centred on `focus` rather than on the
 * middle of the frame.
 *
 * Pinching around the midpoint of two fingers is what every photo app does,
 * and it is the difference between zooming into a face and zooming into the
 * centre of the frame and then dragging the face back.
 *
 * `focus` is in viewport pixels from the centre, so {0, 0} is the plain
 * centre zoom a slider performs.
 */
export function zoomAround(
  requestedScale: number,
  focus: Point,
  from: { scale: number; offset: Point },
  bounds: { min: number; max: number },
  natural: Size,
  viewport: number,
): { scale: number; offset: Point } {
  const scale = Math.min(bounds.max, Math.max(bounds.min, requestedScale));
  const ratio = scale / from.scale;

  return {
    scale,
    offset: clampOffset(
      {
        x: focus.x - (focus.x - from.offset.x) * ratio,
        y: focus.y - (focus.y - from.offset.y) * ratio,
      },
      natural,
      scale,
      viewport,
    ),
  };
}

/**
 * The square of the original image the circle is showing, in image pixels.
 *
 * This is what gets drawn into the exported avatar, so it is the one result
 * that has to be exactly right — everything else is only how the reader got
 * here.
 */
export function cropRect(
  natural: Size,
  viewport: number,
  scale: number,
  offset: Point,
): { x: number; y: number; size: number } {
  const size = viewport / scale;

  return {
    x: natural.width / 2 - offset.x / scale - size / 2,
    y: natural.height / 2 - offset.y / scale - size / 2,
    size,
  };
}
