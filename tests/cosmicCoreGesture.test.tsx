import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import CosmicCoreNavigation from "@/components/foundation/layout/CosmicCoreNavigation";

/* =========================================================
   Hold the core, slide to a key, lift to enter it

   A short tap stays a tap. A 180ms hold opens the rail under the finger;
   lifting over a key enters it once, and the click that follows is
   swallowed; lifting anywhere else, moving before the hold, Escape, a
   cancelled or lost pointer or the window losing focus enters nothing.
   ========================================================= */

const navigation = vi.hoisted(() => ({ pending: false }));
vi.mock("next/link", async importOriginal => ({
  ...(await importOriginal<object>()),
  useLinkStatus: () => ({ pending: navigation.pending }),
}));
vi.mock("@/components/foundation/layout/NavPendingHint", () => ({ default: () => null }));

const search = vi.fn();
const items = [
  { href: "/home", label: "Home", icon: "H", active: true },
  { label: "Search", icon: "S", onSelect: search },
];

const core = () => screen.getByRole("button", { name: "Controls" });
const searchKey = () => screen.getByRole("button", { name: "Search" });
const hold = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

function pointer(target: HTMLElement, type: string, x = 50, y = 100) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, { button: 0, isPrimary: true, pointerId: 1, clientX: x, clientY: y });
  fireEvent(target, event);
}

/** What is under the finger: the test says, as layout would. */
let under: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.useFakeTimers();
  search.mockClear();
  navigation.pending = false;
  under = vi.fn(() => null);
  Object.defineProperty(document, "elementFromPoint", { configurable: true, value: under });
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("a tap", () => {
  it("stays an ordinary click that opens the rail", () => {
    render(<CosmicCoreNavigation items={items} label="Controls" />);
    pointer(core(), "pointerdown");
    hold(100);
    pointer(core(), "pointerup");
    fireEvent.click(core(), { detail: 1 });
    expect(core()).toHaveAttribute("aria-expanded", "true");
    expect(search).not.toHaveBeenCalled();
  });

  it("is neither a tap nor a hold when the finger moves first", () => {
    render(<CosmicCoreNavigation items={items} label="Controls" />);
    pointer(core(), "pointerdown");
    pointer(core(), "pointermove", 90, 20);
    hold(200);
    pointer(core(), "pointerup");
    fireEvent.click(core(), { detail: 1 });
    expect(core()).toHaveAttribute("aria-expanded", "false");
  });
});

describe("a hold", () => {
  it("opens at 180ms, enters the key it is lifted over once, and swallows the click after", () => {
    render(<CosmicCoreNavigation items={items} label="Controls" />);
    pointer(core(), "pointerdown");
    hold(179);
    expect(core()).toHaveAttribute("aria-expanded", "false");
    hold(1);
    expect(core()).toHaveAttribute("aria-expanded", "true");
    under.mockReturnValue(searchKey());
    pointer(core(), "pointermove", 80, 20);
    pointer(core(), "pointerup", 80, 20);
    expect(search).toHaveBeenCalledTimes(1);
    expect(core()).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(core(), { detail: 1 });
    expect(core()).toHaveAttribute("aria-expanded", "false");
  });

  it("enters nothing when lifted over the core or outside the rail", () => {
    render(<CosmicCoreNavigation items={items} label="Controls" />);
    pointer(core(), "pointerdown");
    hold(180);
    under.mockReturnValue(core());
    pointer(core(), "pointerup");
    expect(search).not.toHaveBeenCalled();
    expect(core()).toHaveAttribute("aria-expanded", "false");
  });

  it.each(["pointercancel", "lostpointercapture"])("is cancelled by %s", type => {
    render(<CosmicCoreNavigation items={items} label="Controls" />);
    pointer(core(), "pointerdown");
    hold(180);
    pointer(core(), type);
    expect(core()).toHaveAttribute("aria-expanded", "false");
    expect(search).not.toHaveBeenCalled();
  });

  it("is cancelled by Escape, so lifting afterwards enters nothing", () => {
    render(<CosmicCoreNavigation items={items} label="Controls" />);
    pointer(core(), "pointerdown");
    hold(180);
    under.mockReturnValue(searchKey());
    fireEvent.keyDown(document, { key: "Escape" });
    pointer(core(), "pointerup", 80, 20);
    expect(search).not.toHaveBeenCalled();
    expect(core()).toHaveAttribute("aria-expanded", "false");
  });

  it("is cancelled when the window loses focus, and leaves no timer when removed", () => {
    const { unmount } = render(<CosmicCoreNavigation items={items} label="Controls" />);
    pointer(core(), "pointerdown");
    hold(180);
    fireEvent(window, new Event("blur"));
    expect(core()).toHaveAttribute("aria-expanded", "false");
    pointer(core(), "pointerdown");
    unmount();
    hold(500);
    expect(search).not.toHaveBeenCalled();
  });
});

describe("a navigation under way", () => {
  it("shows on the core while a key's link is pending, and clears when it lands", () => {
    const { rerender } = render(<CosmicCoreNavigation items={items} label="Controls" />);
    expect(core()).toHaveAttribute("aria-busy", "false");
    navigation.pending = true;
    rerender(<CosmicCoreNavigation items={items} label="Controls" />);
    expect(core()).toHaveAttribute("aria-busy", "true");
    navigation.pending = false;
    rerender(<CosmicCoreNavigation items={items} label="Controls" />);
    expect(core()).toHaveAttribute("aria-busy", "false");
  });
});
