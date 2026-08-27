"use client";

import type { ObjectIdentificationResult } from "@/lib/ai/identifyObject";

/* =========================================================
   A photo, read where the reader is standing

   The search's Image key used to navigate to the capture screen and let it
   open the picker two hundred milliseconds later. A whole screen, mounted and
   painted, to do nothing but click a file input — and on the way, a page the
   reader had not asked for.

   The picker belongs to the button that opens it. What this module holds is
   everything between "a File arrived" and "here is a word": the downscale, the
   size limits, and the request. Extracted rather than copied, because the
   capture screen still does the same work for the camera and two copies of an
   image pipeline drift into two different answers for the same photograph.
   ========================================================= */

export const MAX_IMAGE_FILE_SIZE = 10 * 1024 * 1024;

/** What the preview and the saved word's image are kept at. */
export const MAX_PREVIEW_DIMENSION = 1280;

/**
 * What the model is sent.
 *
 * Gemini bills images as 768x768 tiles, so a 1280px photo costs four tiles
 * where a 768px one costs a single tile. Identifying the object nearest the
 * centre does not need the extra detail.
 */
export const MAX_AI_DIMENSION = 768;

export const JPEG_QUALITY = 0.8;

const IDENTIFY_TIMEOUT_MS = 16 * 1000;

/** Which sentence the reader should be shown. */
export type ImageRecognitionCode =
  | "not-an-image"
  | "too-large"
  | "unreadable"
  | "daily-limit"
  | "busy"
  | "timeout"
  | "failed";

/**
 * A failure with a name, so the caller can pick a translated sentence rather
 * than matching on a message written in English inside a library.
 */
export class ImageRecognitionError extends Error {
  readonly code: ImageRecognitionCode;

  constructor(code: ImageRecognitionCode) {
    super(`Image recognition failed: ${code}`);
    this.name = "ImageRecognitionError";
    this.code = code;
  }
}

/**
 * Draws an image onto a canvas at no more than `maxDimension` on its longest
 * side, and returns it as a JPEG data URL.
 *
 * Returns null for a source with no usable dimensions — a decode that half
 * failed, which is worth telling apart from one that produced a small image.
 */
export function downscaleToDataUrl(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  maxDimension: number = MAX_PREVIEW_DIMENSION,
  canvas?: HTMLCanvasElement | null,
): string | null {
  if (
    !Number.isFinite(sourceWidth) ||
    !Number.isFinite(sourceHeight) ||
    sourceWidth <= 0 ||
    sourceHeight <= 0
  ) {
    return null;
  }

  const target = canvas ?? document.createElement("canvas");

  const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));

  target.width = Math.max(1, Math.round(sourceWidth * scale));
  target.height = Math.max(1, Math.round(sourceHeight * scale));

  const context = target.getContext("2d");

  if (!context) return null;

  context.clearRect(0, 0, target.width, target.height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(source, 0, 0, target.width, target.height);

  return target.toDataURL("image/jpeg", JPEG_QUALITY);
}

function decode(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new ImageRecognitionError("unreadable"));
    image.src = dataUrl;
  });
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new ImageRecognitionError("unreadable"));
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }

      reject(new ImageRecognitionError("unreadable"));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * A picked file, checked and reduced to the copy the model is sent.
 *
 * The checks come first and are cheap: a 40 MB screenshot should be refused
 * before it is decoded, not after the browser has spent a second on it.
 */
export async function fileToModelImage(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new ImageRecognitionError("not-an-image");
  }

  if (file.size > MAX_IMAGE_FILE_SIZE) {
    throw new ImageRecognitionError("too-large");
  }

  const image = await decode(await readAsDataUrl(file));

  const downscaled = downscaleToDataUrl(
    image,
    image.naturalWidth || image.width,
    image.naturalHeight || image.height,
    MAX_AI_DIMENSION,
  );

  if (!downscaled) throw new ImageRecognitionError("unreadable");

  return downscaled;
}

/**
 * Asks the model what is in the photograph.
 *
 * The timeout is here rather than left to the browser because a recognition
 * that has not answered in sixteen seconds is not going to, and a reader
 * holding a phone up to a lamp deserves to be told so rather than watched.
 */
export async function identifyImage(
  image: string,
): Promise<ObjectIdentificationResult> {
  const controller = new AbortController();
  const timeout = window.setTimeout(
    () => controller.abort(),
    IDENTIFY_TIMEOUT_MS,
  );

  let response: Response;

  try {
    response = await fetch("/api/identify-object", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image }),
      signal: controller.signal,
    });
  } catch (requestError) {
    throw requestError instanceof DOMException &&
      requestError.name === "AbortError"
      ? new ImageRecognitionError("timeout")
      : new ImageRecognitionError("failed");
  } finally {
    window.clearTimeout(timeout);
  }

  const data = (await response.json()) as
    | ObjectIdentificationResult
    | { error: string; code?: string };

  if (!response.ok || "error" in data) {
    const code = "error" in data ? data.code : undefined;

    throw new ImageRecognitionError(
      code === "daily_limit"
        ? "daily-limit"
        : code === "busy" ||
            code === "rate_limit" ||
            response.status === 429 ||
            response.status === 503
          ? "busy"
          : "failed",
    );
  }

  return data;
}
