import { describe, expect, it } from "vitest";

import {
  CARD_ASPECT,
  CARD_HEIGHT,
  CARD_WIDTH,
  MIN_CARD_WIDTH,
  MIN_QUALITY,
  QUALITY_LADDER,
  SOURCE_MAX_EDGE,
} from "@/lib/media/config";
import {
  cardFit,
  cardFrameFor,
  chooseRung,
  containDestinationRect,
  coverSourceRect,
  fitWithin,
  qualityLadder,
} from "@/lib/media/policy";

/* =========================================================
   The size and quality decisions, checked without a canvas

   There is no canvas in this test runner, which is exactly why these
   decisions live in their own module. The rule that matters most here —
   never enlarge a photograph to meet a maximum — is one line of code, is
   invisible when it breaks, and costs four times the storage per word when
   it does.
   ========================================================= */

const frame = { width: CARD_WIDTH, height: CARD_HEIGHT };

describe("fitting a source within a maximum edge", () => {
  it("reduces a large landscape photo by its long edge", () => {
    const fitted = fitWithin({ width: 4032, height: 3024 }, SOURCE_MAX_EDGE);

    expect(fitted.width).toBe(SOURCE_MAX_EDGE);
    expect(fitted.height).toBe(1536);
  });

  it("reduces a portrait photo by its long edge, which is the height", () => {
    const fitted = fitWithin({ width: 3024, height: 4032 }, SOURCE_MAX_EDGE);

    expect(fitted.height).toBe(SOURCE_MAX_EDGE);
    expect(fitted.width).toBe(1536);
  });

  it("never upscales an image already under the maximum", () => {
    /*
     * The rule this module exists to make checkable. A 400px thumbnail
     * dragged in from a chat must stay 400px — enlarging it invents no
     * detail and costs several times the bytes to store the same picture.
     */
    for (const source of [
      { width: 400, height: 300 },
      { width: 1, height: 1 },
      { width: SOURCE_MAX_EDGE - 1, height: 100 },
      { width: 100, height: SOURCE_MAX_EDGE - 1 },
    ]) {
      expect(fitWithin(source, SOURCE_MAX_EDGE)).toEqual(source);
    }
  });

  it("leaves an image exactly at the maximum untouched", () => {
    const exact = { width: SOURCE_MAX_EDGE, height: 1200 };

    expect(fitWithin(exact, SOURCE_MAX_EDGE)).toEqual(exact);
  });

  it("handles a square", () => {
    expect(fitWithin({ width: 5000, height: 5000 }, SOURCE_MAX_EDGE)).toEqual({
      width: SOURCE_MAX_EDGE,
      height: SOURCE_MAX_EDGE,
    });
  });

  it("keeps an unusually narrow image at least one pixel wide", () => {
    /*
     * A panorama, or a screenshot of a single column. Rounding the short
     * edge honestly would give zero, and a zero-width canvas throws — so
     * the aspect ratio is the thing that gives way, and only at the point
     * where it has to.
     */
    const sliver = fitWithin({ width: 12000, height: 3 }, SOURCE_MAX_EDGE);

    expect(sliver.width).toBe(SOURCE_MAX_EDGE);
    expect(sliver.height).toBeGreaterThanOrEqual(1);
  });

  it("survives an extremely large import without overflowing", () => {
    // A 100-megapixel medium-format scan. The point is that the answer is
    // ordinary: the long edge is the maximum and nothing is NaN.
    const huge = fitWithin({ width: 11648, height: 8736 }, SOURCE_MAX_EDGE);

    expect(huge.width).toBe(SOURCE_MAX_EDGE);
    expect(Number.isFinite(huge.height)).toBe(true);
    expect(huge.height).toBe(1536);
  });

  it("refuses to invent a size for a source that has none", () => {
    // A decode that half failed. Worth telling apart from a small image.
    expect(fitWithin({ width: 0, height: 0 }, SOURCE_MAX_EDGE)).toEqual({
      width: 0,
      height: 0,
    });

    expect(fitWithin({ width: NaN, height: 100 }, SOURCE_MAX_EDGE)).toEqual({
      width: 0,
      height: 0,
    });
  });
});

