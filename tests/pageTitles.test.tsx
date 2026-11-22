import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import AppHeader from "@/components/foundation/layout/AppHeader";
import PageTitle, { PAGE_TITLE_CLASS, TitleText } from "@/components/foundation/layout/PageTitle";
import { DECODE_MS } from "@/lib/motion/pageArrival";

/*
 * Chi, 2026-11-15 (進入每一頁，主題頁面字體及大小統一，都要有跑字母定位的動畫):
 * every page wears one title, a sub-screen's included, and every title runs
 * its letters into place each time it appears, the first page opened and a
 * title that arrives after its data included.
 */

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("one title for every page", () => {
  it("gives a sub-screen the page title's face and size, with its way back", () => {
    render(<AppHeader title="Devices" backHref="/profile" backLabel="Back" />);
    const heading = screen.getByRole("heading", { level: 1 });
    for (const name of PAGE_TITLE_CLASS.split(" ")) expect(heading).toHaveClass(name);
    expect(screen.getByRole("link", { name: "Back" })).toHaveAttribute("href", "/profile");
  });
});

describe("letters running into place", () => {
  it("runs as the title mounts, with no page change needed", () => {
    const { container } = render(<PageTitle title="Library" />);
    const text = container.querySelector("[data-title-text]")!;
    expect(text.hasAttribute("data-decoding")).toBe(true);
    act(() => vi.advanceTimersByTime(DECODE_MS + 50));
    expect(text.hasAttribute("data-decoding")).toBe(false);
    expect(text.textContent).toBe("Library");
  });

  it("waits for a title that arrives after its data, then runs once it does", () => {
    const { container, rerender } = render(<TitleText text="" />);
    const text = container.querySelector("[data-title-text]")!;
    expect(text.hasAttribute("data-decoding")).toBe(false);
    rerender(<TitleText text="Fruit" />);
    expect(text.hasAttribute("data-decoding")).toBe(true);
  });

  it("sets gilt lettering's own glyphs aside and gilds the scramble instead", () => {
    const { container } = render(
      <span style={{ backgroundImage: "linear-gradient(gold, orange)", backgroundClip: "text" }}>
        <TitleText text="Hangyumi" clipped />
      </span>,
    );
    const text = container.querySelector("[data-title-text]")!;
    expect(text.hasAttribute("data-title-clipped")).toBe(true);
    expect(text.querySelector("[data-title-real]")?.textContent).toBe("Hangyumi");
    const scramble = text.querySelector<HTMLElement>("[data-title-decode]")!;
    expect(scramble.style.backgroundImage).toContain("gradient");
    expect(scramble.style.color).toBe("transparent");
  });

  /* The games' and the shop's signs (2026-11-21): iOS Safari left the plate
     blank when the gilt was a parent's clip, so the name paints its own,
     and the scramble takes the same rule rather than a copy of a parent's. */
  it("lets a name that paints its own gilt keep it through the scramble and after", () => {
    const sheet = document.createElement("style");
    sheet.textContent = ".plate [data-title-real], .plate [data-title-decode] { background-clip: text; color: transparent; }";
    document.head.appendChild(sheet);
    const { container } = render(
      <span className="plate" style={{ color: "rgb(201, 165, 90)" }}>
        <TitleText text="Yumi's games" clipped />
      </span>,
    );
    const text = container.querySelector("[data-title-text]")!;
    const scramble = text.querySelector<HTMLElement>("[data-title-decode]")!;
    expect(scramble.style.color).toBe("transparent");
    expect(scramble.style.backgroundImage).toBe("");
    act(() => vi.advanceTimersByTime(DECODE_MS + 50));
    expect(text.hasAttribute("data-decoding")).toBe(false);
    expect(text.querySelector("[data-title-decode]")).toBeNull();
    expect(text.querySelector("[data-title-real]")?.textContent).toBe("Yumi's games");
    sheet.remove();
  });

  it("stays still for a reader who asked for less motion", () => {
    const matchMedia = vi.spyOn(window, "matchMedia").mockReturnValue({ matches: true } as MediaQueryList);
    const { container } = render(<TitleText text="Notes" />);
    expect(container.querySelector("[data-title-text]")!.hasAttribute("data-decoding")).toBe(false);
    matchMedia.mockRestore();
  });
});
