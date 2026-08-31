import { beforeEach, describe, expect, it } from "vitest";

import {
  clearImageCapture,
  holdImageCapture,
  takeImageCapture,
} from "@/lib/lexicon/pendingImageCapture";
import type { PendingCapture } from "@/lib/media/assets";

/* =========================================================
   The photograph between the lookup and the save

   Small, and worth testing anyway: it decides whether a picture ends up on
   the right word. The two failure modes are attaching someone's bottle
   photograph to a word they typed afterwards, and attaching the same two
   files to two rows so that deleting either blanks the other.
   ========================================================= */

function capture(name: string): PendingCapture {
  return {
    sourceType: "photo",
    source: { blob: new Blob(), width: 1, height: 1, mimeType: "image/webp", quality: 1 },
    card: { blob: new Blob(), width: 1, height: 1, mimeType: "image/webp", quality: 1 },
    targetRect: { x: 0, y: 0, width: 1, height: 1 },
    originalDimensions: { width: 1, height: 1 },
    sourceFileName: name,
  };
}

beforeEach(() => clearImageCapture());

describe("holding a capture for the save that follows", () => {
  it("hands the capture to the word that produced it", () => {
    holdImageCapture("bouteille", capture("bottle.jpg"));

    expect(takeImageCapture("bouteille")?.sourceFileName).toBe("bottle.jpg");
  });

  it("gives it up only once", () => {
    /*
     * Saving the same word twice must not attach the same two files to both
     * rows: deleting either would then take the other's picture with it.
     */
    holdImageCapture("verre", capture("glass.jpg"));

    expect(takeImageCapture("verre")).not.toBeNull();
    expect(takeImageCapture("verre")).toBeNull();
  });

  it("refuses a word it did not come from", () => {
    // Photograph a bottle, then type something else and save that. The
    // picture belongs to the word the model produced.
    holdImageCapture("bouteille", capture("bottle.jpg"));

    expect(takeImageCapture("fenêtre")).toBeNull();
  });

  it("still matches through the spacing and case a headword picks up", () => {
    holdImageCapture("Bouteille", capture("bottle.jpg"));

    expect(takeImageCapture("  bouteille ")).not.toBeNull();
  });

  it("keeps the newer photograph when two are taken in a row", () => {
    holdImageCapture("un", capture("first.jpg"));
    holdImageCapture("deux", capture("second.jpg"));

    expect(takeImageCapture("un")).toBeNull();
    expect(takeImageCapture("deux")?.sourceFileName).toBe("second.jpg");
  });

  it("holds nothing after being cleared", () => {
    // What closing the sheet does. Nothing reached storage, so there is
    // nothing to clean up — the capture simply stops existing.
    holdImageCapture("bouteille", capture("bottle.jpg"));
    clearImageCapture();

    expect(takeImageCapture("bouteille")).toBeNull();
  });

  it("returns null when nothing was ever held", () => {
    expect(takeImageCapture("anything")).toBeNull();
  });
});