describe("the quality ladder", () => {
  it("descends, and bottoms out at the documented floor", () => {
    const ladder = qualityLadder();

    expect(ladder.length).toBeGreaterThan(1);
    expect(ladder).toEqual([...QUALITY_LADDER]);
    expect(ladder[ladder.length - 1]).toBe(MIN_QUALITY);

    for (let i = 1; i < ladder.length; i += 1) {
      expect(ladder[i]).toBeLessThan(ladder[i - 1]);
    }
  });

  it("stops at the first rung inside the budget", () => {
    // Highest quality that fits wins; there is no reason to keep descending.
    expect(chooseRung([900_000, 600_000, 400_000, 250_000], 650_000)).toBe(1);
  });

  it("takes the top rung when it already fits", () => {
    expect(chooseRung([100_000, 90_000, 80_000, 70_000], 650_000)).toBe(0);
  });

  it("ships the smallest it can rather than nothing when none fits", () => {
    /*
     * The spec's priority, as code: quality beats hitting a byte limit. A
     * card 200KB over budget is a bill. A card compressed past legibility
     * is a lost word.
     */
    expect(chooseRung([9_000_000, 8_000_000, 7_000_000, 6_000_000], 320_000))
      .toBe(3);
  });

  it("does not fall over on an empty ladder", () => {
    expect(chooseRung([], 320_000)).toBe(0);
  });
});

describe("framing a crop into the card", () => {
  it("fills the frame for a crop that is already about 16:9", () => {
    expect(cardFit({ width: 1600, height: 900 })).toBe("cover");
    expect(cardFit({ width: 1600, height: 1000 })).toBe("cover");
  });

  it("fits a tall crop whole rather than cutting it", () => {
    /*
     * The spec is explicit that the target is never cut to satisfy the
     * layout. A bottle photographed portrait would lose most of itself to a
     * centre crop, so it is fitted inside the frame instead.
     */
    expect(cardFit({ width: 600, height: 1600 })).toBe("contain");
  });

  it("fits an unusually wide crop whole as well", () => {
    // A shop sign. Filling 16:9 with it would shave off both ends — which
    // is where the words are.
    expect(cardFit({ width: 3000, height: 400 })).toBe("contain");
  });

  it("treats a square as too far off to fill", () => {
    // A square loses 44% of its height to a 16:9 fill. Not a sliver.
    expect(cardFit({ width: 800, height: 800 })).toBe("contain");
  });

  it("does not fill a frame from a crop with no area", () => {
    expect(cardFit({ width: 0, height: 0 })).toBe("contain");
  });

  it("is symmetric about the frame's own ratio", () => {
    // Being 8% wide of 16:9 and 8% narrow of it are the same size of
    // compromise, and should be judged the same way.
    const wide = cardFit({ width: CARD_ASPECT * 1.08, height: 1 });
    const narrow = cardFit({ width: CARD_ASPECT / 1.08, height: 1 });

    expect(wide).toBe(narrow);
  });
});

describe("what size the card itself is generated at", () => {
  it("uses the full card width for a crop that can support it", () => {
    expect(cardFrameFor({ width: 1800, height: 1000 }, "cover")).toEqual({
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
    });
  });

  it("generates a smaller card rather than enlarging a small crop", () => {
    /*
     * The ceiling-not-target rule. A 640x360 target drawn into a 1200-wide
     * card would be a near-twofold enlargement of the same picture; the
     * card is made 640 wide instead and the CSS container scales it.
     */
    const framed = cardFrameFor({ width: 640, height: 360 }, "cover");

    expect(framed.width).toBe(640);
    expect(framed.height).toBe(360);
  });

  it("never asks a crop to be enlarged, above the floor", () => {
    for (const crop of [
      { width: 900, height: 500 },
      { width: 700, height: 1400 },
      { width: 2000, height: 480 },
      { width: 512, height: 512 },
    ]) {
      const fit = cardFit(crop);
      const framed = cardFrameFor(crop, fit);

      // Above MIN_CARD_WIDTH the frame is never larger than the crop can
      // fill at its own scale.
      if (framed.width > MIN_CARD_WIDTH) {
        const scale =
          fit === "contain"
            ? Math.min(framed.width / crop.width, framed.height / crop.height)
            : Math.max(framed.width / crop.width, framed.height / crop.height);

        expect(scale).toBeLessThanOrEqual(1 + 1e-6);
      }
    }
  });

  it("comes up to the floor for a very small crop, deliberately", () => {
    // The documented exception: below this a card looks broken rather than
    // soft, so a tiny crop is enlarged to meet it.
    const framed = cardFrameFor({ width: 120, height: 80 }, "contain");

    expect(framed.width).toBe(MIN_CARD_WIDTH);
  });

  it("always produces a 16:9 frame", () => {
    for (const crop of [
      { width: 3000, height: 200 },
      { width: 200, height: 3000 },
      { width: 0, height: 0 },
    ]) {
      const framed = cardFrameFor(crop, cardFit(crop));

      expect(framed.width / framed.height).toBeCloseTo(CARD_ASPECT, 2);
    }
  });
});

