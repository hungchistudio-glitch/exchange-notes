"use client";

/* =========================================================
   The half that touches pixels

   lib/media/policy.ts decides what size and what quality; this carries it
   out and holds no opinions of its own. The split is not tidiness: there is
   no canvas in the test runner, so everything that draws is unverifiable by
   unit test, and the way to keep that from mattering is to leave nothing
   here worth verifying.

   Two rules run through all of it.

   Decode small. createImageBitmap can resize while decoding, which means a
   48-megapixel photograph never exists as a 192MB bitmap on its way to
   becoming a 2048px one. On the phones this app runs on that is the
   difference between an import and a tab crash.

   Orientation once, at the front. Every bitmap leaves the decoder already
   turned the right way up, so nothing downstream — no crop, no card, no
   stored rectangle — has to know EXIF exists.
   ========================================================= */

import {
  CARD_MAX_BYTES,
  FALLBACK_FORMAT,
  PREFERRED_FORMAT,
  RECOGNITION_QUALITY,
  SOURCE_MAX_BYTES,
  SOURCE_MAX_EDGE,
} from "@/lib/media/config";
import {
  normalizedRectToPixels,
  type NormalizedRect,
  type Size,
} from "@/lib/media/geometry";
import {
  cardFit,
  cardFrameFor,
  chooseRung,
  containDestinationRect,
  coverSourceRect,
  fitWithin,
  qualityLadder,
} from "@/lib/media/policy";

/** Anything that can be drawn, with its true size alongside. */
export type Raster = {
  source: CanvasImageSource;
  width: number;
  height: number;
  /** Frees an ImageBitmap. A no-op for anything else. */
  close: () => void;
};

export type EncodedImage = {
  blob: Blob;
  width: number;
  height: number;
  mimeType: string;
  quality: number;
};

export class MediaDecodeError extends Error {
  constructor(message = "This image could not be read.") {
    super(message);
    this.name = "MediaDecodeError";
  }
}

/* ---------- decoding ---------- */

function bitmapSupported() {
  return typeof createImageBitmap === "function";
}

/**
 * A blob decoded, turned upright, and reduced on the way in.
 *
 * `maxEdge` is honoured during decode where the browser supports it. The
 * resize arithmetic is fitWithin's, not a second copy of it, so a source
 * already under the maximum is decoded at its own size rather than being
 * enlarged into one.
 */
export async function decodeBlob(
  blob: Blob,
  maxEdge = SOURCE_MAX_EDGE,
): Promise<Raster> {
  if (bitmapSupported()) {
    try {
      /*
       * Probed at full size first, because the target size cannot be
       * computed without knowing the source's — and a bitmap decoded only
       * to be measured is still cheaper than the alternative, which is
       * decoding at full size and keeping it.
       */
      const probe = await createImageBitmap(blob, {
        imageOrientation: "from-image",
      });

      const target = fitWithin(
        { width: probe.width, height: probe.height },
        maxEdge,
      );

      if (target.width === probe.width && target.height === probe.height) {
        return rasterFromBitmap(probe);
      }

      const resized = await createImageBitmap(blob, {
        imageOrientation: "from-image",
        resizeWidth: target.width,
        resizeHeight: target.height,
        resizeQuality: "high",
      });

      probe.close();

      return rasterFromBitmap(resized);
    } catch {
      // Falls through to the element decoder, which some browsers manage
      // for formats their createImageBitmap refuses.
    }
  }

  return decodeViaElement(blob);
}

function rasterFromBitmap(bitmap: ImageBitmap): Raster {
  return {
    source: bitmap,
    width: bitmap.width,
    height: bitmap.height,
    close: () => bitmap.close(),
  };
}

/**
 * The fallback decoder.
 *
 * An <img> applies EXIF orientation itself in every browser this app
 * supports, so what comes out is upright here too — but it cannot resize
 * during decode, so the full bitmap does briefly exist. Reached only when
 * createImageBitmap is absent or has refused the format.
 */
