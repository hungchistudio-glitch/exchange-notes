import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import BottomSheet from "@/components/foundation/overlays/BottomSheet";

/*
 * What aria-modal="true" was promising and nothing was keeping.
 *
 * The panel declared itself modal, and Tab walked straight out of it into the
 * page underneath; closing left focus wherever it had got to rather than on
 * the control that opened the sheet. None of that shows up in a snapshot, and
 * all of it is what makes a sheet feel like a surface rather than a picture
 * of one.
 *
 * The sheet mounts on a frame and reveals on the next, so every open and
 * close here is followed by `frames()`. Real rAF, faked timers: the entrance
 * needs the frames to be real and the exit's 380ms to be skippable.
 */

function panel() {
  return screen.getByRole("dialog");
}

async function frames() {
  await act(async () => {
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  });
}

async function settle() {
  await frames();
  await act(async () => {
    vi.advanceTimersByTime(500);
  });
  await frames();
}

function inertBackground() {
  return Array.from(document.body.children).filter((child) =>
    child.hasAttribute("inert"),
  );
}

describe("a sheet while it is open", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  });

  afterEach(async () => {
    vi.useRealTimers();
  });

  it("takes focus itself rather than raising a keyboard", () => {
    render(
      <BottomSheet open onClose={vi.fn()} title="Pick a list">
        <input aria-label="New list" />
      </BottomSheet>,
    );

    expect(panel()).toHaveFocus();
    expect(screen.getByRole("textbox", { name: "New list" })).not.toHaveFocus();
  });

  it("leaves focus where the sheet put it", () => {
    render(
      <BottomSheet open onClose={vi.fn()} title="Write a note">
        <input aria-label="Note" autoFocus />
      </BottomSheet>,
    );

    // A sheet that asks for its own field gets to keep it.
    expect(screen.getByRole("textbox", { name: "Note" })).toHaveFocus();
  });

  it("makes everything behind it inert, and gives it back on close", async () => {
    const { rerender, unmount } = render(
      <BottomSheet open onClose={vi.fn()} title="Pick a list">
        <button type="button">Save</button>
      </BottomSheet>,
    );

    const behind = inertBackground();
    expect(behind.length).toBeGreaterThan(0);
    expect(behind.some((child) => child.contains(panel()))).toBe(false);

    rerender(
      <BottomSheet open={false} onClose={vi.fn()} title="Pick a list">
        <button type="button">Save</button>
      </BottomSheet>,
    );
    await settle();

    expect(inertBackground()).toHaveLength(0);

    unmount();
  });

  it("returns focus to whatever opened it", async () => {
    function Host({ open }: { open: boolean }) {
      return (
        <>
          <button type="button">Open list picker</button>
          <BottomSheet open={open} onClose={vi.fn()} title="Pick a list">
            <button type="button">Save</button>
          </BottomSheet>
        </>
      );
    }

    const { rerender, unmount } = render(<Host open={false} />);

    const opener = screen.getByRole("button", { name: "Open list picker" });
    act(() => opener.focus());
    expect(opener).toHaveFocus();

    rerender(<Host open />);
    await frames();
    expect(panel()).toHaveFocus();

    rerender(<Host open={false} />);
    await settle();

    expect(opener).toHaveFocus();

    unmount();
  });

  it("wraps Tab from the last control back to the first", () => {
    const { unmount } = render(
      <BottomSheet open onClose={vi.fn()} title="Pick a list">
        <button type="button">Save</button>
      </BottomSheet>,
    );

    const stops = Array.from(
      panel().querySelectorAll<HTMLElement>("button, a[href], input"),
    );
    expect(stops.length).toBeGreaterThan(1);

    const last = stops[stops.length - 1];
    act(() => last.focus());

    fireEvent.keyDown(window, { key: "Tab" });

    // Round to the front of the sheet, never out of it.
    expect(document.activeElement).toBe(stops[0]);

    // And backwards off the front lands on the back.
    act(() => stops[0].focus());
    fireEvent.keyDown(window, { key: "Tab", shiftKey: true });

    expect(document.activeElement).toBe(last);

    unmount();
  });
});
