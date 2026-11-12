import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  LIQUID_SURFACE_MS,
  liquidDelay,
  playLiquidArrival,
} from "@/lib/motion/liquidArrival";

/*
 * A page in Yumi Cosmic arrives under a rising liquid (Chi, 2026-11-12:
 * 液體系): the surface crosses the screen bottom to top, each block floats
 * up as the surface reaches its foot, and its rows stretch out of droplets.
 */
describe("the liquid arrival", () => {
  type Played = { element: Element; keyframes: Keyframe[]; options: KeyframeAnimationOptions };
  let played: Played[];

  function block(top: number, bottom: number, rows = 0) {
    const element = document.createElement("div");
    element.getBoundingClientRect = () => ({ top, bottom }) as DOMRect;
    for (let i = 0; i < rows; i++) {
      const row = document.createElement("button");
      row.setAttribute("data-liquid-option", "");
      row.getBoundingClientRect = () => ({ top: top + i * 40, bottom: top + i * 40 + 36 }) as DOMRect;
      element.appendChild(row);
    }
    document.body.appendChild(element);
    return element;
  }

  beforeEach(() => {
    played = [];
    Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
    HTMLElement.prototype.animate = function (this: HTMLElement, keyframes: Keyframe[], options: KeyframeAnimationOptions) {
      played.push({ element: this, keyframes, options });
      return { onfinish: null, cancel() {} } as unknown as Animation;
    } as typeof HTMLElement.prototype.animate;
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("reaches the foot of the screen first and the top last", () => {
    expect(liquidDelay(800, 800)).toBe(0);
    expect(liquidDelay(400, 800)).toBe(LIQUID_SURFACE_MS / 2);
    expect(liquidDelay(0, 800)).toBe(LIQUID_SURFACE_MS);
    // A block running past the fold is reached as the surface enters.
    expect(liquidDelay(1400, 800)).toBe(0);
  });

  it("floats each block up as the surface reaches it, and its rows after it as droplets", () => {
    const header = block(0, 120);
    const list = block(140, 760, 3);
    playLiquidArrival([header, list], () => false);

    expect(document.querySelector("[data-liquid-surface]")).not.toBeNull();
    const headerFloat = played.find((p) => p.element === header)!;
    const listFloat = played.find((p) => p.element === list)!;
    expect(Number(listFloat.options.delay)).toBeLessThan(Number(headerFloat.options.delay));
    expect(headerFloat.keyframes[0]).toMatchObject({ opacity: 0, translate: "0 24px" });

    const rows = played.filter((p) => p.element.hasAttribute("data-liquid-option"));
    expect(rows).toHaveLength(3);
    expect(Number(rows[1].options.delay)).toBeGreaterThan(Number(rows[0].options.delay));
    expect(Number(rows[0].options.delay)).toBeGreaterThan(Number(listFloat.options.delay));
  });

  it("only fades a block that holds a fixed element", () => {
    const composer = block(600, 780);
    playLiquidArrival([composer], () => true);
    const fade = played.find((p) => p.element === composer)!;
    expect(fade.keyframes).toEqual([{ opacity: 0 }, { opacity: 1 }]);
  });
});
