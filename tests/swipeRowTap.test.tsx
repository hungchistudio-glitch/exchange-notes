import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import SwipeActionRow from "@/components/foundation/interaction/SwipeActionRow";

/* =========================================================
   A tap is not a swipe, and a finger is not a mouse

   Every swipeable row in the app — a word card, a friend, a conversation —
   suppresses the click that follows a drag, so that swiping a row open does
   not also open the row. The threshold for "this was a drag" was four
   pixels, and four pixels is a still finger, not a tap: a thumb landing on a
   card in a scrolling list wanders five to fifteen pixels between contact
   and release without meaning anything by it.

   So the first tap on a word card was routinely thrown away and the second
   one — made more carefully, because the first appeared to do nothing — got
   through. That is the whole of "the cards need tapping twice".
   ========================================================= */

function tap(element: Element, driftX = 0) {
  fireEvent.pointerDown(element, {
    pointerId: 1,
    clientX: 100,
    clientY: 100,
    button: 0,
  });

  if (driftX !== 0) {
    fireEvent.pointerMove(element, {
      pointerId: 1,
      clientX: 100 + driftX,
      clientY: 100,
    });
  }

  fireEvent.pointerUp(element, {
    pointerId: 1,
    clientX: 100 + driftX,
    clientY: 100,
  });

  // `detail` is what separates a pointer's click from a keyboard's.
  fireEvent.click(element, { detail: 1 });
}

function renderRow(onClick: () => void) {
  const { unmount } = render(
    <SwipeActionRow
      trailingAction={{ label: "Delete", onAction: () => {} }}
      leadingAction={{ label: "Collect", onAction: () => {} }}
    >
      <button type="button" onClick={onClick}>
        the row
      </button>
    </SwipeActionRow>,
  );

  return { row: screen.getByRole("button", { name: "the row" }), unmount };
}

describe("tapping a swipeable row", () => {
  it("opens on the first tap however much the finger drifts", () => {
    for (const drift of [0, 3, 6, 9]) {
      const onClick = vi.fn();
      const { row, unmount } = renderRow(onClick);

      tap(row, drift);

      expect(onClick, `a tap that drifted ${drift}px`).toHaveBeenCalledTimes(1);
      unmount();
    }
  });

  it("still swallows the click that ends a real swipe", () => {
    const onClick = vi.fn();
    const { row } = renderRow(onClick);

    tap(row, 60);

    expect(onClick).not.toHaveBeenCalled();
  });

  /*
   * The suppression used to be cleared only by the next pointer-down, so a
   * swipe that ended without a click left it armed and something else paid
   * for it later.
   */
  it("suppresses one click, not every click after a swipe", () => {
    const onClick = vi.fn();
    const { row } = renderRow(onClick);

    tap(row, 60);
    tap(row);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("never suppresses a keyboard-driven click", () => {
    const onClick = vi.fn();
    const { row } = renderRow(onClick);

    // A swipe, with no click of its own — the pointer left the row.
    fireEvent.pointerDown(row, { pointerId: 1, clientX: 100, clientY: 100, button: 0 });
    fireEvent.pointerMove(row, { pointerId: 1, clientX: 40, clientY: 100 });
    fireEvent.pointerCancel(row, { pointerId: 1, clientX: 40, clientY: 100 });

    // Enter on the focused control inside the row. detail 0, no pointer.
    fireEvent.click(row, { detail: 0 });

    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