function decodeViaElement(blob: Blob): Promise<Raster> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const image = new Image();

    image.onload = () => {
      const width = image.naturalWidth || image.width;
      const height = image.naturalHeight || image.height;

      if (!width || !height) {
        URL.revokeObjectURL(url);
        reject(new MediaDecodeError());
        return;
      }

      resolve({
        source: image,
        width,
        height,
        close: () => URL.revokeObjectURL(url),
      });
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new MediaDecodeError());
    };

    image.src = url;
  });
}

/* ---------- drawing ---------- */

function makeCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));

  return canvas;
}

function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = canvas.getContext("2d");

  if (!context) throw new MediaDecodeError("This device has no 2D canvas.");

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  return context;
}

/**
 * A canvas as a blob, at the best format the browser will actually give.
 *
 * The returned type is read off the blob rather than assumed from the
 * request: `toBlob` with a type it does not support does not fail, it
 * quietly returns a PNG. Recording what was asked for instead of what
 * arrived is how a "WebP" library ends up full of PNGs three times the size.
 */
function toBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new MediaDecodeError("This image could not be encoded."));
      },
      mimeType,
      quality,
    );
  });
}

/**
 * A canvas encoded down the quality ladder until it fits its budget.
 *
 * Stops early the moment a rung fits, so an ordinary photograph costs one
 * encode and only a stubborn one costs four. If no rung fits, the last is
 * used — the spec is explicit that legibility outranks the byte target, and
 * this is where that is decided.
 */
async function encodeAdaptive(
  canvas: HTMLCanvasElement,
  budget: number,
): Promise<EncodedImage> {
  const ladder = qualityLadder();
  const attempts: { blob: Blob; quality: number }[] = [];

  for (const quality of ladder) {
    let blob: Blob;

    try {
      blob = await toBlob(canvas, PREFERRED_FORMAT, quality);
    } catch {
      blob = await toBlob(canvas, FALLBACK_FORMAT, quality);
    }

    attempts.push({ blob, quality });

    if (blob.size <= budget) break;
  }

  if (attempts.length === 0) {
    throw new MediaDecodeError("This image could not be encoded.");
  }

  const chosen =
    attempts[chooseRung(attempts.map((a) => a.blob.size), budget)] ??
    attempts[attempts.length - 1];

  return {
    blob: chosen.blob,
    width: canvas.width,
    height: canvas.height,
    // What actually came back, not what was asked for.
    mimeType: chosen.blob.type || FALLBACK_FORMAT,
    quality: chosen.quality,
  };
}

/* ---------- the three things the pipeline produces ---------- */

/**
 * The copy that is kept: upright, within SOURCE_MAX_EDGE, adaptively
 * compressed.
 *
 * This is the asset every future feature reads — a better model, a
 * regenerated crop, a card design that does not exist yet — which is why it
 * is a real photograph at a real size rather than a thumbnail.
 */
export async function renderSource(raster: Raster): Promise<EncodedImage> {
  const target = fitWithin(
    { width: raster.width, height: raster.height },
    SOURCE_MAX_EDGE,
  );

  const canvas = makeCanvas(target.width, target.height);
  const context = context2d(canvas);

  context.drawImage(raster.source, 0, 0, canvas.width, canvas.height);

  return encodeAdaptive(canvas, SOURCE_MAX_BYTES);
}

/**
 * The card shown above a saved word.
 *
 * The crop is taken from the raster in its own pixels, framed by the rules
 * in policy.ts, and — where the crop is not close to 16:9 — laid over a
 * blurred, over-scaled copy of itself rather than a flat colour. A neutral
 * block reads as a bug; the blur reads as depth of field, and keeps the
 * reader's eye on the target.
 */