describe("the rectangles the card is drawn from and into", () => {
  it("samples a centred strip when covering with a wider source", () => {
    const source = { width: 2000, height: 1000 };
    const rect = coverSourceRect(source, frame);

    // 2:1 into 16:9 keeps the full height and trims the width, centred.
    expect(rect.height).toBe(1000);
    expect(rect.width).toBeCloseTo(1000 * CARD_ASPECT, 6);
    expect(rect.x).toBeCloseTo((2000 - 1000 * CARD_ASPECT) / 2, 6);
    expect(rect.y).toBe(0);
  });

  it("samples a centred band when covering with a taller source", () => {
    const source = { width: 1000, height: 2000 };
    const rect = coverSourceRect(source, frame);

    expect(rect.width).toBe(1000);
    expect(rect.height).toBeCloseTo(1000 / CARD_ASPECT, 6);
    expect(rect.x).toBe(0);
    expect(rect.y).toBeCloseTo((2000 - 1000 / CARD_ASPECT) / 2, 6);
  });

  it("never samples outside the source it was given", () => {
    for (const source of [
      { width: 2000, height: 1000 },
      { width: 1000, height: 2000 },
      { width: 900, height: 900 },
      { width: 4000, height: 100 },
    ]) {
      const rect = coverSourceRect(source, frame);

      expect(rect.x).toBeGreaterThanOrEqual(-1e-9);
      expect(rect.y).toBeGreaterThanOrEqual(-1e-9);
      expect(rect.x + rect.width).toBeLessThanOrEqual(source.width + 1e-9);
      expect(rect.y + rect.height).toBeLessThanOrEqual(source.height + 1e-9);
    }
  });

  it("centres a contained crop and leaves the margins for the blur", () => {
    // A tall crop: full height, margins left and right.
    const rect = containDestinationRect({ width: 600, height: 1200 }, frame);

    expect(rect.height).toBe(CARD_HEIGHT);
    expect(rect.width).toBe(Math.round(CARD_HEIGHT / 2));
    expect(rect.x).toBe(Math.round((CARD_WIDTH - rect.width) / 2));
    expect(rect.y).toBe(0);
  });

  it("never places a contained crop outside the frame", () => {
    for (const source of [
      { width: 600, height: 1200 },
      { width: 4000, height: 300 },
      { width: 900, height: 900 },
      { width: 1, height: 4000 },
    ]) {
      const rect = containDestinationRect(source, frame);

      expect(rect.x).toBeGreaterThanOrEqual(0);
      expect(rect.y).toBeGreaterThanOrEqual(0);
      expect(rect.x + rect.width).toBeLessThanOrEqual(CARD_WIDTH);
      expect(rect.y + rect.height).toBeLessThanOrEqual(CARD_HEIGHT);
    }
  });

  it("fills the frame it is given in the binding dimension", () => {
    /*
     * This helper fits into whatever frame it is handed; keeping a small
     * crop from being enlarged is cardFrameFor's job, one step earlier,
     * which is where that rule is tested.
     */
    const rect = containDestinationRect({ width: 300, height: 200 }, frame);

    expect(rect.height).toBe(CARD_HEIGHT);
    expect(rect.width).toBeLessThanOrEqual(CARD_WIDTH);
  });
});
