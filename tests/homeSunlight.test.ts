import { describe, expect, it } from "vitest";

import { sunlightAt } from "@/lib/home/sunlight";

/* The Standard home's shadows follow the reader's clock (Chi, 2026-11-21). */
const at = (hours: number, minutes = 0) => sunlightAt(new Date(2026, 10, 21, hours, minutes));

describe("the home's light by the clock", () => {
  it("throws morning shadows long to the right and evening ones long to the left", () => {
    const morning = at(7, 30);
    const evening = at(16, 30);
    expect(morning.x).toBeGreaterThan(1);
    expect(evening.x).toBeLessThan(-1);
    expect(morning.day).toBe(1);
  });

  it("keeps noon's shadow short and under her, toward the reader", () => {
    const noon = at(12);
    expect(Math.abs(noon.x)).toBeLessThan(0.1);
    expect(noon.z).toBeGreaterThan(0);
    expect(Math.hypot(noon.x, noon.z)).toBeLessThan(at(8).x);
  });

  it("warms the low sun and hangs a gentle lamp at night", () => {
    const red = (ink: number) => (ink >> 16) & 255;
    expect(red(at(17, 30).ink)).toBeGreaterThan(red(at(12).ink));
    const night = at(23);
    expect(night.day).toBe(0);
    expect(Math.hypot(night.x, night.z)).toBeLessThan(0.6);
    expect(night.strength).toBeLessThan(at(12).strength);
  });

  it("eases through dawn rather than jumping", () => {
    const steps = [5.8, 6, 6.2, 6.4, 6.6].map(hours => at(Math.floor(hours), Math.round((hours % 1) * 60)).day);
    for (let i = 1; i < steps.length; i += 1) expect(steps[i]).toBeGreaterThanOrEqual(steps[i - 1]);
    expect(steps[0]).toBeLessThan(0.5);
    expect(steps[steps.length - 1]).toBe(1);
  });
});
