/* =========================================================
   What size, what quality, and how the card gets framed

   The decisions the pipeline makes, separated from the canvas that carries
   them out. Not an aesthetic separation: there is no canvas in the test
   runner, so anything that touches one cannot be checked, and "never upscale
   a small image" is exactly the rule that is worth checking and easy to
   break. Everything here is arithmetic on two numbers and can be asserted
   against a table.

   lib/media/raster.ts is the other half — it does what these functions say,
   and holds no opinions of its own.
   ========================================================= */

import {
  CARD_ASPECT,
  CARD_COVER_TOLERANCE,
  CARD_WIDTH,
  MIN_CARD_WIDTH,
  QUALITY_LADDER,
} from "@/lib/media/config";
import type { Rect, Size } from "@/lib/media/geometry";

/**
 * A size reduced to fit within `maxEdge`, never enlarged past its own.
 *
 * The `Math.min(1, …)` is the whole point of this function and the reason it
 * is tested: a 400px photograph asked to fit 2048 must stay 400px. Scaling
 * it up would cost four times the bytes to store exactly the same detail,
 * and would make every downstream size check pass for the wrong reason.
 */
export function fitWithin(natural: Size, maxEdge: number): Size {
  if (
    !Number.isFinite(natural.width) ||
    !Number.isFinite(natural.height) ||
    natural.width <= 0 ||
    natural.height <= 0
  ) {
    return { width: 0, height: 0 };
  }

  const scale = Math.min(
    1,
    maxEdge / Math.max(natural.width, natural.height),
  );

  return {
    width: Math.max(1, Math.round(natural.width * scale)),
    height: Math.max(1, Math.round(natural.height * scale)),
  };
}

/**
 * The rungs of the quality ladder, in the order they are tried.
 *
 * Returned as a plain array rather than exposing the frozen tuple, because
 * the caller walks it and a readonly tuple in a for-of is a type nuisance
 * for no benefit.
 */
export function qualityLadder(): number[] {
  return [...QUALITY_LADDER];
}

/**
 * Which rung to stop at, given what each one weighed.
 *
 * The first rung under budget wins; if none is, the last one does. That
 * final fallback is the spec's priority written as code — a card slightly
 * over its byte target ships, a card compressed past legibility does not.
 *
 * `weights` is parallel to qualityLadder().
 */
export function chooseRung(weights: readonly number[], budget: number): number {
  const index = weights.findIndex((bytes) => bytes <= budget);

  return index === -1 ? Math.max(0, weights.length - 1) : index;
}

/**
 * How the card frame should treat a crop of this shape.
 *
 * "cover" fills the 16:9 frame and trims the overhang; "contain" fits the
 * whole crop inside it and leaves room to be filled with a blurred
 * extension of the image itself.
 *
 * The tolerance is what keeps the spec's promise that the target is never
 * cut for the sake of the layout. A crop that is nearly 16:9 loses a sliver
 * nobody will miss. A tall bottle or a narrow street sign is not
 * approximately 16:9 by any reading, and is fitted whole.
 */
export function cardFit(crop: Size): "cover" | "contain" {
  if (crop.width <= 0 || crop.height <= 0) return "contain";

  const aspect = crop.width / crop.height;

  /*
   * Expressed as the fraction of the crop that filling the frame would
   * throw away, which is the thing actually being tolerated. A 2:1 crop in
   * a 16:9 frame loses 11% of its width; a 1:2 crop would lose 72% of its
   * height, and that is a different kind of decision entirely.
   */
  const lost =
    aspect > CARD_ASPECT
      ? 1 - CARD_ASPECT / aspect
      : 1 - aspect / CARD_ASPECT;

  return lost <= CARD_COVER_TOLERANCE ? "cover" : "contain";
}

/**
 * The size to generate a card at, for a crop of this size.
 *
 * CARD_WIDTH is a ceiling rather than a target, which is the whole content
 * of this function. A target crop 300 pixels across drawn into a 1200-wide
 * card is a fourfold enlargement — the same picture, four times the bytes,
 * and visibly worse. So the card is generated at the scale the crop can
 * actually support, capped at CARD_WIDTH and floored at MIN_CARD_WIDTH.
 *
 * The two fits need different arithmetic. Under "contain" the frame has to
 * be big enough for the whole crop to sit inside it, so the binding
 * dimension is whichever needs more room. Under "cover" the crop has to
 * reach every edge, so it is whichever runs out first.
 */
export function cardFrameFor(crop: Size, fit: "cover" | "contain"): Size {
  if (crop.width <= 0 || crop.height <= 0) {
    return { width: CARD_WIDTH, height: Math.round(CARD_WIDTH / CARD_ASPECT) };
  }

  const atNaturalScale =
    fit === "contain"
      ? Math.max(crop.width, crop.height * CARD_ASPECT)
      : Math.min(crop.width, crop.height * CARD_ASPECT);

  const width = Math.round(
    Math.min(CARD_WIDTH, Math.max(MIN_CARD_WIDTH, atNaturalScale)),
  );

  return { width, height: Math.round(width / CARD_ASPECT) };
}

/**
 * The part of the source to sample when filling a frame.
 *
 * Centred, because by the time this is reached the crop has already been
 * chosen deliberately and its middle is the subject — this trims the excess
 * off a shape that was already judged close enough to the frame's.
 */
export function coverSourceRect(source: Size, frame: Size): Rect {
  if (source.width <= 0 || source.height <= 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  const frameAspect = frame.width / frame.height;
  const sourceAspect = source.width / source.height;

  if (sourceAspect > frameAspect) {
    const width = source.height * frameAspect;
    return { x: (source.width - width) / 2, y: 0, width, height: source.height };
  }

  const height = source.width / frameAspect;
  return { x: 0, y: (source.height - height) / 2, width: source.width, height };
}

/**
 * Where the whole source lands inside a frame it is being fitted into.
 *
 * The gap left over on two sides is what the blurred extension fills. The
 * result is centred and rounded, so the two margins differ by at most a
 * pixel rather than accumulating on one side.
 */
export function containDestinationRect(source: Size, frame: Size): Rect {
  if (source.width <= 0 || source.height <= 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  const scale = Math.min(
    frame.width / source.width,
    frame.height / source.height,
  );

  const width = Math.round(source.width * scale);
  const height = Math.round(source.height * scale);

  return {
    x: Math.round((frame.width - width) / 2),
    y: Math.round((frame.height - height) / 2),
    width,
    height,
  };
}
