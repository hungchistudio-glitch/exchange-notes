import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { homeMotionOn, setHomeMotion, shakeReader, watchDeviceMotion } from "@/lib/home/deviceMotion";
import { createYumiFeel } from "@/lib/home/yumiFeel";

/*
 * Chi, 2026-11-22: Yumi feels the phone too (a lean and a look toward the
 * low side, dizzy after a hard shake), and the reader can turn the home's
 * motion off for this device. jsdom has no motion sensors, so the events
 * are made here; no browser here asks for permission first.
 */

class FakeOrientation extends Event {
  beta: number;
  gamma: number;
  constructor(beta: number, gamma: number) {
    super("deviceorientation");
    this.beta = beta;
    this.gamma = gamma;
  }
}

class FakeMotion extends Event {
  acceleration: { x: number; y: number; z: number };
  interval = 16;
  constructor(x: number, y: number) {
    super("devicemotion");
    this.acceleration = { x, y, z: 0 };
  }
}

const tilt = (beta: number, gamma: number) => window.dispatchEvent(new FakeOrientation(beta, gamma));
const jolt = (x: number, y = 0) => window.dispatchEvent(new FakeMotion(x, y));

beforeEach(() => {
  (window as unknown as { DeviceOrientationEvent: unknown }).DeviceOrientationEvent = FakeOrientation;
  (window as unknown as { DeviceMotionEvent: unknown }).DeviceMotionEvent = FakeMotion;
  window.localStorage.removeItem("home-motion-v1");
});

afterEach(() => {
  window.localStorage.removeItem("home-motion-v1");
});

describe("the home's motion, for this device", () => {
  it("is on until the reader turns it off, and off nothing reaches a reader", () => {
    expect(homeMotionOn()).toBe(true);
    setHomeMotion(false);
    expect(homeMotionOn()).toBe(false);
    const stop = watchDeviceMotion();
    const reader = shakeReader();
    jolt(20);
    expect(reader.take()).toEqual({ x: 0, y: 0 });
    reader.dispose();
    stop();
  });

  it("gives each reader the same jolt, so the capsules and Yumi both feel it", () => {
    const stop = watchDeviceMotion();
    const capsules = shakeReader();
    const yumi = shakeReader();
    jolt(10);
    expect(capsules.take().x).toBeCloseTo(0.16, 2);
    expect(yumi.take().x).toBeCloseTo(0.16, 2);
    capsules.dispose();
    yumi.dispose();
    stop();
  });
});

describe("what Yumi feels", () => {
  it("leans and looks toward the low side when the phone is tipped", () => {
    const feel = createYumiFeel(false);
    tilt(30, 0);
    for (let i = 0; i < 4; i += 1) tilt(30, 35);
    const feeling = feel.step(1000, 1 / 60);
    expect(feeling.gaze?.x).toBeGreaterThan(0.2);
    expect(feeling.lean).toBeLessThan(0);
    expect(feeling.dizzy).toBe(false);
    feel.dispose();
  });

  it("is dizzy after a hard shake, and not after a gentle one", () => {
    const feel = createYumiFeel(false);
    let now = 1000;
    for (let i = 0; i < 20; i += 1) {
      jolt(i % 2 ? -3 : 3);
      now += 16;
      expect(feel.step(now, 0.016).dizzy).toBe(false);
    }
    let dizzy = false;
    for (let i = 0; i < 40 && !dizzy; i += 1) {
      jolt(i % 2 ? -28 : 28);
      now += 16;
      dizzy = feel.step(now, 0.016).dizzy;
    }
    expect(dizzy).toBe(true);
    expect(feel.step(now + 2000, 0.016).dizzy).toBe(false);
    feel.dispose();
  });

  it("stays still for a reader who asked for less motion", () => {
    const feel = createYumiFeel(true);
    for (let i = 0; i < 30; i += 1) jolt(i % 2 ? -30 : 30);
    expect(feel.step(1000, 0.016)).toEqual({ gaze: null, lean: 0, dizzy: false });
    feel.dispose();
  });
});
