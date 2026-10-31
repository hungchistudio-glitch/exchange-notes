import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import BottomNavigation from "@/components/foundation/layout/BottomNavigation";
import CosmicCoreNavigation from "@/components/foundation/layout/CosmicCoreNavigation";
import { positionAlong } from "@/components/foundation/layout/useRailScrub";

/* =========================================================
   Slide a finger along the bar; lift to go there (Chi, 2026-10-30)

   Both bars: past 8px sideways a press becomes a slide; the light and the
   name follow the finger; lifting over the bar enters the key nearest it,
   once; lifting off it enters nothing; a tap is unchanged.
   ========================================================= */

vi.mock("@/components/foundation/layout/NavPendingHint", () => ({ default: () => null }));

/** Six keys 60px apart, their centres at x = 30, 90, … 330; the bar from y 700 to 760. */
function lay(selector: string) {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    // Counted among the keys alone: the rail also holds its track and light.
    const index = this.matches(selector)
      ? Array.from(this.parentElement!.children).filter(child => child.matches(selector)).indexOf(this)
      : -1;
    const box = index >= 0
      ? { left: index * 60, top: 708, width: 60, height: 44 }
      : { left: 0, top: 700, width: 360, height: 60 };
    return { ...box, right: box.left + box.width, bottom: box.top + box.height, x: box.left, y: box.top, toJSON() {} } as DOMRect;
  });
}

function pointer(target: Element, type: string, x: number, y = 730) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, { button: 0, isPrimary: true, pointerId: 7, clientX: x, clientY: y });
  fireEvent(target, event);
}

const actions = Array.from({ length: 6 }, () => vi.fn());
const names = ["Vocabulary", "Messages", "Home", "Search", "Discover", "Settings"];
const items = () => names.map((label, index) => ({ label, icon: <span>{label[0]}</span>, onSelect: actions[index], active: index === 2 }));

beforeEach(() => actions.forEach(action => action.mockClear()));
afterEach(() => vi.restoreAllMocks());

describe("where the finger is", () => {
  it("reads as a fractional key between centres, and the key nearest it", () => {
    const centres = [30, 90, 150];
    expect(positionAlong(0, centres)).toEqual({ position: 0, index: 0 });
    expect(positionAlong(75, centres)).toEqual({ position: 0.75, index: 1 });
    expect(positionAlong(200, centres)).toEqual({ position: 2, index: 2 });
  });
});

describe("Standard mode's dock", () => {
  const dock = () => screen.getByRole("button", { name: "Home" }).closest("div.relative.grid")!.parentElement!;

  it("names the key under a sliding finger and enters it on lifting over the dock, once", () => {
    lay("[aria-label]");
    render(<BottomNavigation items={items()} label="Navigation" />);
    pointer(dock(), "pointerdown", 150);
    pointer(dock(), "pointermove", 200);
    pointer(dock(), "pointermove", 265);
    expect(screen.getByText("Discover", { selector: "div[aria-hidden]" })).toBeInTheDocument();
    expect(dock().style.getPropertyValue("--scrub-x")).not.toBe("");
    pointer(dock(), "pointerup", 265);
    expect(actions[4]).toHaveBeenCalledTimes(1);
    // The browser's own click after the lift lands on the key pressed first: swallowed.
    fireEvent.click(screen.getByRole("button", { name: "Home" }));
    expect(actions[2]).not.toHaveBeenCalled();
  });

  it("keeps sliding when a touch's capture moves from the pressed icon to the dock", () => {
    // The browser captures a touch to the element pressed; taking it for the
    // dock fires lostpointercapture there, which bubbles. Not the dock's own.
    lay("[aria-label]");
    render(<BottomNavigation items={items()} label="Navigation" />);
    const icon = screen.getByRole("button", { name: "Home" }).querySelector("span")!;
    pointer(icon, "pointerdown", 150);
    pointer(icon, "pointermove", 200);
    pointer(icon, "lostpointercapture", 200);
    pointer(dock(), "pointermove", 265);
    pointer(dock(), "pointerup", 265);
    expect(actions[4]).toHaveBeenCalledTimes(1);
  });

  it("enters nothing when the finger lifts off the dock", () => {
    lay("[aria-label]");
    render(<BottomNavigation items={items()} label="Navigation" />);
    pointer(dock(), "pointerdown", 150);
    pointer(dock(), "pointermove", 265);
    pointer(dock(), "pointerup", 265, 600);
    expect(actions.every(action => action.mock.calls.length === 0)).toBe(true);
    expect(dock().style.getPropertyValue("--scrub-x")).toBe("");
  });

  it("leaves a tap as a tap", () => {
    lay("[aria-label]");
    render(<BottomNavigation items={items()} label="Navigation" />);
    pointer(dock(), "pointerdown", 92);
    pointer(dock(), "pointermove", 95);
    pointer(dock(), "pointerup", 95);
    fireEvent.click(screen.getByRole("button", { name: "Messages" }));
    expect(actions[1]).toHaveBeenCalledTimes(1);
  });
});

describe("Cosmic mode's open rail", () => {
  const core = () => screen.getByRole("button", { name: "Controls" });
  const rail = () => screen.getByRole("navigation", { hidden: true });

  it("follows the finger along the open rail and enters the key it lifts over", () => {
    lay("[data-core-item]");
    render(<CosmicCoreNavigation items={items()} label="Controls" />);
    fireEvent.click(core());
    pointer(rail(), "pointerdown", 150);
    pointer(rail(), "pointermove", 220);
    expect(core().parentElement).toHaveAttribute("data-scrubbing", "true");
    // The light itself moves, between keys too: 3.17 keys along.
    const light = rail().lastElementChild as HTMLElement;
    expect(parseFloat(light.style.transform.replace("translateX(", ""))).toBeCloseTo(316.7, 0);
    pointer(rail(), "pointermove", 32);
    pointer(rail(), "pointerup", 32);
    expect(actions[0]).toHaveBeenCalledTimes(1);
    expect(core()).toHaveAttribute("aria-expanded", "false");
    expect(core().parentElement).toHaveAttribute("data-scrubbing", "false");
    // Let go: --slot has the light back.
    expect(light.style.transform).toBe("");
  });

  it("enters nothing when lifted above the rail, and stays open", () => {
    lay("[data-core-item]");
    render(<CosmicCoreNavigation items={items()} label="Controls" />);
    fireEvent.click(core());
    pointer(rail(), "pointerdown", 150);
    pointer(rail(), "pointermove", 280);
    pointer(rail(), "pointerup", 280, 500);
    expect(actions.every(action => action.mock.calls.length === 0)).toBe(true);
    expect(core()).toHaveAttribute("aria-expanded", "true");
  });
});
