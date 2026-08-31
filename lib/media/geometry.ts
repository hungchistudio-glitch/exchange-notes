/* =========================================================
   Where the target actually is

   Every coordinate in the capture pipeline passes through here, and this is
   the module that can be wrong without looking wrong. A crop rectangle that
   is off by a factor still produces a perfectly plausible image — just not
   the one the reader framed — and nobody notices until a word saved three
   weeks ago turns out to be a photograph of the table next to the sign.

   So the arithmetic is kept apart from the components, the way
   lib/media/circleCrop.ts is kept apart from AvatarCropper, and for the same
   reason: here it can be checked against numbers instead of against a
   screenshot.

   Two conventions hold throughout.

   A *normalised* rect is a fraction of the image it belongs to — x, y, width
   and height all in 0..1, origin top-left. This is the only form that gets
   persisted, because it survives the source being re-encoded at a different
   resolution, which is the whole point of keeping it.

   A *layout* says where an image sits inside a viewport, in viewport pixels:
   a scale, and the position of the image's top-left corner. `offset` is
   negative under object-cover, where the image is larger than the box and
   hangs off both edges, and positive under object-contain, where it is
   letterboxed. One shape describes both, which is what lets the camera
   preview and the imported-photo viewer share every function below.
   ========================================================= */

export type Size = { width: number; height: number };
export type Point = { x: number; y: number };

/** A rectangle in viewport pixels. */
export type Rect = { x: number; y: number; width: number; height: number };

/**
 * A rectangle as a fraction of its image.
 *
 * Structurally identical to Rect and deliberately a separate name: the two
 * are never interchangeable, and mixing them up is precisely the bug this
 * module exists to make impossible to write by accident.
 */
export type NormalizedRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Where an image sits inside a viewport, in viewport pixels. */
export type Layout = {
  scale: number;
  offsetX: number;
  offsetY: number;
};

const clamp = (value: number, low: number, high: number) =>
  Math.min(high, Math.max(low, value));

const usable = (size: Size) =>
  Number.isFinite(size.width) &&
  Number.isFinite(size.height) &&
  size.width > 0 &&
  size.height > 0;

/**
 * The layout of an image displayed with `object-fit: cover`.
 *
 * What the camera preview uses: the video fills the screen and whatever does
 * not fit hangs off two of the edges. Those hidden strips are real pixels the
 * reader cannot see, and forgetting them is the classic way a tap lands on
 * the wrong part of the frame.
 */
export function coverLayout(natural: Size, viewport: Size): Layout {
  if (!usable(natural) || !usable(viewport)) {
    return { scale: 1, offsetX: 0, offsetY: 0 };
  }

  const scale = Math.max(
    viewport.width / natural.width,
    viewport.height / natural.height,
  );

  return {
    scale,
    offsetX: (viewport.width - natural.width * scale) / 2,
    offsetY: (viewport.height - natural.height * scale) / 2,
  };
}

/**
 * The layout of an image displayed with `object-fit: contain`.
 *
 * What the imported-photo viewer uses: the whole photograph is visible and
 * the box is letterboxed around it. A reader examining a picture they chose
 * should be able to see all of it — including the corner the target is in.
 */
export function containLayout(natural: Size, viewport: Size): Layout {
  if (!usable(natural) || !usable(viewport)) {
    return { scale: 1, offsetX: 0, offsetY: 0 };
  }

  const scale = Math.min(
    viewport.width / natural.width,
    viewport.height / natural.height,
  );

  return {
    scale,
    offsetX: (viewport.width - natural.width * scale) / 2,
    offsetY: (viewport.height - natural.height * scale) / 2,
  };
}

/**
 * A layout with the reader's own zoom and pan applied on top.
 *
 * The spec's requirement that viewer zoom must not corrupt the stored
 * coordinates is satisfied here rather than by remembering to undo the zoom
 * at each call site: the zoom becomes part of the layout, every conversion
 * already goes through the layout, and so there is no path that can forget.
 *
 * The zoom is centred on the viewport's middle, which is where a pinch's
 * midpoint has already been translated to by the caller — the same
 * convention as zoomAround in circleCrop.
 */
export function withViewerTransform(
  base: Layout,
  viewport: Size,
  viewer: { scale: number; offset: Point },
): Layout {
  const centreX = viewport.width / 2;
  const centreY = viewport.height / 2;

  return {
    scale: base.scale * viewer.scale,
    offsetX:
      centreX + (base.offsetX - centreX) * viewer.scale + viewer.offset.x,
    offsetY:
      centreY + (base.offsetY - centreY) * viewer.scale + viewer.offset.y,
  };
}

