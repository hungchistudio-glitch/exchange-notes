import { describe, expect, it } from "vitest";

import {
  YUMI_PRISM_CHECKPOINTS,
  YUMI_PRISM_DURATION_MS,
  YUMI_PRISM_HOLD_MS,
  YUMI_PRISM_REDUCED_DURATION_MS,
  buildYumiPrismTracks,
  computeYumiPrismFrame,
} from "@/components/launch/yumiPrismTimeline";

/** The beat the handoff begins on, named here so the hold can be measured. */
const EXIT_AT_MS = 2320;

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

  /*
   * The hold is the design, not a gap.
   *
   * It is the 280ms that make the motion before it read as deliberate, and it
   * is the easiest thing in the file to lose: any beat whose window is widened
   * past 2040 puts movement back inside it, and nothing about the film looks
   * broken when that happens — it just stops being composed. The orbit's fade
   * was written across it once, which is why this test exists.
   */
  it("holds every track perfectly still between the last beat and the handoff", () => {
    const still = computeYumiPrismFrame(YUMI_PRISM_HOLD_MS);
    for (const time of [2040, 2100, 2200, 2300, EXIT_AT_MS]) {
      expect(computeYumiPrismFrame(time), `${time}ms`).toEqual(still);
    }
    // And the frame being held is a finished one, not a mid-beat accident.
    expect(still["--dawn-opacity"]).toBe("0");
    expect(still["--actor-opacity"]).toBe("1");
    expect(still["--wordmark-opacity"]).toBe("1");
    expect(still["--caption-opacity"]).toBe("1");
    expect(still["--rule-scale"]).toBe("1");
    expect(still["--blink"]).toBe("0");
    expect(still["--scene-opacity"]).toBe("1");
  });

  /*
   * The manifest's white is handed to the opening and then dissolved, which is
   * the whole reason Cosmic Mode can have an obsidian ground without a flash
   * in front of it. Both halves matter: full at the first frame, and gone.
   */
  it("lifts the OS splash colour off the frame, once, and early", () => {
    expect(computeYumiPrismFrame(0)["--dawn-opacity"]).toBe("1");
    expect(computeYumiPrismFrame(0, true)["--dawn-opacity"]).toBe("1");
    expect(Number(computeYumiPrismFrame(130)["--dawn-opacity"])).toBeLessThan(1);
    for (const time of [260, 420, 900, YUMI_PRISM_HOLD_MS, YUMI_PRISM_DURATION_MS]) {
      expect(computeYumiPrismFrame(time)["--dawn-opacity"], `${time}ms`).toBe("0");
    }
    const dawn = buildYumiPrismTracks().dawn.map(frame => Number(frame.opacity));
    for (let index = 1; index < dawn.length; index += 1) {
      expect(dawn[index]).toBeLessThanOrEqual(dawn[index - 1]);
    }
  });

  /*
   * The curtain covers the whole frame, so its length is also how long the
   * lens spends arriving behind gauze — and the pearl ground, whose colour it
   * already is, gets nothing back for that. Pinning it against the arrival
   * rather than against a number is what keeps the two from drifting apart:
   * lengthen the curtain and this fails before anyone has to notice a softer
   * opening in a screenshot.
   */
  it("is out of the way before the lens is half arrived", () => {
    const halfArrived = Array.from({ length: YUMI_PRISM_DURATION_MS }, (_, t) => t)
      .find(t => Number(computeYumiPrismFrame(t)["--actor-opacity"]) >= 0.5)!;

    expect(halfArrived).toBeLessThan(400);
    expect(Number(computeYumiPrismFrame(halfArrived)["--dawn-opacity"])).toBeLessThan(0.1);
  });

  /*
   * Every keyframe here is built on the main thread at mount, on the one beat
   * the app is also hydrating. At 60Hz that was 195 per track across fifteen
   * tracks — 2,925 of them, 18.5ms in animate() alone on a development Mac and
   * several times that on a phone. The browser interpolates between keyframes,
   * so this number buys accuracy nobody can see past a point.
   */
  it("keeps the keyframe budget small enough to build at mount", () => {
    for (const reduced of [false, true]) {
      const tracks = buildYumiPrismTracks(reduced);
      const longest = Math.max(...Object.values(tracks).map(frames => frames.length));
      expect(longest, `reduced=${reduced}`).toBeLessThanOrEqual(120);
    }
  });

  /*
   * The lens settles rather than merely stopping: it passes its resting size,
   * comes back, and ends exactly where it started from. A settle that does not
   * return is a layout bug wearing an easing curve.
   */
  it("overshoots the lens into place and returns it to rest", () => {
    const scales = [];
    for (let t = 160; t <= 1050; t += 10) {
      scales.push(Number(computeYumiPrismFrame(t)["--actor-scale"]));
    }
    expect(Math.max(...scales)).toBeGreaterThan(1);
    expect(Math.max(...scales)).toBeLessThan(1.02);
    expect(Number(computeYumiPrismFrame(1050)["--actor-scale"])).toBe(1);
    expect(computeYumiPrismFrame(1050)["--actor-y"]).toBe("0px");
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
    expect(tracks.captionRule.every(frame => frame.transform === "scaleX(1)")).toBe(true);
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

  /*
   * Both films answer for exactly the same set of variables. The renderer
   * writes whatever it is handed onto the root element and never clears it,
   * so a key present in one branch and missing from the other would leave the
   * full-motion value applied under reduced motion for the life of the page.
   */
  it("describes the same frame in both branches", () => {
    expect(Object.keys(computeYumiPrismFrame(0, true)).sort())
      .toEqual(Object.keys(computeYumiPrismFrame(0)).sort());
  });
});
