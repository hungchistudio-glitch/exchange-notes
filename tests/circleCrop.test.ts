import { describe, expect, it } from "vitest";

import {
  clampOffset,
  cropRect,
  minimumCoverScale,
  zoomAround,
} from "@/lib/media/circleCrop";

/* =========================================================
   What ends up inside the circle

   The arithmetic behind the avatar cropper, which is the part that can be
   wrong without looking wrong: a crop rectangle off by a factor still
   produces a perfectly plausible square, just not the one the reader framed.
   ========================================================= */

/** A landscape photo from a phone, and a portrait one. */
const LANDSCAPE = { width: 4032, height: 3024 };
const PORTRAIT = { width: 3024, height: 4032 };
const VIEWPORT = 300;

describe("covering the circle", () => {
  it("scales by the short edge, so no corner shows through", () => {
    // Landscape: height is the tight axis.
    expect(minimumCoverScale(LANDSCAPE, VIEWPORT)).toBeCloseTo(300 / 3024, 6);
    // Portrait: width is.
    expect(minimumCoverScale(PORTRAIT, VIEWPORT)).toBeCloseTo(300 / 3024, 6);
  });

  it("leaves a square photo exactly covering at scale one", () => {
    expect(minimumCoverScale({ width: 300, height: 300 }, 300)).toBe(1);
  });

  it("says something rather than dividing by zero before anything is measured", () => {
    expect(minimumCoverScale({ width: 0, height: 0 }, 0)).toBe(1);
    expect(minimumCoverScale(LANDSCAPE, 0)).toBe(1);
  });
});

describe("how far the photo may be dragged", () => {
  const scale = minimumCoverScale(LANDSCAPE, VIEWPORT);

  it("allows movement along the axis with slack", () => {
    // 4032 * (300/3024) = 400 wide in a 300 viewport, so 50px each way.
    const far = clampOffset({ x: 999, y: 0 }, LANDSCAPE, scale, VIEWPORT);
    expect(far.x).toBeCloseTo(50, 4);

    const back = clampOffset({ x: -999, y: 0 }, LANDSCAPE, scale, VIEWPORT);
    expect(back.x).toBeCloseTo(-50, 4);
  });

  it("allows none along the axis that is exactly covering", () => {
    // The photo is 300 tall in a 300 viewport: moving it at all would open a
    // gap, so there is nowhere to go.
    const moved = clampOffset({ x: 0, y: 40 }, LANDSCAPE, scale, VIEWPORT);
    expect(moved.y).toBe(0);
  });

  it("clamps each axis on its own", () => {
    const moved = clampOffset({ x: 999, y: 999 }, LANDSCAPE, scale, VIEWPORT);
    expect(moved.x).toBeCloseTo(50, 4);
    expect(moved.y).toBe(0);
  });

  it("opens room on both axes once zoomed in", () => {
    const moved = clampOffset({ x: 999, y: 999 }, LANDSCAPE, scale * 2, VIEWPORT);
    expect(moved.x).toBeCloseTo(250, 4);
    expect(moved.y).toBeCloseTo(150, 4);
  });
});

