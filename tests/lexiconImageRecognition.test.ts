import { describe, expect, it } from "vitest";

import {
  ImageRecognitionError,
  MAX_AI_DIMENSION,
  MAX_IMAGE_FILE_SIZE,
  MAX_PREVIEW_DIMENSION,
  fileToModelImage,
} from "@/lib/lexicon/imageRecognition";

/* =========================================================
   Refusing a photograph before decoding it

   The two guards here run before any pixels are read, which is the point: a
   forty-megabyte screenshot should be turned away in a microsecond, not after
   the browser has spent a second decoding it to discover it is too big.
   ========================================================= */

function file(type: string, size: number): File {
  const blob = new Blob([new Uint8Array(1)], { type });

  // A real File of tens of megabytes would be built byte by byte in the test
  // runner for no benefit; only the reported size is read.
  Object.defineProperty(blob, "size", { value: size });

  return blob as File;
}

describe("reading a picked photo", () => {
  it("refuses something that is not an image", async () => {
    await expect(fileToModelImage(file("application/pdf", 1024))).rejects.toThrow(
      ImageRecognitionError,
    );

    await expect(
      fileToModelImage(file("application/pdf", 1024)),
    ).rejects.toMatchObject({ code: "not-an-image" });
  });

  it("refuses an image past the size limit", async () => {
    await expect(
      fileToModelImage(file("image/jpeg", MAX_IMAGE_FILE_SIZE + 1)),
    ).rejects.toMatchObject({ code: "too-large" });
  });

  it("carries a code rather than a sentence", () => {
    // The message is for a log. What the screen shows is chosen from the code,
    // in the reader's own language — a library has no business holding the
    // English one.
    const error = new ImageRecognitionError("daily-limit");

    expect(error.code).toBe("daily-limit");
    expect(error.name).toBe("ImageRecognitionError");
  });
});

describe("the sizes the model and the screen get", () => {
  it("sends the model a smaller copy than the one kept for the card", () => {
    /*
     * Gemini bills in 768px tiles, so the model's copy is one tile and the
     * preview's is four. Both numbers live in one module now — the capture
     * screen imports them rather than declaring its own, which is what stops
     * one of them being tuned and the other quietly not.
     */
    expect(MAX_AI_DIMENSION).toBeLessThan(MAX_PREVIEW_DIMENSION);
  });
});
