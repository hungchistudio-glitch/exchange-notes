import { describe, expect, it } from "vitest";

import {
  clampRect,
  containLayout,
  coverLayout,
  ensureMinimumSize,
  imageToViewport,
  mirrorPoint,
  mirrorRect,
  normalizedRectToPixels,
  normalizedRectToViewport,
  padRect,
  pickTarget,
  rotateRect,
  viewportPointToNormalized,
  viewportRectToNormalized,
  viewportToImage,
  type NormalizedRect,
} from "@/lib/media/geometry";

/* =========================================================
   The arithmetic that can be wrong without looking wrong

   Everything here is checked against numbers worked out by hand rather than
   against the implementation, which is the only way this kind of test is
   worth writing: a test that recomputes the code's own formula agrees with
   it whether or not either is right.
   ========================================================= */

/** Two rects equal to within a pixel-ish tolerance on a unit square. */
function expectRectClose(
  actual: NormalizedRect,
  expected: NormalizedRect,
  precision = 6,
) {
  expect(actual.x).toBeCloseTo(expected.x, precision);
  expect(actual.y).toBeCloseTo(expected.y, precision);
  expect(actual.width).toBeCloseTo(expected.width, precision);
  expect(actual.height).toBeCloseTo(expected.height, precision);
}

describe("laying an image out in a viewport", () => {
  it("covers a portrait screen with a landscape camera frame", () => {
    /*
     * A 1920x1080 sensor on a 390x844 phone. Cover scales by the taller
     * requirement — 844/1080 = 0.7815 — and the frame then measures 1500
     * wide against a 390 screen, so 555 pixels hang off each side.
     */
    const layout = coverLayout(
      { width: 1920, height: 1080 },
      { width: 390, height: 844 },
    );

    expect(layout.scale).toBeCloseTo(844 / 1080, 6);
    expect(layout.offsetY).toBeCloseTo(0, 6);
    expect(layout.offsetX).toBeCloseTo((390 - 1920 * (844 / 1080)) / 2, 4);
    // Hanging off, not letterboxed.
    expect(layout.offsetX).toBeLessThan(0);
  });

  it("letterboxes the same frame when contained", () => {
    const layout = containLayout(
      { width: 1920, height: 1080 },
      { width: 390, height: 844 },
    );

    expect(layout.scale).toBeCloseTo(390 / 1920, 6);
    expect(layout.offsetX).toBeCloseTo(0, 6);
    expect(layout.offsetY).toBeGreaterThan(0);
  });

  it("survives a viewport that has not been measured yet", () => {
    // A ref read on the first render, before layout. Must not produce NaN
    // that then propagates into a stored crop.
    const layout = coverLayout(
      { width: 1920, height: 1080 },
      { width: 0, height: 0 },
    );

    expect(layout).toEqual({ scale: 1, offsetX: 0, offsetY: 0 });
  });
});

describe("preview-to-image coordinate conversion", () => {
  const natural = { width: 1920, height: 1080 };
  const viewport = { width: 390, height: 844 };
  const layout = coverLayout(natural, viewport);

  it("maps the centre of the screen to the centre of the frame", () => {
    const point = viewportPointToNormalized(
      { x: 195, y: 422 },
      natural,
      layout,
    );

    expect(point.x).toBeCloseTo(0.5, 6);
    expect(point.y).toBeCloseTo(0.5, 6);
  });

  it("round-trips a point through both directions", () => {
    const original = { x: 120, y: 300 };
    const back = imageToViewport(viewportToImage(original, layout), layout);

    expect(back.x).toBeCloseTo(original.x, 6);
    expect(back.y).toBeCloseTo(original.y, 6);
  });

  it("clamps a tap that lands outside the image", () => {
    /*
     * Under contain there is real letterboxing to tap on. A tap up in the
     * margin is not at a negative fraction of the photograph — it is at its
     * top edge, and storing -0.2 would crop from outside the source.
     */
    const contained = containLayout(natural, viewport);
    const point = viewportPointToNormalized({ x: 195, y: 4 }, natural, contained);

    expect(point.y).toBe(0);
    expect(point.x).toBeCloseTo(0.5, 6);
  });

  it("round-trips a rect through both directions", () => {
    const rect: NormalizedRect = {
      x: 0.2,
      y: 0.35,
      width: 0.3,
      height: 0.25,
    };

    const back = viewportRectToNormalized(
      normalizedRectToViewport(rect, natural, layout),
      natural,
      layout,
    );

    expectRectClose(back, rect);
  });

  it("keeps a rect dragged off the edge to the part that is on the image", () => {
    /*
     * Under cover the frame extends well past the screen — about 555px off
     * each side here — so going off the *image* means going further left
     * than the viewport's own edge. x: -400 would still be on the frame.
     */
    expect(layout.offsetX).toBeLessThan(-500);

    const rect = viewportRectToNormalized(
      { x: -700, y: 200, width: 500, height: 100 },
      natural,
      layout,
    );

    expect(rect.x).toBe(0);
    expect(rect.width).toBeGreaterThan(0);
    expect(rect.x + rect.width).toBeLessThanOrEqual(1);
  });

  it("reports zero area for a rect entirely off the image", () => {
    // The honest answer. A plausible-looking rect somewhere else would be
    // cropped without complaint and produce a card of the wrong thing.
    const contained = containLayout(natural, viewport);
    const rect = viewportRectToNormalized(
      { x: 195, y: -300, width: 50, height: 50 },
      natural,
      contained,
    );

    expect(rect.height).toBe(0);
  });
});

