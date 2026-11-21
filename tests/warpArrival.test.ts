import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  ASSEMBLE_MS,
  SCAN_MS,
  SCAN_START_MS,
  playWarpArrival,
  scanDelay,
} from "@/lib/motion/warpArrival";

/*
 * A page in Yumi Cosmic arrives through a warp, then assembles (Chi,
 * 2026-11-14: 先躍遷再組裝): starlight streaks out, a scan line passes
 * down the screen, each block switches on as the line reaches its top, and
 * its rows slide in from the left. It took over from the rising liquid.
 */
describe("the warp arrival", () => {
  type Played = { element: Element; keyframes: Keyframe[]; options: KeyframeAnimationOptions };
  let played: Played[];

  function block(top: number, rows = 0) {
    const element = document.createElement("div");
    element.getBoundingClientRect = () => ({ top, bottom: top + 200 }) as DOMRect;
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
    Object.defineProperty(window, "innerWidth", { value: 390, configurable: true });
    HTMLElement.prototype.animate = function (this: HTMLElement, keyframes: Keyframe[], options: KeyframeAnimationOptions) {
      played.push({ element: this, keyframes, options });
      return { onfinish: null, cancel() {} } as unknown as Animation;
    } as typeof HTMLElement.prototype.animate;
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("reaches a block's top on the scan line's clock, top first", () => {
    expect(scanDelay(0, 800)).toBe(SCAN_START_MS);
    expect(scanDelay(400, 800)).toBe(SCAN_START_MS + SCAN_MS / 2);
    expect(scanDelay(2000, 800)).toBe(SCAN_START_MS + SCAN_MS);
  });

  it("streaks starlight and a scan line over the screen, and takes both away", () => {
    playWarpArrival([block(100)], () => false);
    expect(document.querySelector("[data-warp]")?.children.length).toBeGreaterThan(10);
    expect(document.querySelector("[data-scan]")).not.toBeNull();
    expect(document.querySelector("[data-warp]")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("takes over from an arrival still playing, so two never run at once", () => {
    // Back, back: the second page arrives while the first one's light is up.
    const lamp = document.createElement("div");
    lamp.setAttribute("data-lamp-light", "");
    document.body.appendChild(lamp);
    playWarpArrival([block(100)], () => false);
    playWarpArrival([block(100)], () => false);
    expect(document.querySelectorAll("[data-warp]")).toHaveLength(1);
    expect(document.querySelectorAll("[data-scan]")).toHaveLength(1);
    expect(document.querySelector("[data-lamp-light]")).toBeNull();
  });

  it("switches each block on in turn and slides its rows in after it", () => {
    const top = block(0, 2);
    const lower = block(600);
    playWarpArrival([top, lower], () => false);

    const topPlay = played.find((entry) => entry.element === top)!;
    const lowerPlay = played.find((entry) => entry.element === lower)!;
    expect(topPlay.options.duration).toBe(ASSEMBLE_MS);
    expect(Number(topPlay.options.delay)).toBeLessThan(Number(lowerPlay.options.delay));
    expect(topPlay.keyframes[0]).toMatchObject({ opacity: 0, scale: "0.985" });

    const rows = played.filter((entry) => entry.element.hasAttribute("data-liquid-option"));
    expect(rows).toHaveLength(2);
    expect(Number(rows[1].options.delay)).toBeGreaterThan(Number(rows[0].options.delay));
    expect(Number(rows[0].options.delay)).toBeGreaterThan(Number(topPlay.options.delay));
  });

  it("only flickers a block that holds a fixed element, so nothing fixed moves", () => {
    const holder = block(100);
    playWarpArrival([holder], () => true);
    const play = played.find((entry) => entry.element === holder)!;
    expect(play.keyframes.some((frame) => "scale" in frame || "translate" in frame)).toBe(false);
  });
});
