import { describe, expect, it } from "vitest";

import {
  YUMI_PRISM_CHECKPOINTS,
  YUMI_PRISM_DURATION_MS,
  YUMI_PRISM_REDUCED_DURATION_MS,
  buildYumiPrismTracks,
  computeYumiPrismFrame,
} from "@/components/launch/yumiPrismTimeline";

describe("Prism animation tracks", () => {
  it.each([false, true])("uses compositable properties on one valid clock (reduced=%s)", reduced => {
    const tracks = buildYumiPrismTracks(reduced);
    const allowed = new Set(["offset", "opacity", "transform"]);
    for (const [name, frames] of Object.entries(tracks)) {
      expect(frames[0].offset, name).toBe(0);
      expect(frames.at(-1)?.offset, name).toBe(1);
      for (let index = 0; index < frames.length; index += 1) {
        const frame = frames[index];
        expect(Object.keys(frame).every(property => allowed.has(property)), name).toBe(true);
        if (index > 0) expect(frame.offset!, name).toBeGreaterThan(frames[index - 1].offset!);
        if (frame.opacity !== undefined) {
          expect(Number(frame.opacity), name).toBeGreaterThanOrEqual(0);
          expect(Number(frame.opacity), name).toBeLessThanOrEqual(1);
        }
        expect(JSON.stringify(frame), name).not.toMatch(/NaN|Infinity/);
      }
    }
  });

  it("lands on authored full-motion checkpoints and hands over completely", () => {
    const tracks = buildYumiPrismTracks();
    const times = tracks.brandScene.map(frame => frame.offset! * YUMI_PRISM_DURATION_MS);
    for (const [checkpoint] of YUMI_PRISM_CHECKPOINTS) {
      expect(times.some(time => Math.abs(time - checkpoint) < 0.001)).toBe(true);
    }
    expect(tracks.sceneWash.at(-1)?.opacity).toBe("0");
    expect(tracks.brandScene.at(-1)?.opacity).toBe("0");
    expect(tracks.handoffPreview.at(-1)?.opacity).toBe("1");
  });

  it("holds all geometry still and removes traveling light in reduced motion", () => {
    const tracks = buildYumiPrismTracks(true);
    for (const [name, frames] of Object.entries(tracks)) {
      const transforms = frames.filter(frame => frame.transform !== undefined).map(frame => frame.transform);
      expect(new Set(transforms).size, name).toBeLessThanOrEqual(1);
    }
    for (const name of ["orbit", "sweep", "closedEye"]) {
      expect(tracks[name].every(frame => Number(frame.opacity) === 0), name).toBe(true);
    }
    expect(tracks.pupil.every(frame => frame.transform === "scaleY(1)")).toBe(true);
    expect(tracks.sceneWash.at(-1)?.opacity).toBe("0");
    expect(tracks.handoffPreview.at(-1)?.opacity).toBe("1");
    expect(computeYumiPrismFrame(YUMI_PRISM_REDUCED_DURATION_MS, true)["--scene-opacity"]).toBe("0");
  });

  it("renders a finished handoff for overshooting clocks and a valid start for invalid input", () => {
    for (const reduced of [false, true]) {
      const duration = reduced ? YUMI_PRISM_REDUCED_DURATION_MS : YUMI_PRISM_DURATION_MS;
      expect(computeYumiPrismFrame(duration + 60000, reduced)).toEqual(computeYumiPrismFrame(duration, reduced));
      for (const time of [-100, Number.NaN, Number.POSITIVE_INFINITY]) {
        expect(computeYumiPrismFrame(time, reduced)).toEqual(computeYumiPrismFrame(0, reduced));
      }
    }
  });
});