/** A viewport point, in image pixels. */
export function viewportToImage(point: Point, layout: Layout): Point {
  if (!Number.isFinite(layout.scale) || layout.scale <= 0) {
    return { x: 0, y: 0 };
  }

  return {
    x: (point.x - layout.offsetX) / layout.scale,
    y: (point.y - layout.offsetY) / layout.scale,
  };
}

/** An image point, in viewport pixels. The exact inverse of the above. */
export function imageToViewport(point: Point, layout: Layout): Point {
  return {
    x: point.x * layout.scale + layout.offsetX,
    y: point.y * layout.scale + layout.offsetY,
  };
}

/**
 * A tap, as a fraction of the image under it.
 *
 * Clamped, because a tap on the letterboxed margin of a contained image is
 * outside the photograph and should read as its nearest edge rather than as
 * a negative coordinate that quietly becomes a crop starting off-image.
 */
export function viewportPointToNormalized(
  point: Point,
  natural: Size,
  layout: Layout,
): Point {
  if (!usable(natural)) return { x: 0, y: 0 };

  const image = viewportToImage(point, layout);

  return {
    x: clamp(image.x / natural.width, 0, 1),
    y: clamp(image.y / natural.height, 0, 1),
  };
}

/**
 * A rectangle drawn on screen, as a fraction of the image beneath it.
 *
 * Clamped to the image on every side, so a target frame dragged past the
 * edge of a photograph yields the part that is actually on the photograph.
 * A zero-area result is possible and is the honest answer for a rectangle
 * entirely off the image; callers check for it rather than being handed a
 * plausible-looking rect that is somewhere else.
 */
