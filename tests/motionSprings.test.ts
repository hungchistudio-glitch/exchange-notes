import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { SPRINGS, settleTime, springAt, springEasing, springPeak } from "@/lib/motion/spring";

/*
 * The app's springs (Chi, 2026-11-22: 彈簧曲線系統). The closed-form damped
 * spring has to start at rest, end at rest, overshoot by what its damping
 * says, and the CSS tokens in app/globals.css have to be the same curves
 * lib/motion/spring.ts makes, or CSS and Web Animations would move apart.
 */

describe("the damped spring", () => {
  it("starts at 0 and settles at 1", () => {
    for (const spring of Object.values(SPRINGS)) {
      expect(springAt(0, spring)).toBe(0);
      expect(Math.abs(springAt(settleTime(spring), spring) - 1)).toBeLessThan(0.006);
      expect(Math.abs(springAt(settleTime(spring) * 2, spring) - 1)).toBeLessThan(0.006);
    }
  });

  it("overshoots most when it is least damped", () => {
    expect(springPeak(SPRINGS.pop)).toBeGreaterThan(1.15);
    expect(springPeak(SPRINGS.settle)).toBeGreaterThan(1.03);
    expect(springPeak(SPRINGS.sheet)).toBeLessThan(1.02);
    /* The sampled peak matches the analytic one. */
    let peak = 0;
    for (let t = 0; t < 1; t += 0.001) peak = Math.max(peak, springAt(t, SPRINGS.pop));
    expect(peak).toBeCloseTo(springPeak(SPRINGS.pop), 2);
  });

  it("is a linear() easing that begins at 0 and ends at 1", () => {
    const { easing, durationMs } = springEasing(SPRINGS.pop);
    expect(easing.startsWith("linear(0, ")).toBe(true);
    expect(easing.endsWith(", 1)")).toBe(true);
    expect(durationMs).toBeGreaterThan(500);
    expect(durationMs).toBeLessThan(1200);
  });
});

describe("the CSS tokens", () => {
  const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
  const supported = css.slice(css.indexOf("@supports (transition-timing-function: linear(0, 1))"));

  it.each(Object.keys(SPRINGS))("--spring-%s is the same curve and duration", (name) => {
    const { easing, durationMs } = springEasing(SPRINGS[name as keyof typeof SPRINGS]);
    expect(supported).toContain(`--spring-${name}: ${easing};`);
    expect(supported).toContain(`--spring-${name}-duration: ${durationMs}ms;`);
  });

  it("falls back to the strong ease-out where linear() is missing", () => {
    for (const name of Object.keys(SPRINGS)) expect(css).toContain(`--spring-${name}: var(--ease-out);`);
  });
});
