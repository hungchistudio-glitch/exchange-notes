import { readFileSync } from "node:fs";

import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import BottomNavigation from "@/components/foundation/layout/BottomNavigation";

// jsdom has no layout. Supply the measured boxes, then deliver resize
// notifications only to observers subscribed to the element that changed.
const originalResizeObserver = globalThis.ResizeObserver;
const observers = new Set<MeasuredResizeObserver>();
let dockRect: DOMRect;
let keyRects: Record<string, DOMRect>;

class MeasuredResizeObserver {
  targets = new Set<Element>();

  constructor(private callback: ResizeObserverCallback) {
    observers.add(this);
  }

  observe(target: Element) { this.targets.add(target); }
  unobserve(target: Element) { this.targets.delete(target); }
  disconnect() {
    this.targets.clear();
    observers.delete(this);
  }

  notify(target: Element) {
    if (!this.targets.has(target)) return;
    this.callback(
      [{ target } as ResizeObserverEntry],
      this as unknown as ResizeObserver,
    );
  }
}

function rect(left: number, top: number, width: number, height: number) {
  return new DOMRect(left, top, width, height);
}

function resize(target: Element) {
  act(() => {
    for (const observer of observers) observer.notify(target);
  });
}

function navigation(active = "Settings", labels = ["Home", "Settings"]) {
  return (
    <BottomNavigation
      label="Main navigation"
      items={labels.map((label) => ({
        label,
        icon: <span aria-hidden="true">◯</span>,
        active: label === active,
        onSelect: () => {},
      }))}
    />
  );
}

function elements() {
  const dock = screen.getByRole("navigation").firstElementChild!;
  const indicator = dock.querySelector<HTMLElement>(":scope > [aria-hidden='true']")!;
  return { dock, indicator };
}

beforeEach(() => {
  dockRect = rect(40, 900, 600, 70);
  keyRects = {
    Home: rect(50, 909, 290, 52),
    Settings: rect(340, 909, 290, 52),
  };
  globalThis.ResizeObserver = MeasuredResizeObserver;
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
    this: HTMLElement,
  ) {
    return keyRects[this.getAttribute("aria-label") ?? ""] ?? dockRect;
  });
});

afterEach(() => {
  globalThis.ResizeObserver = originalResizeObserver;
  vi.restoreAllMocks();
  observers.clear();
});

describe("bottom navigation indicator", () => {
  it("stays centred on the selected key when the dock shrinks without a tab change", () => {
    render(navigation());
    const { dock, indicator } = elements();
    expect(indicator.style.transform).toBe("translate(145px, 0px)");

    dockRect = rect(20, 700, 350, 70);
    keyRects.Settings = rect(195, 709, 165, 52);
    resize(dock);

    expect(indicator.style.transform).toBe("translate(82.5px, 0px)");
    expect(screen.getByRole("button", { name: "Settings" })).toBeVisible();
  });

  it("remeasures when the selected key changes size inside the same dock", () => {
    render(navigation());
    const { indicator } = elements();

    keyRects.Settings = rect(340, 909, 250, 52);
    resize(screen.getByRole("button", { name: "Settings" }));

    expect(indicator.style.transform).toBe("translate(125px, 0px)");
  });

  /*
   * Every key is keyed by its own label, so translating the dock replaces all
   * six nodes while the index and the count stay exactly where they were. The
   * measurement has to follow the new node: an observer still pointed at the
   * detached one hears nothing for the rest of the session, and the circle
   * stops following the dock from the next rotation onwards.
   */
  it("follows the selected key to a new node when the labels are translated", () => {
    const { rerender } = render(navigation());
    const staleObserver = [...observers][0];

    keyRects["設定"] = rect(340, 909, 250, 52);
    rerender(navigation("設定", ["首頁", "設定"]));

    expect(staleObserver.targets.size).toBe(0);
    expect(elements().indicator.style.transform).toBe("translate(125px, 0px)");

    keyRects["設定"] = rect(340, 909, 290, 52);
    resize(screen.getByRole("button", { name: "設定" }));

    expect(elements().indicator.style.transform).toBe("translate(145px, 0px)");
  });

  /*
   * jsdom has no layout, so this cannot measure a key. What it can hold is
   * the reason the keys were shrinking: both of the dock's paddings were rem,
   * so a reader on a larger text size spent the width the six 1fr columns
   * divide, and on a 320pt phone a key went from 43.7pt to 34.3pt as the text
   * grew. A rem-scaled padding utility here is that regression coming back.
   */
  it("measures its own padding in pixels rather than in text", () => {
    render(navigation());
    const nav = screen.getByRole("navigation");
    const dock = nav.firstElementChild!;

    expect(nav.className).toContain("px-[16px]");
    expect(dock.className).toContain("p-[var(--dock-padding)]");

    for (const element of [nav, dock]) {
      expect(element.className).not.toMatch(/(?:^|\s)-?p[xlr]?-\d/);
    }
  });

  /*
   * The half of that invariant the class name cannot carry.
   *
   * The dock's box is built from custom properties now, so the message
   * composer can clear it without recomputing its height by hand. That moves
   * the value out of the class and into app/globals.css — where a rem would
   * bring the shrinking keys straight back, and no class-name assertion would
   * notice. So the stylesheet is read and the parts are checked directly.
   *
   * --dock-lift is deliberately not in this list: it is the breathing room
   * under the dock rather than any part of a target, and it is allowed to
   * grow with the text.
   */
  it("builds that padding out of fixed lengths, not text-relative ones", () => {
    const css = readFileSync("app/globals.css", "utf8");

    for (const name of ["--dock-key-size", "--dock-padding", "--dock-border"]) {
      const declared = new RegExp(`${name}:\\s*([^;]+);`).exec(css)?.[1]?.trim();

      expect(declared, `${name} is not declared in app/globals.css`).toBeDefined();
      expect(declared).toMatch(/^\d+(?:\.\d+)?px$/);
    }
  });

  it("disconnects old observers on selection changes and unmount", () => {
    const { rerender, unmount } = render(navigation());
    const oldObserver = [...observers][0];

    rerender(navigation("Home"));

    expect(oldObserver.targets.size).toBe(0);
    expect(observers.size).toBe(1);
    expect(elements().indicator.style.transform).toBe("translate(-145px, 0px)");

    unmount();
    expect(observers.size).toBe(0);
  });
});
