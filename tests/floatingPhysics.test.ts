import { describe, expect, it } from "vitest";
import { avoid, bound, collide, scatter, type Body } from "@/lib/home/floatingPhysics";
const body = (x: number, y: number): Body => ({ x, y, vx: 20, vy: 10, radius: 22 });
describe("floating cookie boundaries", () => {
  it("keeps cookies inside a narrow phone after a fast flick", () => {
    const cookie = body(800, -200);
    bound(cookie, 320, 568);
    expect(cookie.x).toBeLessThanOrEqual(290);
    expect(cookie.y).toBeGreaterThanOrEqual(75);
    expect(cookie.vx).toBeLessThan(0);
  });
  it("separates overlapping cookies without moving the finger-held one", () => {
    const held = body(100, 100), free = body(110, 100);
    collide(held, free, true);
    expect(held.x).toBe(100);
    expect(free.x - held.x).toBeGreaterThanOrEqual(47);
  });
  it("moves cookies away from text and safely scatters coincident particles", () => {
    const cookie = body(100, 100);
    avoid(cookie, { left: 80, right: 140, top: 80, bottom: 120 });
    expect(cookie.x < 80 || cookie.y < 80 || cookie.x > 140 || cookie.y > 120).toBe(true);
    scatter(cookie, cookie.x, cookie.y, Math.PI / 2);
    expect(Number.isFinite(cookie.vx + cookie.vy)).toBe(true);
    expect(cookie.vy).toBeCloseTo(145);
  });
});
