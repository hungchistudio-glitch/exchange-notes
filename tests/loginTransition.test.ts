import { afterEach, describe, expect, it, vi } from "vitest";

import { playLoginArrival, playLoginExit } from "@/components/landing/loginTransition";

/*
 * From the landing page's Start keys into sign-in, through Yumi's eye
 * (Chi, 2026-11-21; 2026-11-22: 虹膜掃描＋躍遷). The cover lives on <body>
 * so it lasts across the client navigation. Sign-in is asked for once the
 * screen is covered; the scan goes on until sign-in says it is there, then
 * locks, goes through the pupil and assembles the card. Whatever happens
 * the cover must never stay on the screen, and reduced motion goes
 * straight to sign-in.
 */
function fakeAnimate() {
  const animate = vi.fn(() => ({ cancel: () => {}, onfinish: null }) as unknown as Animation);
  Object.defineProperty(HTMLElement.prototype, "animate", { value: animate, configurable: true });
  return animate;
}

function setReducedMotion(reduce: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: reduce && query.includes("reduce") }));
}

function key() {
  return document.body.appendChild(document.createElement("a"));
}

afterEach(() => {
  delete (HTMLElement.prototype as { animate?: unknown }).animate;
  vi.unstubAllGlobals();
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("the way into sign-in", () => {
  it("starts the film exit at Yumi's eye and navigates as soon as that shorter cover closes", () => {
    vi.useFakeTimers();
    fakeAnimate();
    setReducedMotion(false);
    const eye = document.body.appendChild(document.createElement("span"));
    vi.spyOn(eye, "getBoundingClientRect").mockReturnValue(new DOMRect(220, 100, 40, 40));
    const go = vi.fn();
    const start = key();
    playLoginExit(start, go, eye);
    const layers = [...document.querySelectorAll<HTMLElement>("[data-login-cover] div")];
    expect(layers.some(layer => layer.style.clipPath.includes("at 240px 120px"))).toBe(true);
    vi.advanceTimersByTime(259);
    expect(go).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(go).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(6000);
    expect(document.querySelector("[data-login-cover]")).toBeNull();
    expect(start.style.visibility).toBe("");
  });

  it("goes at once, with no cover, for a reader who asked for less motion", () => {
    fakeAnimate();
    setReducedMotion(true);
    const go = vi.fn();
    playLoginExit(key(), go);
    expect(go).toHaveBeenCalledTimes(1);
    expect(document.querySelector("[data-login-cover]")).toBeNull();
  });

  it("asks for sign-in once the screen is covered, scans while it loads, and lets go if it never comes", () => {
    vi.useFakeTimers();
    fakeAnimate();
    setReducedMotion(false);
    const go = vi.fn();
    const start = key();
    playLoginExit(start, go);

    const cover = document.querySelector("[data-login-cover]");
    expect(cover).not.toBeNull();
    expect(cover).toHaveAttribute("aria-hidden", "true");
    expect(start.style.visibility).toBe("hidden");
    expect(go).not.toHaveBeenCalled();

    vi.advanceTimersByTime(600);
    expect(go).toHaveBeenCalledTimes(1);

    // Still scanning, long past one pass, and only one navigation.
    vi.advanceTimersByTime(3000);
    expect(document.querySelector("[data-login-cover]")).not.toBeNull();
    expect(go).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(3000);
    expect(document.querySelector("[data-login-cover]")).toBeNull();
    expect(start.style.visibility).toBe("");
  });

  it("locks, goes through and assembles the card once sign-in is there, then clears", () => {
    vi.useFakeTimers();
    const animate = fakeAnimate();
    setReducedMotion(false);
    playLoginExit(key(), () => undefined);
    vi.advanceTimersByTime(600);

    const card = document.body.appendChild(document.createElement("section"));
    playLoginArrival(card);
    // Kept out of sight until the scan line reaches it.
    expect(card.style.opacity).toBe("0");

    const before = animate.mock.calls.length;
    vi.advanceTimersByTime(1000);
    expect(animate.mock.calls.length).toBeGreaterThan(before);
    // The card switched on, from the top, as the line passed.
    expect(card.style.opacity).toBe("");
    expect(animate.mock.contexts).toContain(card);
    // The frame's four brackets came out to it.
    expect(document.querySelectorAll("[data-login-cover] > div").length).toBeGreaterThanOrEqual(5);

    vi.advanceTimersByTime(1500);
    expect(document.querySelector("[data-login-cover]")).toBeNull();
  });

  it("does nothing on a sign-in page reached any other way", () => {
    const animate = fakeAnimate();
    setReducedMotion(false);
    const card = document.body.appendChild(document.createElement("section"));
    playLoginArrival(card);
    expect(animate).not.toHaveBeenCalled();
    expect(card.style.opacity).toBe("");
  });
});
