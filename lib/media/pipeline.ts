"use client";

/* =========================================================
   One photograph, three things made from it

   Every capture in the app now comes through here, whatever opened it: the
   shutter, the photo picker, a page of a document. That is the point. There
   used to be four separate answers to "what do we do with these pixels" —
   1280 on the capture screen, 768 for the model, 1800 in the menu camera,
   and whatever the search sheet's helper decided — and they disagreed about
   the same photograph.

   The three products, and why each exists:

   The retained source is the one kept forever. It is what a better model
   reads next year, what a re-crop is taken from, and what a card design
   that does not exist yet will be generated against.

   The card is what a saved word shows. Generated from the target, never
   from the whole photograph shrunk down — a vocabulary card of a shelf is
   not a card of the bottle on it.

   The recognition copy is sent to the model and thrown away, so it is sized
   for that model rather than for storage, and never written anywhere.
   ========================================================= */

import {
  MIN_TARGET_SIZE,
  RECOGNITION_EDGE,
  TARGET_PADDING,
  type RecognitionKind,
} from "@/lib/media/config";
import {
  clampRect,
  ensureMinimumSize,
  padRect,
  type NormalizedRect,
} from "@/lib/media/geometry";
import type { PendingCapture } from "@/lib/media/assets";
import type { MediaSourceType } from "@/lib/media/record";
import {
  renderCard,
  renderForRecognition,
  renderSource,
  type Raster,
} from "@/lib/media/raster";

export type BuildCaptureOptions = {
  raster: Raster;
  targetRect: NormalizedRect;
  sourceType: MediaSourceType;
  /** Which model is going to read this, and therefore at what size. */
  recognitionKind?: RecognitionKind;
  /**
   * Whether the model gets the target or the whole frame.
   *
   * "target" for naming one object — cropping to the target is what makes
   * the existing prompt's "the object at the exact centre" true rather than
   * hopeful. "frame" for a menu, where the page is the subject and the
   * target only decides what the saved card looks like.
   */
  recognitionScope?: "target" | "frame";
  sourceFileName?: string;
  sourcePage?: number;
  recognition?: Record<string, unknown>;
};

export type BuiltCapture = {
  capture: PendingCapture;
  /** A data URL, for the request. Never stored. */
  recognitionImage: string;
  /** The padded rect the card was actually cut at. */
  cropRect: NormalizedRect;
};

/**
 * The rectangle a card is actually cut at.
 *
 * The reader's target, brought up to a workable size, then grown by the
 * safety margin so accents, descenders and a sign's border survive. Both
 * steps are in geometry.ts and both are tested there; this is only the
 * order they go in, which matters — padding first and then enforcing a
 * minimum would let the minimum eat the padding on a small target.
 */
export function cropRectFor(target: NormalizedRect): NormalizedRect {
  return clampRect(
    padRect(
      ensureMinimumSize(clampRect(target), MIN_TARGET_SIZE),
      TARGET_PADDING,
    ),
  );
}

/**
 * A raster turned into everything a save will need.
 *
 * Deliberately does not touch the network or storage. What comes back is
 * held in memory by the screen until the reader decides to keep it, which
 * is what makes cancelling free — see lib/media/assets.ts.
 *
 * The steps await one another rather than running together. Three canvases
 * of a 12-megapixel photograph at once is how a mid-range phone runs out of
 * memory, and the awaits also hand the main thread back between them so the
 * shutter animation keeps running.
 */
export async function buildCapture({
  raster,
  targetRect,
  sourceType,
  recognitionKind = "object",
  recognitionScope = "target",
  sourceFileName,
  sourcePage,
  recognition,
}: BuildCaptureOptions): Promise<BuiltCapture> {
  const cropRect = cropRectFor(targetRect);

  const source = await renderSource(raster);
  const card = await renderCard(raster, cropRect);

  const recognitionImage = await renderForRecognition(
    raster,
    RECOGNITION_EDGE[recognitionKind],
    recognitionScope === "target" ? cropRect : undefined,
  );

  return {
    capture: {
      sourceType,
      source,
      card,
      /*
       * The reader's target is stored, not the padded crop. The padding is
       * a presentation decision and may well change; what the reader
       * actually pointed at is the fact worth keeping, and the crop can be
       * recomputed from it whenever the margin is retuned.
       */
      targetRect: clampRect(targetRect),
      originalDimensions: { width: raster.width, height: raster.height },
      recognition,
      sourceFileName,
      sourcePage,
    },
    recognitionImage,
    cropRect,
  };
}
