import { act, fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import useCosmicCoreScrollFade from "@/components/foundation/layout/useCosmicCoreScrollFade";

/* =========================================================
   The closed core rests while the reader reads

   Down 120px dims it to 35%, painted once a frame; up, a touch, focus
   or 700ms of stillness wakes it; open, mid-gesture or navigating it
   stays awake; only the app's own scroll layer counts.
   ========================================================= */

function Harness({ suspended = false, route = "home", nested = true }) {
  const root = useRef<HTMLDivElement>(null);
  useCosmicCoreScrollFade(root, suspended, route);
  return (
    <>
      {nested && <div data-app-scroll-viewport data-testid="viewport" />}
      <div ref={root} data-testid="dock">
        <button type="button">Core</button>
      </div>
    </>
  );
}

const dock = () => screen.getByTestId("dock");
const opacity = () => Number(dock().style.getPropertyValue("--core-opacity"));
const nextFrame = () => act(() => { vi.advanceTimersToNextFrame(); });

function scroll(y: number) {
  const viewport = screen.getByTestId("viewport");
  viewport.scrollTop = y;
  fireEvent.scroll(viewport);
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("reading", () => {
  it("dims the core over 120px to 35%, and wakes it after 700ms of stillness", () => {
    render(<Harness />);
    scroll(60);
    nextFrame();
    expect(opacity()).toBeCloseTo(0.675);
    scroll(120);
    nextFrame();
    expect(opacity()).toBeCloseTo(0.35);
    scroll(500);
    nextFrame();
    expect(opacity()).toBeCloseTo(0.35);
    // 700ms from the last scroll, a frame of which has already passed.
    act(() => { vi.advanceTimersByTime(650); });
    expect(opacity()).toBeCloseTo(0.35);
    act(() => { vi.advanceTimersByTime(50); });
    expect(opacity()).toBe(1);
  });

  it("paints once a frame however many scroll events arrive in it", () => {
    render(<Harness />);
    const paint = vi.spyOn(dock().style, "setProperty");
    for (const y of [10, 25, 40, 60]) scroll(y);
    expect(paint).not.toHaveBeenCalled();
    nextFrame();
    expect(paint).toHaveBeenCalledTimes(1);
    expect(opacity()).toBeCloseTo(0.675);
  });

  it("wakes at once on scrolling up, a touch or focus", () => {
    render(<Harness />);
    scroll(120);
    nextFrame();
    scroll(115);
    expect(opacity()).toBe(1);
    scroll(235);
    nextFrame();
    fireEvent.pointerDown(screen.getByRole("button"));
    expect(opacity()).toBe(1);
    scroll(355);
    nextFrame();
    fireEvent.focusIn(screen.getByRole("button"));
    expect(opacity()).toBe(1);
  });
});

describe("when it does not rest", () => {
  it("stays awake open, mid-gesture or navigating, and wakes on a new route", () => {
    const { rerender } = render(<Harness />);
    scroll(120);
    nextFrame();
    expect(opacity()).toBeCloseTo(0.35);
    rerender(<Harness suspended />);
    expect(opacity()).toBe(1);
    scroll(240);
    nextFrame();
    expect(opacity()).toBe(1);
    rerender(<Harness />);
    scroll(360);
    nextFrame();
    expect(opacity()).toBeCloseTo(0.35);
    rerender(<Harness route="discover" />);
    expect(opacity()).toBe(1);
  });

  it("ignores the window when the app has its own scroll layer, and leaves no timers behind", () => {
    const { unmount } = render(<Harness />);
    fireEvent.scroll(window);
    nextFrame();
    expect(opacity()).toBe(1);
    scroll(120);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("follows the window where there is no scroll layer, as on the review page", () => {
    vi.spyOn(window, "scrollY", "get").mockReturnValue(0);
    render(<Harness nested={false} />);
    vi.spyOn(window, "scrollY", "get").mockReturnValue(120);
    fireEvent.scroll(window);
    nextFrame();
    expect(opacity()).toBeCloseTo(0.35);
  });
});
