import { afterEach, describe, expect, it, vi } from "vitest";

import { playLoginArrival, playLoginExit } from "@/components/landing/loginTransition";

/*
 * From the landing page's Start keys into sign-in, through Yumi's eye
 * (Chi, 2026-11-21). The cover lives on <body> so it lasts across the
 * client navigation; whatever happens it must never stay on the screen,
 * and reduced motion goes straight to sign-in.
 */
function fakeAnimate() {
  const animations: Array<{ onfinish: (() => void) | null; cancel: () => void }> = [];
  const animate = vi.fn(() => {
    const animation = { onfinish: null as (() => void) | null, oncancel: null, cancel: () => {} };
    animations.push(animation);
    return animation as unknown as Animation;
  });
  Object.defineProperty(HTMLElement.prototype, "animate", { value: animate, configurable: true });
  return animations;
}

function setReducedMotion(reduce: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: reduce && query.includes("reduce") }));
}

afterEach(() => {
  delete (HTMLElement.prototype as { animate?: unknown }).animate;
  vi.unstubAllGlobals();
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("the way into sign-in", () => {
  it("goes at once, with no cover, for a reader who asked for less motion", () => {
    fakeAnimate();
    setReducedMotion(true);
    const go = vi.fn();
    playLoginExit(document.body.appendChild(document.createElement("a")), go);
    expect(go).toHaveBeenCalledTimes(1);
    expect(document.querySelector("[data-login-cover]")).toBeNull();
  });

  it("closes into Yumi's eye, then goes once, and lets go if sign-in never comes", () => {
    vi.useFakeTimers();
    const animations = fakeAnimate();
    setReducedMotion(false);
    const go = vi.fn();
    playLoginExit(document.body.appendChild(document.createElement("a")), go);

    const cover = document.querySelector("[data-login-cover]");
    expect(cover).not.toBeNull();
    expect(cover).toHaveAttribute("aria-hidden", "true");
    expect(go).not.toHaveBeenCalled();

    // The eye's animation ends: go. The backstop timer must not go again.
    animations[1].onfinish?.();
    vi.advanceTimersByTime(1000);
    expect(go).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(5000);
    expect(document.querySelector("[data-login-cover]")).toBeNull();
  });

  it("opens the sign-in page out of the eye, and does nothing without one", () => {
    vi.useFakeTimers();
    const animations = fakeAnimate();
    setReducedMotion(false);

    playLoginArrival();
    expect(animations).toHaveLength(0);

    playLoginExit(document.body.appendChild(document.createElement("a")), () => undefined);
    const before = animations.length;
    playLoginArrival();
    expect(animations.length).toBe(before + 2);
    animations[animations.length - 1].onfinish?.();
    expect(document.querySelector("[data-login-cover]")).toBeNull();
  });
});
