import { describe, expect, it } from "vitest";

import {
  CHECKPOINTS,
  LAUNCH_DURATION_MS,
  computeFrame,
} from "@/components/launch/timeline";

describe("launch timeline", () => {
  it("clamps frames before and after the animation", () => {
    expect(computeFrame(-1_000)).toEqual(computeFrame(0));
    expect(computeFrame(LAUNCH_DURATION_MS + 1_000)).toEqual(
      computeFrame(LAUNCH_DURATION_MS),
    );
  });

  it("keeps a stable, finite CSS property contract across the timeline", () => {
    const properties = Object.keys(computeFrame(0));

    for (let time = 0; time <= LAUNCH_DURATION_MS; time += 10) {
      const frame = computeFrame(time);

      expect(Object.keys(frame)).toEqual(properties);

      for (const value of Object.values(frame)) {
        expect(value).not.toMatch(/NaN|Infinity/);
      }
    }
  });

  it("keeps review checkpoints ordered and pinned to both endpoints", () => {
    const times = CHECKPOINTS.map(([time]) => time);

    expect(times[0]).toBe(0);
    expect(times.at(-1)).toBe(LAUNCH_DURATION_MS);
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });
});