describe("viewer zoom and the coordinates underneath it", () => {
  const natural = { width: 3000, height: 2000 };
  const viewport = { width: 390, height: 700 };

  it("reads the same normalised point at any zoom", () => {
    /*
     * The spec's requirement, as a test: a reader who pinches in to look at
     * a label more closely and then taps it must select the same part of the
     * photograph they would have selected zoomed out.
     *
     * The screen point is recomputed for each zoom — the reader is tapping
     * the same *feature*, which has moved on screen — and the normalised
     * answer must come back identical.
     */
    const base = containLayout(natural, viewport);
    const feature = { x: 0.62, y: 0.41 };

    for (const scale of [1, 1.5, 2.5, 4]) {
      const zoomed = {
        scale: base.scale * scale,
        offsetX:
          viewport.width / 2 + (base.offsetX - viewport.width / 2) * scale,
        offsetY:
          viewport.height / 2 + (base.offsetY - viewport.height / 2) * scale,
      };

      const onScreen = imageToViewport(
        { x: feature.x * natural.width, y: feature.y * natural.height },
        zoomed,
      );

      const read = viewportPointToNormalized(onScreen, natural, zoomed);

      expect(read.x).toBeCloseTo(feature.x, 6);
      expect(read.y).toBeCloseTo(feature.y, 6);
    }
  });
});

describe("safety padding", () => {
  it("grows a rect by the fraction of its own size", () => {
    // 0.2 wide, 20% padding, so a tenth of the width on each side.
    const padded = padRect(
      { x: 0.4, y: 0.4, width: 0.2, height: 0.2 },
      0.2,
    );

    expectRectClose(padded, { x: 0.38, y: 0.38, width: 0.24, height: 0.24 });
  });

  it("clips rather than shifts against each of the four edges", () => {
    const padding = 0.5;

    const left = padRect({ x: 0, y: 0.4, width: 0.2, height: 0.2 }, padding);
    expect(left.x).toBe(0);
    // Grew only to the right: 0.2 + one half-margin of 0.05.
    expect(left.width).toBeCloseTo(0.25, 6);

    const top = padRect({ x: 0.4, y: 0, width: 0.2, height: 0.2 }, padding);
    expect(top.y).toBe(0);
    expect(top.height).toBeCloseTo(0.25, 6);

    const right = padRect({ x: 0.8, y: 0.4, width: 0.2, height: 0.2 }, padding);
    expect(right.x).toBeCloseTo(0.75, 6);
    expect(right.x + right.width).toBeCloseTo(1, 6);

    const bottom = padRect({ x: 0.4, y: 0.8, width: 0.2, height: 0.2 }, padding);
    expect(bottom.y).toBeCloseTo(0.75, 6);
    expect(bottom.y + bottom.height).toBeCloseTo(1, 6);
  });

  it("keeps a corner target in its corner", () => {
    /*
     * The case the "clip, do not shift" rule exists for. A word in the top
     * left must not be recentred by sliding the crop down and right, which
     * would buy context nobody asked for at the cost of the word.
     */
    const padded = padRect({ x: 0, y: 0, width: 0.15, height: 0.1 }, 0.4);

    expect(padded.x).toBe(0);
    expect(padded.y).toBe(0);
  });

  it("never leaves the unit square, whatever it is given", () => {
    const cases: NormalizedRect[] = [
      { x: 0, y: 0, width: 1, height: 1 },
      { x: 0.99, y: 0.99, width: 0.01, height: 0.01 },
      { x: 0.5, y: 0.5, width: 0.5, height: 0.5 },
    ];

    for (const rect of cases) {
      const padded = padRect(rect, 0.25);

      expect(padded.x).toBeGreaterThanOrEqual(0);
      expect(padded.y).toBeGreaterThanOrEqual(0);
      expect(padded.x + padded.width).toBeLessThanOrEqual(1 + 1e-9);
      expect(padded.y + padded.height).toBeLessThanOrEqual(1 + 1e-9);
    }
  });
});

describe("minimum target size", () => {
  it("grows a mis-tap about its own centre", () => {
    const grown = ensureMinimumSize(
      { x: 0.5, y: 0.5, width: 0.01, height: 0.01 },
      0.1,
    );

    expect(grown.width).toBeCloseTo(0.1, 6);
    expect(grown.x + grown.width / 2).toBeCloseTo(0.505, 6);
  });

  it("slides back inside when the centre is against an edge", () => {
    // Here sliding is right: a rect hanging off the image cannot be cropped.
    const grown = ensureMinimumSize(
      { x: 0, y: 0, width: 0.01, height: 0.01 },
      0.2,
    );

    expect(grown.x).toBe(0);
    expect(grown.y).toBe(0);
    expect(grown.width).toBeCloseTo(0.2, 6);
  });

  it("leaves a target that is already big enough alone", () => {
    const rect = { x: 0.2, y: 0.2, width: 0.5, height: 0.4 };

    expectRectClose(ensureMinimumSize(rect, 0.06), rect);
  });
});

