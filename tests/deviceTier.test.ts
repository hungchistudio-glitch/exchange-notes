import { describe, expect, it } from "vitest";

import { DEVICE_TIER_SCRIPT } from "@/lib/deviceTier";

/*
 * The header and the dock are blurred glass over the one scrolling viewport,
 * so their backdrop-filter is re-computed on every frame of every scroll. On
 * a phone that cannot spend that, the glass becomes plain surface.
 *
 * The direction of the guess is the thing to protect. Taking the effect away
 * from a phone that could have rendered it is invisible to the reader and
 * therefore never corrected, so silence has to mean "capable".
 */

/** Runs the real inline script against a made-up navigator. */
function tierFor(navigator: Record<string, unknown>) {
  const document = { documentElement: { dataset: {} as Record<string, string> } };

  new Function("navigator", "document", DEVICE_TIER_SCRIPT)(
    navigator,
    document,
  );

  return document.documentElement.dataset.deviceTier;
}

describe("deciding what a device can afford", () => {
  it("leaves iPhones and capable Android alone", () => {
    // Safari reports hardwareConcurrency and not deviceMemory.
    expect(tierFor({ hardwareConcurrency: 6 })).toBe("capable");
    expect(tierFor({ hardwareConcurrency: 8, deviceMemory: 8 })).toBe(
      "capable",
    );

    /*
     * Four cores is not evidence of a modest device — it is what a capable
     * laptop reports, and an earlier threshold here called one of those
     * modest on the strength of the core count alone.
     */
    expect(tierFor({ hardwareConcurrency: 4, deviceMemory: 8 })).toBe(
      "capable",
    );
    expect(tierFor({ hardwareConcurrency: 4 })).toBe("capable");
  });

  it("recognises a modest device from either signal on its own", () => {
    // An A9/A10 iPhone says two.
    expect(tierFor({ hardwareConcurrency: 2 })).toBe("modest");
    // Plenty of cores, not much memory — the common mid Android shape.
    expect(tierFor({ hardwareConcurrency: 8, deviceMemory: 4 })).toBe("modest");
  });

  it("assumes capable when the browser says nothing", () => {
    /*
     * Nothing is inferred from silence. A reader cannot see an effect they
     * are not being shown, so guessing "modest" wrongly is a fault that is
     * never reported and never fixed.
     */
    expect(tierFor({})).toBe("capable");
    expect(tierFor({ hardwareConcurrency: 0 })).toBe("capable");
    expect(tierFor({ hardwareConcurrency: undefined })).toBe("capable");
  });

  it("assumes capable when reading the device throws", () => {
    const hostile = {
      get hardwareConcurrency(): number {
        throw new Error("blocked by a privacy setting");
      },
    };

    expect(tierFor(hostile)).toBe("capable");
  });
});
