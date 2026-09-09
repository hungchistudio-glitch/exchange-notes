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

export type StartedCapture = {
  /** Ready first, so the request can go out. A data URL; never stored. */
  recognitionImage: string;
  /** The padded rect the card is being cut at. */
  cropRect: NormalizedRect;
  /**
   * The two stored derivatives, already being encoded.
   *
   * Await it when the reader saves. It has usually settled long before,
   * because it was running while the recognition request was in flight.
   */
  capture: Promise<PendingCapture>;
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
 * The same work, in the order that matters to whoever is waiting.
 *
 * buildCapture below produces the retained source, then the card, then the
 * copy for the model — and the recognition request cannot leave until all
 * three are done. Measured on a desktop: about 200ms to encode the source
 * and 90ms the card, against 35ms for the copy the request actually needs.
 * Three hundred milliseconds of a reader's wait spent encoding two files
 * they may never save, before the network is even asked. On a phone that
 * multiplies.
 *
 * So the model's copy is made first and returned, and the two derivatives
 * are left running. The encoding then overlaps the round trip instead of
 * preceding it.
 *
 * This owns the raster: it is closed when the derivatives settle, however
 * they settle. A caller that closed it itself would pull the pixels out
 * from under an encode still in progress.
 */
export async function startCapture(
  options: BuildCaptureOptions,
): Promise<StartedCapture> {
  const {
    raster,
    targetRect,
    recognitionKind = "object",
    recognitionScope = "target",
  } = options;

  const cropRect = cropRectFor(targetRect);

  let recognitionImage: string;

  try {
    recognitionImage = await renderForRecognition(
      raster,
      RECOGNITION_EDGE[recognitionKind],
      recognitionScope === "target" ? cropRect : undefined,
    );
  } catch (renderError) {
    /*
     * Ownership passes at the `return` below, so a failure before it leaves
     * the raster to this function. Nothing downstream exists yet to free it.
     */
    raster.close();
    throw renderError;
  }

  const capture = (async () => {
    try {
      return await buildDerivatives(options, cropRect);
    } finally {
      raster.close();
    }
  })();

  /*
   * Attached now so that a caller which never awaits `capture` — a reader
   * who closes the sheet without saving — does not leave an unhandled
   * rejection behind. The real error still reaches whoever awaits it.
   */
  capture.catch(() => {});

  return { recognitionImage, cropRect, capture };
}

/** The two files that get kept. The expensive half. */
async function buildDerivatives(
  {
    raster,
    targetRect,
    sourceType,
    sourceFileName,
    sourcePage,
    recognition,
  }: BuildCaptureOptions,
  cropRect: NormalizedRect,
): Promise<PendingCapture> {
  const source = await renderSource(raster);
  const card = await renderCard(raster, cropRect);

  return {
    sourceType,
    source,
    card,
    /*
     * The reader's target is stored, not the padded crop. The padding is a
     * presentation decision and may well change; what the reader actually
     * pointed at is the fact worth keeping, and the crop can be recomputed
     * from it whenever the margin is retuned.
     */
    targetRect: clampRect(targetRect),
    originalDimensions: { width: raster.width, height: raster.height },
    recognition,
    sourceFileName,
    sourcePage,
  };
}

/**
 * A raster turned into everything a save will need, all of it awaited.
 *
 * For the callers with nothing to overlap: the menu scanner already has its
 * answer when it cuts a dish out of the page, so there is no request for
 * the encoding to run alongside and nothing to gain from handing back
 * early. startCapture is what the recognition paths use.
 *
 * Does not close the raster — the caller made it and keeps it, which is the
 * opposite of startCapture and is why they are two functions rather than
 * one with a flag.
 */
export async function buildCapture(
  options: BuildCaptureOptions,
): Promise<BuiltCapture> {
  const {
    raster,
    targetRect,
    recognitionKind = "object",
    recognitionScope = "target",
  } = options;

  const cropRect = cropRectFor(targetRect);

  const capture = await buildDerivatives(options, cropRect);

  const recognitionImage = await renderForRecognition(
    raster,
    RECOGNITION_EDGE[recognitionKind],
    recognitionScope === "target" ? cropRect : undefined,
  );

  return { capture, recognitionImage, cropRect };
}
