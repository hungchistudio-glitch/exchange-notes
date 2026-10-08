import { Quaternion, Vector3 } from "three";
import { describe, expect, it } from "vitest";
import { createYumiRotation, ROTATION_CRUISE_SPEED } from "@/lib/yumi3d/rotation";

function fixture(reduced = false) {
  const pose = new Quaternion();
  return { pose, orbit: createYumiRotation(pose, reduced) };
}
function flick(target: ReturnType<typeof fixture>, dx = 60, dy = 0) {
  target.orbit.begin(0);
  target.orbit.drag(dx, dy, 50);
  target.orbit.release(50, true);
}
function advance(target: ReturnType<typeof fixture>, seconds: number, fps = 60, paused = false) {
  for (let i = 0; i < Math.round(seconds * fps); i++) target.orbit.step(1 / fps, paused);
}

describe("Yumi's continuous home rotation", () => {
  it("stays still before an intentional turn and does not launch from a tap", () => {
    const target = fixture();
    advance(target, 5);
    target.orbit.begin(5000); target.orbit.release(5010, false);
    advance(target, 5);
    expect(target.pose.angleTo(new Quaternion())).toBe(0);
  });

  it("continues in the release direction, then settles into a nonzero slow orbit", () => {
    const target = fixture(); flick(target);
    const released = target.pose.clone();
    advance(target, 0.1);
    expect(target.pose.angleTo(released)).toBeGreaterThan(0.2);
    advance(target, 10);
    const settled = target.pose.clone();
    advance(target, 1);
    expect(target.pose.angleTo(settled)).toBeCloseTo(ROTATION_CRUISE_SPEED, 5);
    expect(target.pose.y).not.toBe(0);
  });

  it("allows full vertical and diagonal turns without a pitch clamp", () => {
    const target = fixture();
    target.orbit.begin(0); target.orbit.drag(0, Math.PI / 0.012, 50);
    const forward = new Vector3(0, 0, 1).applyQuaternion(target.pose);
    expect(forward.z).toBeCloseTo(-1, 6);
    target.orbit.drag(100, 80, 100);
    target.orbit.release(100, true);
    advance(target, 60);
    expect(target.pose.length()).toBeCloseTo(1, 8);
    expect([target.pose.x, target.pose.y, target.pose.z, target.pose.w].every(Number.isFinite)).toBe(true);
  });

  it("has the same trajectory on 60 Hz and 120 Hz displays", () => {
    const a = fixture(); const b = fixture();
    flick(a, 40, -25); flick(b, 40, -25);
    advance(a, 5, 60); advance(b, 5, 120);
    expect(a.pose.angleTo(b.pose)).toBeLessThan(0.000001);
  });

  it("eases to rest during a panel, then resumes without resetting orientation", () => {
    const target = fixture(); flick(target, -40, 30);
    const released = target.pose.clone();
    advance(target, 2, 60, true);
    const paused = target.pose.clone();
    advance(target, 2, 60, true);
    expect(target.pose.angleTo(paused)).toBeLessThan(0.000001);
    expect(paused.angleTo(released)).toBeGreaterThan(0);
    advance(target, 2);
    expect(target.pose.angleTo(paused)).toBeGreaterThan(0.2);
  });

  it("grabbing holds the current pose, and a new drag replaces the old direction", () => {
    const target = fixture(); flick(target);
    advance(target, 1);
    target.orbit.begin(1050);
    const held = target.pose.clone(); advance(target, 1);
    expect(target.pose.angleTo(held)).toBeLessThan(0.000001);
    target.orbit.drag(-40, 0, 1100); target.orbit.release(1100, true);
    const released = target.pose.clone(); advance(target, 0.1);
    const difference = target.pose.clone().multiply(released.clone().invert());
    expect(difference.y).toBeLessThan(0);
  });

  it("holding still before release drops stale flick speed; a zero delta does not erase a fresh flick", () => {
    const held = fixture(); held.orbit.begin(0); held.orbit.drag(40, 0, 50);
    held.orbit.drag(0, 0, 500); held.orbit.release(500, true);
    const slow = held.pose.clone(); advance(held, 0.1);
    expect(held.pose.angleTo(slow)).toBeCloseTo(ROTATION_CRUISE_SPEED * 0.1, 6);
    const fresh = fixture(); fresh.orbit.begin(0); fresh.orbit.drag(40, 0, 50);
    fresh.orbit.drag(0, 0, 51); fresh.orbit.release(51, true);
    const fast = fresh.pose.clone(); advance(fresh, 0.1);
    expect(fresh.pose.angleTo(fast)).toBeGreaterThan(0.2);
  });

  it("cancellation does not start a spin, and background time cannot cause a large jump", () => {
    const target = fixture(); target.orbit.begin(0); target.orbit.drag(40, 0, 50); target.orbit.cancel();
    const cancelled = target.pose.clone(); advance(target, 5);
    expect(target.pose.angleTo(cancelled)).toBeLessThan(0.000001);
    flick(target); const released = target.pose.clone(); target.orbit.step(60);
    expect(target.pose.angleTo(released)).toBeLessThan(0.1);
  });

  it("respects reduced motion while still allowing direct manipulation", () => {
    const target = fixture(true); flick(target, 40, 60);
    expect(target.pose.angleTo(new Quaternion())).toBeGreaterThan(0.5);
    const released = target.pose.clone(); advance(target, 10);
    expect(target.pose.angleTo(released)).toBeLessThan(0.000001);
  });
});
