import { describe, expect, it, vi } from "vitest";

import {
  ImageRecognitionError,
  MAX_IMAGE_FILE_SIZE,
  identifyImage,
} from "@/lib/lexicon/imageRecognition";
import {
  RECOGNITION_EDGE,
  SOURCE_MAX_EDGE,
  MAX_IMAGE_FILE_SIZE as CONFIG_MAX_FILE_SIZE,
} from "@/lib/media/config";

/* =========================================================
   What is left of this module, and where the rest went

   The guards this file used to check — not-an-image, too-large — moved to
   the callers when the decoding did, because they belong next to the decode
   they are protecting. They are checked in tests/lexiconImageLookup.test.tsx
   against the hook that now performs them.

   What stays here is the request: its failure codes, and the one size
   relationship still worth pinning across modules.
   ========================================================= */

describe("a failure with a name", () => {
  it("carries a code rather than a sentence", () => {
    // The message is for a log. What the screen shows is chosen from the
    // code, in the reader's own language — a library has no business holding
    // the English one.
    const error = new ImageRecognitionError("daily-limit");

    expect(error.code).toBe("daily-limit");
    expect(error.name).toBe("ImageRecognitionError");
  });
});

describe("the sizes the model and the storage get", () => {
  it("sends the model a smaller copy than the one kept for the future", () => {
    /*
     * Gemini bills in 768px tiles, so the object reader's copy is one tile.
     * The retained source is much larger because it is not for the model at
     * all — it is what a better model reads later.
     */
    expect(RECOGNITION_EDGE.object).toBeLessThan(SOURCE_MAX_EDGE);
  });

  it("reads a menu at a higher resolution than a single object", () => {
    // A menu is 9pt type at a metre; a bottle on a table is not.
    expect(RECOGNITION_EDGE.document).toBeGreaterThan(RECOGNITION_EDGE.object);
  });

  it("has exactly one file-size limit", () => {
    /*
     * This module re-exports the config's constant rather than declaring a
     * second one. They were two separate declarations for a while, which is
     * precisely the drift the media pipeline exists to end.
     */
    expect(MAX_IMAGE_FILE_SIZE).toBe(CONFIG_MAX_FILE_SIZE);
  });
});

describe("image lookup failures", () => {
  it("turns both minute and service rate limits into the translated busy state", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Wait", code: "rate_limit" }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(identifyImage("data:image/jpeg;base64,AA==")).rejects.toMatchObject({
      code: "busy",
    });
  });

  it("keeps the daily limit distinct from a short-lived busy response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Tomorrow", code: "daily_limit" }), {
        status: 429,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(identifyImage("data:image/jpeg;base64,AA==")).rejects.toMatchObject({
      code: "daily-limit",
    });
  });
});
