import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  IGNITION_ARC_DEG,
  IGNITION_START_MS,
  IGNITION_SWEEP_MS,
  ignitionDelay,
  placeCapabilities,
} from "@/lib/pet/commandHalo";
import {
  FLIGHT_LIFT_MS,
  announceRouteArrival,
  flyIntoFeature,
  resetFeatureFlightForTests,
} from "@/lib/motion/featureFlight";

/*
 * Yumi's halo on the vocabulary page (Chi, 2026-11-12): it lights as two
 * sparks run down the ring (軌道點火), and the key tapped flies to its
 * feature's page and lands on the title there (Yumi 領航).
 */
describe("the halo's ignition", () => {
  it("lights each station when its spark gets there", () => {
    expect(ignitionDelay(0)).toBe(IGNITION_START_MS);
    expect(ignitionDelay(IGNITION_ARC_DEG)).toBe(IGNITION_START_MS + IGNITION_SWEEP_MS);
    // Mirror stations light together: one spark down each flank.
    expect(ignitionDelay(-54)).toBe(ignitionDelay(54));
  });

  it("lights the vocabulary halo top first, within the sweep", () => {
    const placed = placeCapabilities("vocabulary");
    for (const capability of placed) {
      expect(capability.ignition).toBe(ignitionDelay(capability.angle));
      expect(capability.ignition).toBeLessThanOrEqual(IGNITION_START_MS + IGNITION_SWEEP_MS);
    }
    const order = [...placed].sort((a, b) => a.ignition - b.ignition).map((c) => c.key);
    expect(order.slice(0, 2).sort()).toEqual(["add", "review"]);
  });
});

describe("Yumi leading the way into a feature", () => {
  type Played = { keyframes: Keyframe[]; options: KeyframeAnimationOptions; element: Element; finish: () => void };
  let played: Played[];
  let source: HTMLButtonElement;
  const flush = async () => {
    for (let i = 0; i < 4; i++) await Promise.resolve();
  };
  const flights = () => played.filter((p) => p.element.hasAttribute("data-feature-flyer") && p.options.duration !== FLIGHT_LIFT_MS && p.options.iterations !== Infinity);

  beforeEach(() => {
    resetFeatureFlightForTests();
    played = [];
    window.matchMedia = ((query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
    HTMLElement.prototype.animate = function (this: HTMLElement, keyframes: Keyframe[], options: KeyframeAnimationOptions) {
      const animation = { onfinish: null as null | (() => void), finished: Promise.resolve(), cancel() {} };
      played.push({ keyframes, options, element: this, finish: () => animation.onfinish?.() });
      return animation as unknown as Animation;
    } as typeof HTMLElement.prototype.animate;
    // jsdom lays nothing out; a mark on the page has a box to land on.
    Element.prototype.getClientRects = function () {
      return [{}] as unknown as DOMRectList;
    };
    source = document.createElement("button");
    source.innerHTML = "<svg></svg>";
    document.body.appendChild(source);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
    resetFeatureFlightForTests();
  });

  it("veils the page, changes it underneath, and lands on the new title", async () => {
    const go = vi.fn();
    flyIntoFeature({ source, feature: "review", go });
    expect(document.querySelector("[data-feature-veil]")).not.toBeNull();
    expect(document.querySelector<HTMLElement>("[data-feature-flyer]")?.style.pointerEvents).toBe("none");
    expect(document.documentElement.dataset.featureFlight).toBe("review");
    expect(go).not.toHaveBeenCalled();

    vi.advanceTimersByTime(FLIGHT_LIFT_MS);
    expect(go).toHaveBeenCalledTimes(1);

    const title = document.createElement("span");
    title.setAttribute("data-feature-mark", "review");
    document.body.appendChild(title);
    await flush();
    expect(title.style.visibility).toBe("hidden");

    announceRouteArrival();
    await flush();
    const flight = flights().at(-1)!;
    expect(flight.keyframes).toHaveLength(3);

    flight.finish();
    expect(title.style.visibility).toBe("");
    played.at(-1)!.finish();
    expect(document.querySelector("[data-feature-flyer]")).toBeNull();
    expect(document.documentElement.dataset.featureFlight).toBeUndefined();
  });

  it("flies into Scan's camera, which has no title to land on", async () => {
    flyIntoFeature({ source, feature: "camera", go: vi.fn() });
    vi.advanceTimersByTime(FLIGHT_LIFT_MS);
    announceRouteArrival();
    vi.advanceTimersByTime(150);
    const flight = flights().at(-1)!;
    expect(flight.keyframes.at(-1)).toMatchObject({ opacity: 0 });
    flight.finish();
    expect(document.querySelector("[data-feature-flyer]")).toBeNull();
    expect(document.querySelector("[data-feature-veil]")).toBeNull();
  });

  it("lands on the search field of Create's sheet, with no veil", async () => {
    const go = vi.fn(() => {
      const glass = document.createElement("span");
      glass.setAttribute("data-feature-mark", "add");
      document.body.appendChild(glass);
    });
    flyIntoFeature({ source, feature: "add", go, into: "sheet" });
    expect(document.querySelector("[data-feature-veil]")).toBeNull();
    vi.advanceTimersByTime(FLIGHT_LIFT_MS);
    expect(go).toHaveBeenCalledTimes(1);
    await flush();
    expect(flights().at(-1)?.keyframes).toHaveLength(3);
  });

  it("navigates at once, with nothing in the air, when motion is reduced", () => {
    window.matchMedia = ((query: string) => ({ matches: query.includes("reduce"), media: query, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
    const go = vi.fn();
    flyIntoFeature({ source, feature: "speak", go });
    expect(go).toHaveBeenCalledTimes(1);
    expect(document.querySelector("[data-feature-flyer]")).toBeNull();
    expect(document.documentElement.dataset.featureFlight).toBeUndefined();
  });
});
