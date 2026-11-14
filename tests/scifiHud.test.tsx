import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import PageTitle from "@/components/foundation/layout/PageTitle";
import { DECODE_MS, decodeFrame, decodeTitle } from "@/lib/motion/pageArrival";
import {
  INTERFACE_SOUNDS_KEY,
  interfaceSoundsOn,
  setInterfaceSounds,
} from "@/lib/sound/interfaceSounds";

/*
 * The HUD (Chi, 2026-11-14: 更科幻風格): a page's title decodes as it
 * arrives, its small caps carry a status light, and the interface's sounds
 * are on by default in Yumi Cosmic and off in Standard.
 */

describe("a title decoding", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("starts as a scramble the length of the title and ends as the title", () => {
    const glyph = () => 0;
    expect(Array.from(decodeFrame("Review", 0, glyph))).toHaveLength(6);
    expect(decodeFrame("Review", 0, glyph)).not.toContain("R");
    expect(decodeFrame("Review", 1, glyph)).toBe("Review");
    // Resolved from the left, and spaces are never scrambled.
    expect(decodeFrame("Daily News", 0.6, glyph).startsWith("Dai")).toBe(true);
    expect(decodeFrame("Daily News", 0.3, glyph)[5]).toBe(" ");
  });

  it("keeps the title's own text for a screen reader while the overlay scrambles", () => {
    render(<PageTitle title="Review" eyebrow="Daily review" />);
    const text = document.querySelector<HTMLElement>("[data-title-text]")!;
    decodeTitle(document);

    expect(text.hasAttribute("data-decoding")).toBe(true);
    expect(screen.getByRole("heading", { level: 1, name: /Review/ })).toBeInTheDocument();
    const overlay = text.querySelector("[data-title-decode]")!;
    expect(overlay.getAttribute("aria-hidden")).toBe("true");

    vi.advanceTimersByTime(DECODE_MS + 50);
    expect(text.hasAttribute("data-decoding")).toBe(false);
    expect(text.querySelector("[data-title-decode]")).toBeNull();
    expect(text.textContent).toBe("Review");
  });

  it("puts a status light and a rule around the small caps, hidden from screen readers", () => {
    render(<PageTitle title="Notes" eyebrow="Personal" />);
    const led = document.querySelector(".hud-led")!;
    expect(led.getAttribute("aria-hidden")).toBe("true");
    expect(document.querySelector(".hud-rule")?.getAttribute("aria-hidden")).toBe("true");
    expect(screen.getByText("Personal")).toBeInTheDocument();
  });
});

describe("the interface's sounds switch", () => {
  afterEach(() => window.localStorage.removeItem(INTERFACE_SOUNDS_KEY));

  it("is on by default in Yumi Cosmic and off in Standard", () => {
    expect(interfaceSoundsOn("yumi-cosmic")).toBe(true);
    expect(interfaceSoundsOn("standard")).toBe(false);
  });

  it("keeps the reader's choice over either default, and says so to every reader", () => {
    const heard = vi.fn();
    window.addEventListener("interface-sounds-change", heard);
    setInterfaceSounds(false);
    expect(interfaceSoundsOn("yumi-cosmic")).toBe(false);
    setInterfaceSounds(true);
    expect(interfaceSoundsOn("standard")).toBe(true);
    expect(heard).toHaveBeenCalledTimes(2);
    window.removeEventListener("interface-sounds-change", heard);
  });
});
