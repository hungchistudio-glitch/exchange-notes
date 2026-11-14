import { act, render } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import useRiseClearOfCoach from "@/hooks/home/useRiseClearOfCoach";

/* =========================================================
   Yumi rises clear of the tour's card (Chi, 2026-11-13)

   Every Home step's card stands at the foot. Measured on a 667px phone, a
   fixed rise left the field under her clear at the small text size and
   covered by the card at the medium and large. The hook measures both and
   moves her by the difference — never up into the corner keys.

   jsdom has no layout, so each element's box is given by hand and moved the
   way her padding would move it: half of every pixel of padding.
   ========================================================= */

const HEIGHT = 667;

function rect(top: number, height: number) {
  return { top, bottom: top + height, height, left: 0, right: 375, width: 375, x: 0, y: top, toJSON() {} } as DOMRect;
}

function Harness({ coaching }: { coaching: boolean }) {
  const stageRef = useRef<HTMLDivElement>(null);
  useRiseClearOfCoach(stageRef, coaching);
  return (
    <div data-surface="">
      <div ref={stageRef}>
        <div data-yumi-figure="" />
        <div data-coach-target="search-field" />
      </div>
    </div>
  );
}

/** Lays the screen out for a given card height and padding: she is centred in what the padding leaves. */
function layout(cardHeight: number, keysBottom = 62) {
  const surface = document.querySelector<HTMLElement>("[data-surface]")!;
  const padding = () => parseFloat(surface.style.getPropertyValue("--coach-rise")) || 0;
  const centre = () => (HEIGHT - padding()) / 2;

  vi.spyOn(window, "getComputedStyle").mockImplementation(
    () => ({ paddingBottom: `${padding()}px` }) as CSSStyleDeclaration,
  );
  document.querySelector("[data-yumi-figure]")!.getBoundingClientRect = () => rect(centre() - 72, 144);
  /* The field's foot sits 160px below her centre. */
  document.querySelector('[data-coach-target="search-field"]')!.getBoundingClientRect = () => rect(centre() + 100, 60);
  document.querySelector("[data-coach-card]")!.getBoundingClientRect = () =>
    rect(HEIGHT - 20 - cardHeight, cardHeight);
  document.querySelector("[data-home-shop-key]")!.getBoundingClientRect = () => rect(keysBottom - 40, 40);

  return { padding, fieldBottom: () => centre() + 160, cardTop: () => HEIGHT - 20 - cardHeight, figureTop: () => centre() - 72 };
}

function stage() {
  for (const [attr, value] of [["data-coach-card", ""], ["data-home-shop-key", ""]] as const) {
    const element = document.createElement("div");
    element.setAttribute(attr, value);
    document.body.appendChild(element);
  }
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

describe("useRiseClearOfCoach", () => {
  it("lifts her until the field clears the card, with air between", () => {
    vi.useFakeTimers();
    Object.defineProperty(window, "innerHeight", { configurable: true, value: HEIGHT });
    stage();
    render(<Harness coaching />);
    const screen = layout(259);

    expect(screen.fieldBottom()).toBeGreaterThan(screen.cardTop());

    act(() => vi.advanceTimersByTime(3_000));

    expect(screen.cardTop() - screen.fieldBottom()).toBeGreaterThanOrEqual(10);
    expect(screen.cardTop() - screen.fieldBottom()).toBeLessThanOrEqual(14);
  });

  it("never lifts her into the corner keys, even when that leaves the field covered", () => {
    vi.useFakeTimers();
    Object.defineProperty(window, "innerHeight", { configurable: true, value: HEIGHT });
    stage();
    render(<Harness coaching />);
    const screen = layout(420, 200);

    act(() => vi.advanceTimersByTime(3_000));

    expect(screen.figureTop()).toBeGreaterThanOrEqual(200 + 12 - 1);
  });

  it("writes nothing when no tour is on", () => {
    vi.useFakeTimers();
    stage();
    render(<Harness coaching={false} />);

    act(() => vi.advanceTimersByTime(3_000));

    expect(document.querySelector<HTMLElement>("[data-surface]")!.style.getPropertyValue("--coach-rise")).toBe("");
  });
});