describe("zooming", () => {
  const min = minimumCoverScale(PORTRAIT, VIEWPORT);
  const bounds = { min, max: min * 4 };

  it("never goes below covering the circle", () => {
    const out = zoomAround(
      min / 10,
      { x: 0, y: 0 },
      { scale: min, offset: { x: 0, y: 0 } },
      bounds,
      PORTRAIT,
      VIEWPORT,
    );

    expect(out.scale).toBe(min);
  });

  it("stops at the ceiling", () => {
    const out = zoomAround(
      min * 99,
      { x: 0, y: 0 },
      { scale: min, offset: { x: 0, y: 0 } },
      bounds,
      PORTRAIT,
      VIEWPORT,
    );

    expect(out.scale).toBe(bounds.max);
  });

  it("keeps the point under the fingers where it was", () => {
    // The whole reason zooming takes a focus: the pixel being pinched must
    // not slide out from under the pinch.
    const from = { scale: min, offset: { x: 0, y: 0 } };
    const focus = { x: 60, y: -40 };

    const out = zoomAround(min * 2, focus, from, bounds, PORTRAIT, VIEWPORT);

    // The image point under `focus` before and after the zoom.
    const before = {
      x: (focus.x - from.offset.x) / from.scale,
      y: (focus.y - from.offset.y) / from.scale,
    };
    const after = {
      x: (focus.x - out.offset.x) / out.scale,
      y: (focus.y - out.offset.y) / out.scale,
    };

    expect(after.x).toBeCloseTo(before.x, 4);
    expect(after.y).toBeCloseTo(before.y, 4);
  });

  it("pulls the photo back if the zoom would open a gap", () => {
    // Dragged to its limit, then zoomed back out: the offset that was legal
    // at the higher scale is not legal at the lower one.
    const wide = minimumCoverScale(LANDSCAPE, VIEWPORT);
    const dragged = clampOffset(
      { x: 9999, y: 9999 },
      LANDSCAPE,
      wide * 3,
      VIEWPORT,
    );

    const out = zoomAround(
      wide,
      { x: 0, y: 0 },
      { scale: wide * 3, offset: dragged },
      { min: wide, max: wide * 4 },
      LANDSCAPE,
      VIEWPORT,
    );

    expect(Math.abs(out.offset.x)).toBeLessThanOrEqual(50.0001);
    expect(out.offset.y).toBe(0);
  });
});

describe("the square that is actually exported", () => {
  it("is the whole short edge when nothing has been touched", () => {
    const scale = minimumCoverScale(LANDSCAPE, VIEWPORT);
    const rect = cropRect(LANDSCAPE, VIEWPORT, scale, { x: 0, y: 0 });

    // A centred square the height of the photo.
    expect(rect.size).toBeCloseTo(3024, 4);
    expect(rect.y).toBeCloseTo(0, 4);
    expect(rect.x).toBeCloseTo((4032 - 3024) / 2, 4);
  });

  it("moves the opposite way to the photo", () => {
    // Dragging the photo right shows what was to its left.
    const scale = minimumCoverScale(LANDSCAPE, VIEWPORT);
    const centred = cropRect(LANDSCAPE, VIEWPORT, scale, { x: 0, y: 0 });
    const dragged = cropRect(LANDSCAPE, VIEWPORT, scale, { x: 50, y: 0 });

    expect(dragged.x).toBeLessThan(centred.x);
    expect(dragged.x).toBeCloseTo(centred.x - 50 / scale, 4);
  });

  it("halves the sampled square when the photo is zoomed to twice", () => {
    const scale = minimumCoverScale(PORTRAIT, VIEWPORT);
    const one = cropRect(PORTRAIT, VIEWPORT, scale, { x: 0, y: 0 });
    const two = cropRect(PORTRAIT, VIEWPORT, scale * 2, { x: 0, y: 0 });

    expect(two.size).toBeCloseTo(one.size / 2, 4);
  });

  it("never samples outside the photo, however it is dragged", () => {
    // The guarantee the clamp exists for: an export can never contain a
    // blank edge, at any zoom, in any direction.
    const min = minimumCoverScale(PORTRAIT, VIEWPORT);

    for (const zoom of [1, 1.37, 2, 4]) {
      const scale = min * zoom;

      for (const wanted of [
        { x: 9999, y: 9999 },
        { x: -9999, y: -9999 },
        { x: 9999, y: -9999 },
        { x: -9999, y: 9999 },
      ]) {
        const offset = clampOffset(wanted, PORTRAIT, scale, VIEWPORT);
        const rect = cropRect(PORTRAIT, VIEWPORT, scale, offset);

        expect(rect.x).toBeGreaterThanOrEqual(-0.0001);
        expect(rect.y).toBeGreaterThanOrEqual(-0.0001);
        expect(rect.x + rect.size).toBeLessThanOrEqual(PORTRAIT.width + 0.0001);
        expect(rect.y + rect.size).toBeLessThanOrEqual(PORTRAIT.height + 0.0001);
      }
    }
  });
});