describe("rotation", () => {
  const rect: NormalizedRect = { x: 0.1, y: 0.2, width: 0.3, height: 0.4 };

  it("leaves a rect alone at zero turns", () => {
    expectRectClose(rotateRect(rect, 0), rect);
  });

  it("swaps the axes on a quarter turn", () => {
    // Clockwise: the left edge becomes the top edge.
    expectRectClose(rotateRect(rect, 1), {
      x: 1 - 0.2 - 0.4,
      y: 0.1,
      width: 0.4,
      height: 0.3,
    });
  });

  it("returns to the original after four quarter turns", () => {
    let turned = rect;
    for (let i = 0; i < 4; i += 1) turned = rotateRect(turned, 1);

    expectRectClose(turned, rect);
  });

  it("agrees with itself however the turns are counted", () => {
    expectRectClose(rotateRect(rect, 2), rotateRect(rotateRect(rect, 1), 1));
    expectRectClose(rotateRect(rect, 3), rotateRect(rect, -1));
    expectRectClose(rotateRect(rect, 5), rotateRect(rect, 1));
  });

  it("keeps a rotated rect inside the unit square", () => {
    for (const turns of [0, 1, 2, 3]) {
      const turned = rotateRect(
        { x: 0.7, y: 0.05, width: 0.3, height: 0.9 },
        turns,
      );

      expect(turned.x).toBeGreaterThanOrEqual(-1e-9);
      expect(turned.y).toBeGreaterThanOrEqual(-1e-9);
      expect(turned.x + turned.width).toBeLessThanOrEqual(1 + 1e-9);
      expect(turned.y + turned.height).toBeLessThanOrEqual(1 + 1e-9);
    }
  });
});

describe("mirroring", () => {
  it("flips a rect across the vertical centre line", () => {
    expectRectClose(mirrorRect({ x: 0.1, y: 0.2, width: 0.3, height: 0.4 }), {
      x: 0.6,
      y: 0.2,
      width: 0.3,
      height: 0.4,
    });
  });

  it("is its own inverse", () => {
    const rect = { x: 0.15, y: 0.25, width: 0.35, height: 0.2 };

    expectRectClose(mirrorRect(mirrorRect(rect)), rect);
    expect(mirrorPoint(mirrorPoint({ x: 0.3, y: 0.7 })).x).toBeCloseTo(0.3, 6);
  });

  it("leaves a centred rect where it is", () => {
    expectRectClose(mirrorRect({ x: 0.4, y: 0.1, width: 0.2, height: 0.2 }), {
      x: 0.4,
      y: 0.1,
      width: 0.2,
      height: 0.2,
    });
  });
});

describe("choosing a target from candidates", () => {
  const block: NormalizedRect = { x: 0.1, y: 0.1, width: 0.8, height: 0.5 };
  const line: NormalizedRect = { x: 0.15, y: 0.2, width: 0.5, height: 0.08 };

  it("prefers the smallest rect under the tap", () => {
    // A line sits inside the block around it; tapping the line means the line.
    expect(pickTarget([block, line], { x: 0.3, y: 0.24 })).toBe(line);
  });

  it("still picks the block where only the block is", () => {
    expect(pickTarget([block, line], { x: 0.8, y: 0.5 })).toBe(block);
  });

  it("forgives a tap just outside a small target", () => {
    expect(pickTarget([line], { x: 0.66, y: 0.24 }, 0.08)).toBe(line);
  });

  it("returns nothing for a tap in open space", () => {
    expect(pickTarget([line], { x: 0.95, y: 0.95 }, 0.08)).toBeNull();
  });

  it("returns nothing when there are no candidates at all", () => {
    expect(pickTarget([], { x: 0.5, y: 0.5 })).toBeNull();
  });
});

describe("clamping and pixel conversion", () => {
  it("pulls an out-of-range rect back into the unit square", () => {
    const clamped = clampRect({
      x: -0.2,
      y: 0.9,
      width: 2,
      height: 0.5,
    });

    expect(clamped.x).toBe(0);
    expect(clamped.x + clamped.width).toBeLessThanOrEqual(1);
    expect(clamped.y + clamped.height).toBeCloseTo(1, 6);
  });

  it("converts to the pixels of whatever source it is given", () => {
    const rect = { x: 0.25, y: 0.5, width: 0.5, height: 0.25 };

    // The same stored rect against two resolutions of the same photograph —
    // which is what storing it normalised is for.
    expect(normalizedRectToPixels(rect, { width: 2048, height: 1536 })).toEqual({
      x: 512,
      y: 768,
      width: 1024,
      height: 384,
    });

    expect(normalizedRectToPixels(rect, { width: 1024, height: 768 })).toEqual({
      x: 256,
      y: 384,
      width: 512,
      height: 192,
    });
  });
});
