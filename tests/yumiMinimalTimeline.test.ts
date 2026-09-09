import { describe, expect, it } from "vitest";

import {
  YUMI_MINIMAL_CHECKPOINTS,
  YUMI_MINIMAL_DURATION_MS,
  YUMI_MINIMAL_REDUCED_DURATION_MS,
  YUMI_MINIMAL_SNAP_MS,
  computeYumiMinimalFrame,
} from "@/components/launch/yumiMinimalTimeline";

const numeric = (frame: Record<string, string>, property: string) =>
  Number.parseFloat(frame[property]);

describe("Yumi minimal opening timeline", () => {
  it("holds a genuinely empty white first beat", () => {
    const opening = computeYumiMinimalFrame(0);
    const beforeEntry = computeYumiMinimalFrame(299);

    expect(opening["--actor-opacity"]).toBe("0");
    expect(opening["--wordmark-opacity"]).toBe("0");
    expect(beforeEntry["--actor-opacity"]).toBe("0");
    expect(beforeEntry["--wordmark-opacity"]).toBe("0");
  });

  it("moves the pupil left and then right without moving the eye housing", () => {
    const lookLeft = computeYumiMinimalFrame(865);
    const lookRight = computeYumiMinimalFrame(1000);

    expect(numeric(lookLeft, "--pupil-x")).toBeLessThan(0);
    expect(numeric(lookRight, "--pupil-x")).toBeGreaterThan(0);
    expect(lookLeft["--eye-x"]).toBe("0%");
    expect(lookRight["--eye-x"]).toBe("0%");
  });

  it("stretches only the connected core and eye to about twice its width", () => {
    const maximum = computeYumiMinimalFrame(1650);

    expect(numeric(maximum, "--eye-x")).toBeGreaterThan(80);
    expect(numeric(maximum, "--bridge-scale")).toBeGreaterThan(3.4);
    expect(numeric(maximum, "--body-scale-x")).toBeLessThan(1.04);
  });

  it("ties brand reveal and recoil to the same signature beat", () => {
    const before = computeYumiMinimalFrame(1803);
    const snap = computeYumiMinimalFrame(YUMI_MINIMAL_SNAP_MS);

    expect(before["--wordmark-opacity"]).toBe("0");
    expect(numeric(snap, "--actor-shift-x")).toBeCloseTo(-8, 1);
    expect(numeric(snap, "--stretch")).toBeCloseTo(0, 1);
    expect(snap["--wordmark-opacity"]).toBe("1");
  });

  it("blinks once, then returns to a neutral eye", () => {
    expect(computeYumiMinimalFrame(2230)["--blink"]).toBe("1");
    expect(computeYumiMinimalFrame(2300)["--blink"]).toBe("0");
    expect(computeYumiMinimalFrame(2380)["--blink"]).toBe("0");
    expect(computeYumiMinimalFrame(2380)["--smile-opacity"]).toBeUndefined();
  });

  it("finishes with a shared-canvas handoff", () => {
    const finalFrame = computeYumiMinimalFrame(YUMI_MINIMAL_DURATION_MS);

    expect(finalFrame["--scene-opacity"]).toBe("0");
    expect(finalFrame["--handoff-opacity"]).toBe("1");
  });

  it("uses a separate sub-second cut with no stretch or recoil", () => {
    for (let time = 0; time <= YUMI_MINIMAL_REDUCED_DURATION_MS; time += 10) {
      const frame = computeYumiMinimalFrame(time, true);
      expect(frame["--stretch"]).toBe("0");
      expect(frame["--eye-x"]).toBe("0%");
      expect(frame["--actor-shift-x"]).toBe("0px");
    }

    expect(
      computeYumiMinimalFrame(YUMI_MINIMAL_REDUCED_DURATION_MS, true)[
        "--handoff-opacity"
      ],
    ).toBe("1");
  });

  it("keeps a stable finite CSS contract and ordered review checkpoints", () => {
    const properties = Object.keys(computeYumiMinimalFrame(0));

    for (let time = 0; time <= YUMI_MINIMAL_DURATION_MS; time += 10) {
      const frame = computeYumiMinimalFrame(time);
      expect(Object.keys(frame)).toEqual(properties);
      expect(Object.values(frame).join(" ")).not.toMatch(/NaN|Infinity/);
    }

    const checkpoints = YUMI_MINIMAL_CHECKPOINTS.map(([time]) => time);
    expect(checkpoints[0]).toBe(0);
    expect(checkpoints.at(-1)).toBe(YUMI_MINIMAL_DURATION_MS);
    expect(checkpoints).toEqual([...checkpoints].sort((a, b) => a - b));
  });
});