export async function renderCard(
  raster: Raster,
  rect: NormalizedRect,
): Promise<EncodedImage> {
  const crop = normalizedRectToPixels(rect, {
    width: raster.width,
    height: raster.height,
  });

  const cropSize: Size = {
    width: Math.max(1, Math.round(crop.width)),
    height: Math.max(1, Math.round(crop.height)),
  };

  const fit = cardFit(cropSize);
  const frame = cardFrameFor(cropSize, fit);

  const canvas = makeCanvas(frame.width, frame.height);
  const context = context2d(canvas);

  if (fit === "cover") {
    const sample = coverSourceRect(cropSize, frame);

    context.drawImage(
      raster.source,
      crop.x + sample.x,
      crop.y + sample.y,
      sample.width,
      sample.height,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    return encodeAdaptive(canvas, CARD_MAX_BYTES);
  }

  /*
   * The extension first, then the target on top of it. Drawn from the same
   * crop rather than from the whole photograph, so the colours behind the
   * target are the target's own — a bottle against a blur of that bottle,
   * not against a blur of the room.
   */
  const destination = containDestinationRect(cropSize, frame);

  context.save();
  context.filter = "blur(24px)";
  /*
   * Over-drawn by a tenth on each side because a blur samples past its own
   * edge and would otherwise leave a pale border where the canvas ran out.
   */
  context.drawImage(
    raster.source,
    crop.x,
    crop.y,
    cropSize.width,
    cropSize.height,
    -canvas.width * 0.1,
    -canvas.height * 0.1,
    canvas.width * 1.2,
    canvas.height * 1.2,
  );
  context.restore();

  /*
   * A wash between the blur and the target. Without it a bright crop on a
   * bright blur has no edge at all, and the card looks like a printing
   * fault rather than a photograph in a frame.
   */
  context.fillStyle = "rgba(0, 0, 0, 0.18)";
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.drawImage(
    raster.source,
    crop.x,
    crop.y,
    cropSize.width,
    cropSize.height,
    destination.x,
    destination.y,
    destination.width,
    destination.height,
  );

  return encodeAdaptive(canvas, CARD_MAX_BYTES);
}

/**
 * The copy sent to a model, which is never stored.
 *
 * Takes its own long edge because the right answer differs per reader —
 * 768 for naming one object, 1800 for a menu — and a single encode at a
 * high quality because it is paid for once and discarded.
 */
export async function renderForRecognition(
  raster: Raster,
  maxEdge: number,
  rect?: NormalizedRect,
): Promise<string> {
  const crop = rect
    ? normalizedRectToPixels(rect, {
        width: raster.width,
        height: raster.height,
      })
    : { x: 0, y: 0, width: raster.width, height: raster.height };

  const target = fitWithin(
    {
      width: Math.max(1, Math.round(crop.width)),
      height: Math.max(1, Math.round(crop.height)),
    },
    maxEdge,
  );

  const canvas = makeCanvas(target.width, target.height);
  const context = context2d(canvas);

  context.drawImage(
    raster.source,
    crop.x,
    crop.y,
    Math.max(1, crop.width),
    Math.max(1, crop.height),
    0,
    0,
    canvas.width,
    canvas.height,
  );

  return canvas.toDataURL(FALLBACK_FORMAT, RECOGNITION_QUALITY);
}

/**
 * A video frame, captured at the resolution the sensor is actually
 * delivering.
 *
 * Deliberately not reduced here. The shutter's job is to get the pixels off
 * the camera; what happens to them is renderSource's decision, and making
 * it twice in two places is how the four different answers this pipeline
 * replaces came about.
 */
export function rasterFromVideo(video: HTMLVideoElement): Raster | null {
  const width = video.videoWidth;
  const height = video.videoHeight;

  if (!width || !height) return null;

  const canvas = makeCanvas(width, height);
  context2d(canvas).drawImage(video, 0, 0, width, height);

  return {
    source: canvas,
    width,
    height,
    close: () => {
      // Releasing the backing store on the platforms that hold onto it.
      canvas.width = 0;
      canvas.height = 0;
    },
  };
}
