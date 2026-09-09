import { describe, expect, it } from "vitest";

import { MIN_TARGET_SIZE, TARGET_PADDING } from "@/lib/media/config";
import { rectArea, type NormalizedRect } from "@/lib/media/geometry";
import { cropRectFor } from "@/lib/media/pipeline";

/* =========================================================
   The rectangle a card is actually cut at

   buildCapture itself needs a canvas and cannot run here, but the decision
   it makes first can — and it is the one worth checking. Ordering the two
   steps the other way round (pad, then enforce a minimum) reads identically
   and quietly throws the safety margin away on exactly the small targets
   that need it most.
   ========================================================= */

function corners(): NormalizedRect[] {
  const size = 0.12;

  return [
    { x: 0, y: 0, width: size, height: size },
    { x: 1 - size, y: 0, width: size, height: size },
    { x: 0, y: 1 - size, width: size, height: size },
    { x: 1 - size, y: 1 - size, width: size, height: size },
  ];
}

describe("the crop a target becomes", () => {
  it("grows a target by the safety margin", () => {
    const target: NormalizedRect = {
      x: 0.4,
      y: 0.4,
      width: 0.2,
      height: 0.2,
    };

    const crop = cropRectFor(target);

    expect(crop.width).toBeCloseTo(0.2 * (1 + TARGET_PADDING), 6);
    expect(crop.height).toBeCloseTo(0.2 * (1 + TARGET_PADDING), 6);
  });

  it("keeps the target inside the crop it produced", () => {
    /*
     * The property that actually matters: whatever else padding and the
     * minimum do between them, the thing the reader pointed at must still
     * be in the picture.
     */
    for (const target of [
      { x: 0.4, y: 0.4, width: 0.2, height: 0.2 },
      { x: 0, y: 0, width: 0.05, height: 0.05 },
      { x: 0.95, y: 0.95, width: 0.05, height: 0.05 },
      { x: 0.1, y: 0.45, width: 0.8, height: 0.03 },
      { x: 0, y: 0, width: 1, height: 1 },
      ...corners(),
    ]) {
      const crop = cropRectFor(target);

      expect(crop.x).toBeLessThanOrEqual(target.x + 1e-9);
      expect(crop.y).toBeLessThanOrEqual(target.y + 1e-9);
      expect(crop.x + crop.width).toBeGreaterThanOrEqual(
        target.x + target.width - 1e-9,
      );
      expect(crop.y + crop.height).toBeGreaterThanOrEqual(
        target.y + target.height - 1e-9,
      );
    }
  });

  it("still pads a target smaller than the minimum", () => {
    /*
     * The ordering test. A one-percent mis-tap comes up to the minimum
     * first and is padded after, so it ends up larger than the minimum —
     * pad-then-minimum would produce exactly the minimum and no margin.
     */
    const crop = cropRectFor({
      x: 0.5,
      y: 0.5,
      width: 0.01,
      height: 0.01,
    });

    expect(crop.width).toBeGreaterThan(MIN_TARGET_SIZE);
    expect(crop.width).toBeCloseTo(MIN_TARGET_SIZE * (1 + TARGET_PADDING), 6);
  });

  it("never leaves the source at any of the four corners", () => {
    for (const target of corners()) {
      const crop = cropRectFor(target);

      expect(crop.x).toBeGreaterThanOrEqual(0);
      expect(crop.y).toBeGreaterThanOrEqual(0);
      expect(crop.x + crop.width).toBeLessThanOrEqual(1 + 1e-9);
      expect(crop.y + crop.height).toBeLessThanOrEqual(1 + 1e-9);
      expect(rectArea(crop)).toBeGreaterThan(0);
    }
  });

  it("cannot be grown past the whole image", () => {
    const crop = cropRectFor({ x: 0, y: 0, width: 1, height: 1 });

    expect(crop).toEqual({ x: 0, y: 0, width: 1, height: 1 });
  });

  it("produces something croppable from a degenerate target", () => {
    // A zero-area rect from a pathological detector result must not become
    // a zero-pixel canvas, which throws.
    const crop = cropRectFor({ x: 0.5, y: 0.5, width: 0, height: 0 });

    expect(crop.width).toBeGreaterThan(0);
    expect(crop.height).toBeGreaterThan(0);
  });
});
