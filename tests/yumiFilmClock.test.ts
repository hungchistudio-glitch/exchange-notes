import { afterEach, describe, expect, it, vi } from "vitest";
import { createLayerClock } from "@/components/landing/story/filmClock";
import { compileEarthMotion } from "@/components/landing/story/earthMotion";
import { ARRIVE_AT_MS, STORY_DURATION_MS } from "@/components/landing/story/storyTimeline";

const originalTimeline = Object.getOwnPropertyDescriptor(document, "timeline");
afterEach(() => {
  if (originalTimeline) Object.defineProperty(document, "timeline", originalTimeline);
  else Reflect.deleteProperty(document, "timeline");
  vi.restoreAllMocks();
});

function projector() {
  const timeline = { currentTime: 1000 };
  Object.defineProperty(document, "timeline", { configurable: true, value: timeline });
  const root = document.createElement("div");
  root.innerHTML = '<div data-track="camera"></div><div data-track="sky"></div><div data-track="planet"></div>';
  const layers = [...root.children].map(element => {
    const animation = { currentTime: 0 as number | null, startTime: null as number | null, play: vi.fn(), pause: vi.fn(), cancel: vi.fn(), effect: { setKeyframes: vi.fn() } };
    Object.defineProperty(element, "animate", { value: () => animation });
    return animation;
  });
  return { clock: createLayerClock(root, root)!, layers, timeline };
}

describe("one clock for the film and Yumi", () => {
  it("anchors every layer to the same start, independent of pending play tasks", () => {
    const { clock, layers, timeline } = projector();
    clock.play();
    expect(layers.map(a => a.startTime)).toEqual([1000, 1000, 1000]);
    timeline.currentTime = 1600;
    // Simulate a frozen lead layer: it cannot hold Yumi's narrative clock back.
    expect(clock.time()).toBe(600);
    clock.pause();
    expect(layers.map(a => a.currentTime)).toEqual([600, 600, 600]);
    timeline.currentTime = 5000;
    expect(clock.time()).toBe(600);
    clock.play();
    expect(layers.map(a => a.startTime)).toEqual([4400, 4400, 4400]);
  });

  it("repairs a cancelled or lagging layer without restarting healthy layers", () => {
    const { clock, layers, timeline } = projector();
    clock.play();
    timeline.currentTime = 2000;
    layers[0].currentTime = 1000;
    layers[1].currentTime = null;
    layers[2].currentTime = 0;
    clock.sync!();
    expect(layers[0].play).toHaveBeenCalledTimes(1);
    expect(layers[1].play).toHaveBeenCalledTimes(2);
    expect(layers[2].play).toHaveBeenCalledTimes(2);
    expect(layers.map(a => a.startTime)).toEqual([1000, 1000, 1000]);
    clock.sync!();
    expect(layers[1].play).toHaveBeenCalledTimes(2);
  });

  it("seeks, finishes and replays with every layer at the same position", () => {
    const { clock, layers, timeline } = projector();
    clock.play();
    clock.seek(32000);
    expect(layers.map(a => a.startTime)).toEqual([-31000, -31000, -31000]);
    timeline.currentTime = 3000;
    expect(clock.time()).toBe(STORY_DURATION_MS);
    clock.pause();
    expect(layers.map(a => a.currentTime)).toEqual([33000, 33000, 33000]);
    clock.play();
    expect(clock.time()).toBe(0);
    expect(layers.map(a => a.startTime)).toEqual([3000, 3000, 3000]);
    clock.resize!(390, 640);
    expect(clock.time()).toBe(0);
    expect(layers[2].effect.setKeyframes).toHaveBeenCalledOnce();
    clock.dispose();
    layers.forEach(a => expect(a.cancel).toHaveBeenCalledOnce());
  });
});

describe("Earth sampled from the film's keyframes, without DOM style reads", () => {
  it.each([[358, 640], [1180, 562]])("keeps the horizon and its exit at %s × %s", (width, height) => {
    const sample = compileEarthMotion(width, height);
    expect(sample(0).planet.opacity).toBe(0);
    expect(sample(ARRIVE_AT_MS).planet).toEqual({ x: 0, y: 0, scale: 1, opacity: 1 });
    expect(sample(STORY_DURATION_MS).orbit).toEqual({ x: 0, y: -0.2 * height, scale: 3.2, opacity: 0 });
    expect(sample(STORY_DURATION_MS).flare).toBe(0);
    const start = sample(13700).planet;
    const next = sample(13701).planet;
    expect(Math.abs(start.x - next.x)).toBeLessThan(1);
    expect(Math.abs(start.scale - next.scale)).toBeLessThan(0.01);
  });
});