export function viewportRectToNormalized(
  rect: Rect,
  natural: Size,
  layout: Layout,
): NormalizedRect {
  if (!usable(natural)) return { x: 0, y: 0, width: 0, height: 0 };

  const topLeft = viewportToImage({ x: rect.x, y: rect.y }, layout);
  const bottomRight = viewportToImage(
    { x: rect.x + rect.width, y: rect.y + rect.height },
    layout,
  );

  const left = clamp(topLeft.x / natural.width, 0, 1);
  const top = clamp(topLeft.y / natural.height, 0, 1);
  const right = clamp(bottomRight.x / natural.width, 0, 1);
  const bottom = clamp(bottomRight.y / natural.height, 0, 1);

  return {
    x: left,
    y: top,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

/** A stored rectangle, back on screen. The inverse of the above. */
export function normalizedRectToViewport(
  rect: NormalizedRect,
  natural: Size,
  layout: Layout,
): Rect {
  const topLeft = imageToViewport(
    { x: rect.x * natural.width, y: rect.y * natural.height },
    layout,
  );

  return {
    x: topLeft.x,
    y: topLeft.y,
    width: rect.width * natural.width * layout.scale,
    height: rect.height * natural.height * layout.scale,
  };
}

/** A stored rectangle, in the pixels of a source of the given size. */
export function normalizedRectToPixels(
  rect: NormalizedRect,
  natural: Size,
): Rect {
  return {
    x: rect.x * natural.width,
    y: rect.y * natural.height,
    width: rect.width * natural.width,
    height: rect.height * natural.height,
  };
}

/**
 * A rectangle grown by a margin, and kept on the image.
 *
 * The margin is a fraction of the rectangle's own size, so a small target
 * gets a small margin — 18% of a word is a few letters of context, 18% of
 * half the frame would be the rest of it.
 *
 * Against an edge the growth is simply clipped rather than pushed to the
 * other side. Shifting would be worse than it sounds: a word at the top of a
 * sign would be recentred by sliding the crop downwards, which buys context
 * that is not wanted at the cost of the thing that is.
 */
export function padRect(
  rect: NormalizedRect,
  padding: number,
): NormalizedRect {
  const growX = (rect.width * padding) / 2;
  const growY = (rect.height * padding) / 2;

  const left = clamp(rect.x - growX, 0, 1);
  const top = clamp(rect.y - growY, 0, 1);
  const right = clamp(rect.x + rect.width + growX, 0, 1);
  const bottom = clamp(rect.y + rect.height + growY, 0, 1);

  return {
    x: left,
    y: top,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

/**
 * A rectangle brought up to a minimum size without leaving the image.
 *
 * Grown about its own centre, then slid back inside if that pushed it out —
 * sliding is right here where it was wrong in padRect, because a target
 * below the minimum is being corrected rather than framed, and a rect that
 * hangs off the edge cannot be cropped at all.
 */
export function ensureMinimumSize(
  rect: NormalizedRect,
  minimum: number,
): NormalizedRect {
  const width = Math.min(1, Math.max(rect.width, minimum));
  const height = Math.min(1, Math.max(rect.height, minimum));

  const centreX = rect.x + rect.width / 2;
  const centreY = rect.y + rect.height / 2;

  return {
    x: clamp(centreX - width / 2, 0, 1 - width),
    y: clamp(centreY - height / 2, 0, 1 - height),
    width,
    height,
  };
}

/**
 * A rectangle clamped into the unit square.
 *
 * The last thing every stored rect passes through, so that nothing reaches
 * the database that would crop outside its own source.
 */
export function clampRect(rect: NormalizedRect): NormalizedRect {
  const x = clamp(rect.x, 0, 1);
  const y = clamp(rect.y, 0, 1);

  return {
    x,
    y,
    width: clamp(rect.width, 0, 1 - x),
    height: clamp(rect.height, 0, 1 - y),
  };
}

/**
 * A normalised rect seen through a quarter-turn of the image it sits on.
 *
 * Needed wherever the pixels and the rectangle were established in different
 * frames — an EXIF-rotated import whose target was picked before the
 * orientation was normalised, or a device rotated between framing and
 * shutter. `quarterTurns` is clockwise; 1 is what a phone held in landscape
 * reports for a portrait sensor.
 *
 * Note that width and height swap along with the coordinates, because the
 * image they are a fraction of has swapped too.
 */
export function rotateRect(
  rect: NormalizedRect,
  quarterTurns: number,
): NormalizedRect {
  // Negative and oversized inputs both normalise into 0..3.
  const turns = ((Math.round(quarterTurns) % 4) + 4) % 4;

  if (turns === 0) return { ...rect };

  if (turns === 1) {
    return {
      x: 1 - rect.y - rect.height,
      y: rect.x,
      width: rect.height,
      height: rect.width,
    };
  }

  if (turns === 2) {
    return {
      x: 1 - rect.x - rect.width,
      y: 1 - rect.y - rect.height,
      width: rect.width,
      height: rect.height,
    };
  }

  return {
    x: rect.y,
    y: 1 - rect.x - rect.width,
    width: rect.height,
    height: rect.width,
  };
}

/**
 * A normalised rect mirrored left-to-right.
 *
 * The front camera's preview is mirrored so that moving right moves the
 * reflection right, which is what a mirror does and what everyone expects.
 * The captured frame is not mirrored. Anything picked off that preview
 * therefore has to be flipped before it means anything against the pixels.
 */
export function mirrorRect(rect: NormalizedRect): NormalizedRect {
  return {
    x: 1 - rect.x - rect.width,
    y: rect.y,
    width: rect.width,
    height: rect.height,
  };
}

/** A normalised point mirrored left-to-right. Same reason as mirrorRect. */
export function mirrorPoint(point: Point): Point {
  return { x: 1 - point.x, y: point.y };
}

/** The rect two corners describe, in either order. */
export function rectFromCorners(a: Point, b: Point): Rect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y),
  };
}

/** Does this rect enclose this point? Used to hit-test candidate targets. */
export function rectContains(rect: NormalizedRect, point: Point): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

/** Rect area, normalised. Zero for anything inverted or empty. */
export function rectArea(rect: NormalizedRect): number {
  return Math.max(0, rect.width) * Math.max(0, rect.height);
}

/**
 * How far a point is from a rectangle. Zero anywhere inside it.
 *
 * Distance to the nearest point on the rect rather than to its centre, and
 * the distinction matters more than it looks: a line of text is wide and
 * short, so a tap a hair below it is a hair from the rect and half a frame
 * from its middle. Measuring to the centre made near-misses on exactly the
 * targets most worth forgiving read as misses on nothing.
 */
export function distanceToRect(rect: NormalizedRect, point: Point): number {
  const dx = Math.max(rect.x - point.x, 0, point.x - (rect.x + rect.width));
  const dy = Math.max(rect.y - point.y, 0, point.y - (rect.y + rect.height));

  return Math.hypot(dx, dy);
}

/**
 * Which candidate a tap picked.
 *
 * The smallest rect containing the point, rather than the first: candidates
 * overlap, a line of text sits inside the block of text around it, and the
 * reader tapping a line means the line. Falls back to the nearest centre
 * when the tap missed everything, so that a tap slightly off a small target
 * still selects it rather than doing nothing.
 */
export function pickTarget(
  candidates: readonly NormalizedRect[],
  point: Point,
  nearestWithin = 0.08,
): NormalizedRect | null {
  let hit: NormalizedRect | null = null;

  for (const candidate of candidates) {
    if (!rectContains(candidate, point)) continue;
    if (!hit || rectArea(candidate) < rectArea(hit)) hit = candidate;
  }

  if (hit) return hit;

  let nearest: NormalizedRect | null = null;
  let nearestDistance = Infinity;

  for (const candidate of candidates) {
    const distance = distanceToRect(candidate, point);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = candidate;
    }
  }

  return nearestDistance <= nearestWithin ? nearest : null;
}
