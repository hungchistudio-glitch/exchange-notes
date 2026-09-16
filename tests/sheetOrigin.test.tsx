import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import BottomSheet from "@/components/foundation/overlays/BottomSheet";

/*
 * Where a sheet grows from.
 *
 * jsdom measures everything as zero, and the whole feature is a measurement —
 * so the boxes are stubbed here. What is actually being pinned is the
 * decision made from them: an origin that can be seen is used, one that has
 * gone or scrolled off screen is not, and the sheet is never left believing
 * in a point the reader cannot see.
 */

const PANEL = { left: 0, top: 200, width: 400, height: 500 };

function rect(box: { left: number; top: number; width: number; height: number }) {
  return {
    ...box,
    right: box.left + box.width,
    bottom: box.top + box.height,
    x: box.left,
    y: box.top,
    toJSON: () => box,
  } as DOMRect;
}

/** Panels measure as PANEL; anything tagged data-test-box uses its own. */
function stubBoxes() {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
    function (this: Element) {
      const box = this.getAttribute("data-test-box");
      if (box) return rect(JSON.parse(box));
      if (this.getAttribute("role") === "dialog") return rect(PANEL);
      return rect({ left: 0, top: 0, width: 0, height: 0 });
    },
  );
}

async function frames() {
  await act(async () => {
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  });
}

function panel() {
  return screen.getByRole("dialog");
}

function Host({ open, box }: { open: boolean; box?: string }) {
  return (
    <>
      <button type="button" data-test-box={box}>
        Open list picker
      </button>
      <BottomSheet open={open} onClose={vi.fn()} title="Pick a list">
        <button type="button">Save</button>
      </BottomSheet>
    </>
  );
}

describe("a sheet opened from a control", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    stubBoxes();
    Object.defineProperty(window, "innerHeight", {
      configurable: true,
      value: 800,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("grows out of the row that was tapped", async () => {
    // A 320-wide row, halfway down an 800-tall screen.
    const box = JSON.stringify({ left: 40, top: 400, width: 320, height: 60 });
    const { rerender, unmount } = render(<Host open={false} box={box} />);

    fireEvent.pointerDown(
      screen.getByRole("button", { name: "Open list picker" }),
    );

    rerender(<Host open box={box} />);
    await frames();

    const style = panel().style;

    expect(panel()).toHaveAttribute("data-origin", "true");
    // Row centre (200, 430) against panel centre (200, 450).
    expect(style.getPropertyValue("--sheet-from-x").trim()).toBe("0px");
    expect(style.getPropertyValue("--sheet-from-y").trim()).toBe("-20px");
    // 320 / 400, inside the 0.42–0.92 bounds.
    expect(style.getPropertyValue("--sheet-from-scale").trim()).toBe("0.8");

    unmount();
  });

  it("floors the scale so a small button does not smear the sheet", async () => {
    const box = JSON.stringify({ left: 10, top: 300, width: 36, height: 36 });
    const { rerender, unmount } = render(<Host open={false} box={box} />);

    fireEvent.pointerDown(
      screen.getByRole("button", { name: "Open list picker" }),
    );
    rerender(<Host open box={box} />);
    await frames();

    // 36 / 400 is 0.09; the floor holds it at 0.42.
    expect(panel().style.getPropertyValue("--sheet-from-scale").trim()).toBe(
      "0.42",
    );

    unmount();
  });

  it("rises the ordinary way when the control has scrolled off screen", async () => {
    // Above the viewport: bottom is negative.
    const box = JSON.stringify({ left: 40, top: -200, width: 320, height: 60 });
    const { rerender, unmount } = render(<Host open={false} box={box} />);

    fireEvent.pointerDown(
      screen.getByRole("button", { name: "Open list picker" }),
    );
    rerender(<Host open box={box} />);
    await frames();

    expect(panel()).not.toHaveAttribute("data-origin");

    unmount();
  });

  it("gives focus back to the tapped control when nothing was focused", async () => {
    // A tap on iOS does not focus the button, so `document.activeElement` is
    // the document — which is the same as having nowhere to send focus back.
    const box = JSON.stringify({ left: 40, top: 400, width: 320, height: 60 });
    const { rerender, unmount } = render(<Host open={false} box={box} />);

    const opener = screen.getByRole("button", { name: "Open list picker" });
    expect(document.activeElement).toBe(document.body);

    fireEvent.pointerDown(opener);
    rerender(<Host open box={box} />);
    await frames();

    expect(panel()).toHaveFocus();

    rerender(<Host open={false} box={box} />);
    // The exit schedules its unmount from inside a frame, so the frame has to
    // run before the clock is worth advancing.
    await frames();
    await act(async () => {
      vi.advanceTimersByTime(500);
    });

    expect(opener).toHaveFocus();

    unmount();
  });

  it("rises the ordinary way when nothing was tapped", async () => {
    const { rerender, unmount } = render(<Host open={false} />);

    // No pointerdown, and the untagged button measures as a zero box.
    rerender(<Host open />);
    await frames();

    expect(panel()).not.toHaveAttribute("data-origin");

    unmount();
  });
});
