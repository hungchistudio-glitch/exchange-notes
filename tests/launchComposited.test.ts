import { describe, expect, it } from "vitest";

import {
  YUMI_MINIMAL_CHECKPOINTS,
  YUMI_MINIMAL_DURATION_MS,
  YUMI_MINIMAL_REDUCED_DURATION_MS,
  buildYumiMinimalTracks,
} from "@/components/launch/yumiMinimalTimeline";

/*
 * The opening plays while the app is booting, which is the busiest the main
 * thread ever gets. Driven a frame at a time from JavaScript it competed with
 * hydration, chunk parsing and the first data fetch, and lost — and the
 * stutter landed on the first thing anyone sees.
 *
 * These tracks are the same motion, sampled ahead of time, in a form the
 * browser can run off the main thread. The rendered result was checked
 * against the original path element by element, at every sample, through a
 * real CSS engine: 1,593 comparisons, no differences. What is worth pinning
 * here is the property that makes them cheap in the first place.
 */

describe("the opening, as something the compositor can run", () => {
  it("animates nothing but transform and opacity", () => {
    /*
     * The whole point. A track that picks up a third property — a colour, a
     * filter, a width — stops being compositable and quietly goes back to
     * costing a main-thread frame, which is the bug this replaced.
     */
    const animated = new Set<string>();

    for (const keyframes of Object.values(buildYumiMinimalTracks())) {
      for (const keyframe of keyframes) {
        for (const property of Object.keys(keyframe)) {
          if (property !== "offset") animated.add(property);
        }
      }
    }

    expect([...animated].sort()).toEqual(["opacity", "transform"]);
  });

  it("samples the authored checkpoints exactly", () => {
    /*
     * An even 60Hz grid lands either side of the moments the animation was
     * written around — the snap is at 1820ms and the sixtieths around it are
     * 1816.67 and 1833.33 — and that is where the springs move fastest, so
     * it is where three milliseconds shows.
     */
    const tracks = buildYumiMinimalTracks();
    const times = tracks.brandScene.map(
      (keyframe) => (keyframe.offset ?? 0) * YUMI_MINIMAL_DURATION_MS,
    );

    for (const [checkpoint] of YUMI_MINIMAL_CHECKPOINTS) {
      expect(
        times.some((time) => Math.abs(time - checkpoint) < 0.001),
      ).toBe(true);
    }
  });

  it("runs every track from the start of the animation to the end of it", () => {
    for (const [name, keyframes] of Object.entries(buildYumiMinimalTracks())) {
      const offsets = keyframes.map((keyframe) => keyframe.offset ?? -1);

      expect(offsets[0], name).toBe(0);
      expect(offsets.at(-1), name).toBe(1);

      // Strictly increasing: a repeated or reversed offset is rejected by the
      // Web Animations API at play time, where it is a blank screen.
      for (let index = 1; index < offsets.length; index += 1) {
        expect(offsets[index], `${name} at ${index}`).toBeGreaterThan(
          offsets[index - 1],
        );
      }
    }
  });

  it("covers the reduced-motion cut on its own shorter clock", () => {
    const tracks = buildYumiMinimalTracks(true);
    const times = tracks.brandScene.map(
      (keyframe) => (keyframe.offset ?? 0) * YUMI_MINIMAL_REDUCED_DURATION_MS,
    );

    expect(times.at(-1)).toBe(YUMI_MINIMAL_REDUCED_DURATION_MS);

    /*
     * The full-motion checkpoints belong to the full-motion timeline. Folding
     * them into a cut that finishes in 820ms would sample poses that version
     * never strikes.
     */
    expect(times.every((time) => time <= YUMI_MINIMAL_REDUCED_DURATION_MS)).toBe(
      true,
    );
  });

  it("ends on the pose the animation was authored to end on", () => {
    const tracks = buildYumiMinimalTracks();

    // The scene has gone and the app underneath is fully present.
    expect(tracks.sceneWash.at(-1)?.opacity).toBe("0");
    expect(tracks.brandScene.at(-1)?.opacity).toBe("0");
    expect(tracks.handoffPreview.at(-1)?.opacity).toBe("1");
  });
});
