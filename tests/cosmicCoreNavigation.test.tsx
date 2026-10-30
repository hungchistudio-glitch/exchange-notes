import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import CosmicCoreNavigation from "@/components/foundation/layout/CosmicCoreNavigation";

/* =========================================================
   Cosmic mode's core and its rail

   The disclosure (inert while closed, Escape and an outside tap close it
   and hand focus back to the core), real links that navigate in the click,
   a route change that closes without remounting, the precision design by
   default, and the arc that turns to the key in reach.
   ========================================================= */

vi.mock("@/components/foundation/layout/NavPendingHint", () => ({ default: () => null }));

const items = [
  { href: "/home", label: "Home", icon: <span>H</span>, active: true },
  { href: "/messages", label: "Messages", icon: <span>M</span>, badgeCount: 3 },
  { label: "Search", icon: <span>S</span>, onSelect: vi.fn() },
];

const core = (name = "Controls") => screen.getByRole("button", { name });
const rail = () => screen.getByRole("navigation", { hidden: true });
const dock = () => core().parentElement!;
const label = () => dock().querySelector<HTMLElement>("[data-visible]")!;

afterEach(() => vi.restoreAllMocks());

describe("the disclosure", () => {
  it("keeps the closed rail inert, opens on a tap, and Escape closes it with focus back on the core", () => {
    render(<CosmicCoreNavigation items={items} label="Controls" />);
    expect(rail()).toHaveAttribute("inert");
    fireEvent.click(core());
    expect(rail()).not.toHaveAttribute("inert");
    screen.getByRole("link", { name: "Messages" }).focus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(core()).toHaveAttribute("aria-expanded", "false");
    expect(core()).toHaveFocus();
  });

  it("closes on a tap outside, and keeps real links and their badges", () => {
    render(<CosmicCoreNavigation items={items} label="Controls" />);
    fireEvent.click(core());
    expect(screen.getByRole("link", { name: "Messages" })).toHaveAttribute("href", "/messages");
    expect(screen.getByText("3")).toBeVisible();
    fireEvent.pointerDown(document.body);
    expect(core()).toHaveAttribute("aria-expanded", "false");
  });

  it("runs search once, in the click, and closes without navigating", () => {
    const search = vi.fn();
    render(<CosmicCoreNavigation items={[...items.slice(0, 2), { ...items[2], onSelect: search }]} label="Controls" />);
    fireEvent.click(core());
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(search).toHaveBeenCalledTimes(1);
    expect(core()).toHaveAttribute("aria-expanded", "false");
  });

  it("starts closing on a destination's click without cancelling its navigation", () => {
    render(<CosmicCoreNavigation items={items} label="Controls" />);
    fireEvent.click(core());
    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    fireEvent(screen.getByRole("link", { name: "Messages" }), click);
    expect(click.defaultPrevented).toBe(false);
    expect(core()).toHaveAttribute("aria-expanded", "false");
    expect(rail()).toHaveAttribute("inert");
  });

  it("stays open for a click that opens a new tab", () => {
    render(<CosmicCoreNavigation items={items} label="Controls" />);
    fireEvent.click(core());
    fireEvent.click(screen.getByRole("link", { name: "Messages" }), { metaKey: true });
    expect(core()).toHaveAttribute("aria-expanded", "true");
  });

  it("closes on a new route without remounting, in the new language", () => {
    const { rerender } = render(<CosmicCoreNavigation routeKey="/home" items={items} label="Controls" />);
    const before = core();
    fireEvent.click(before);
    rerender(
      <CosmicCoreNavigation
        routeKey="/messages"
        items={items.map(item => ({ ...item, label: item.label === "Home" ? "首頁" : item.label }))}
        label="控制列"
      />,
    );
    expect(core("控制列")).toBe(before);
    expect(core("控制列")).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(core("控制列"));
    expect(screen.getByRole("link", { name: "首頁" })).toBeVisible();
  });
});

describe("the precision design", () => {
  it("is the default, and the review's comparison keeps the rail as it was", () => {
    const { rerender } = render(<CosmicCoreNavigation items={items} label="Controls" />);
    expect(dock()).toHaveAttribute("data-design", "precision");
    fireEvent.click(core());
    rerender(<CosmicCoreNavigation items={items} label="Controls" design="original" />);
    expect(dock()).toHaveAttribute("data-design", "original");
    rerender(<CosmicCoreNavigation items={items} label="Controls" design="precision" />);
    expect(core()).toHaveAttribute("aria-expanded", "true");
  });

  it("names the key in reach over the rail, for the eye only", () => {
    render(<CosmicCoreNavigation items={items} label="Controls" />);
    fireEvent.click(core());
    expect(label()).toHaveAttribute("aria-hidden", "true");
    expect(label()).toHaveAttribute("data-visible", "true");
    fireEvent.pointerEnter(screen.getByRole("link", { name: "Messages" }));
    expect(label()).toHaveTextContent("Messages");
    fireEvent.pointerLeave(screen.getByRole("link", { name: "Messages" }));
    expect(label()).toHaveTextContent("Home");
    fireEvent.focus(screen.getByRole("button", { name: "Search" }));
    expect(label()).toHaveTextContent("Search");
    // Nothing on the dock is a live region: crossing keys is not announced.
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("turns the arc to the key in reach, and back to rest on the side it came from", () => {
    // Core at (200, 800); keys across a rail above it, at y = 720.
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
      const index = this.dataset.coreItem;
      const box = index === undefined
        ? { left: 173, top: 773, width: 54, height: 54 }
        : { left: 120 + Number(index) * 80 - 22, top: 698, width: 44, height: 44 };
      return { ...box, right: box.left + box.width, bottom: box.top + box.height, x: box.left, y: box.top, toJSON() {} } as DOMRect;
    });
    render(<CosmicCoreNavigation items={items} label="Controls" />);
    const turn = () => dock().style.getPropertyValue("--arc-turn");
    expect(turn()).toBe("180deg");
    fireEvent.click(core());
    // Home is the active key: 80px left of the core and 80px up, so -45deg.
    expect(turn()).toBe("-45deg");
    fireEvent.pointerEnter(screen.getByRole("button", { name: "Search" }));
    expect(turn()).toBe("45deg");
    fireEvent.pointerDown(document.body);
    expect(turn()).toBe("180deg");
  });

  it("renders its keys without React warnings", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<CosmicCoreNavigation items={items} label="Controls" />);
    fireEvent.click(core());
    expect(error).not.toHaveBeenCalled();
  });
});
