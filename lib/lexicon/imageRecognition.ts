"use client";

import type { ObjectIdentificationResult } from "@/lib/ai/identifyObject";

/* =========================================================
   Asking the model what is in a photograph

   This module used to hold the whole path from a File to a word: the
   size limits, the downscale, the JPEG encode, and the request. All of it
   except the request has moved to lib/media, which is where the capture
   screen and the menu scanner do the same work — three copies of an image
   pipeline was the thing that made a photograph mean three different sizes
   depending on which screen the reader had opened.

   What is left is the part that was always specific to this: one request,
   with a timeout, and failures that carry a code rather than a sentence.

   MAX_IMAGE_FILE_SIZE is re-exported from lib/media/config rather than
   declared again. It was declared twice for a while, which is exactly the
   drift worth not having: two constants named the same thing that nothing
   stops from disagreeing.
   ========================================================= */

export { MAX_IMAGE_FILE_SIZE } from "@/lib/media/config";

/*
 * Above the server's own budget, deliberately.
 *
 * At sixteen seconds this abort fired while the route was still working, and
 * the reader was told the recognition had timed out for a request that had
 * already spent a daily unit and was about to answer. The server now bounds
 * itself (VISION_TOTAL_BUDGET_MS, twenty seconds by default) and returns a
 * real error when it runs out; this is the backstop for a connection that
 * dies rather than the thing that decides how long a reader waits.
 */
const IDENTIFY_TIMEOUT_MS = 25 * 1000;

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
 * Asks the model what is in the photograph.
 *
 * The timeout is here rather than left to the browser because a request that
 * outlives the server's own budget is a connection that has died, and a
 * reader holding a phone up to a lamp deserves to be told so rather than
 * watched.
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
