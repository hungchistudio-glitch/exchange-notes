import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import BottomSheet from "@/components/foundation/overlays/BottomSheet";

/*
 * What a drag costs.
 *
 * The sheet's position under the finger used to be React state, set on every
 * pointermove. A finger on a phone produces those at up to 120Hz, so dragging
 * a sheet re-rendered everything inside it a hundred-odd times a second — for
 * a settings sheet, every choice card; for the vocabulary detail, the whole
 * card — to move one element by a few pixels.
 *
 * It is a custom property written straight onto the panel now. This holds
 * that: the contents render once for the gesture, and the transform still
 * follows the finger.
 */

/*
 * jsdom implements none of the pointer-capture API, and the sheet takes the
 * capture as the first thing it does on pointerdown — so without these the
 * drag never starts and this file would pass by testing nothing.
 */
beforeAll(() => {
  Object.assign(HTMLElement.prototype, {
    setPointerCapture: () => undefined,
    releasePointerCapture: () => undefined,
    hasPointerCapture: () => true,
  });
});

function Counted({ onRender }: { onRender: () => void }) {
  onRender();
  return <p>Sheet contents</p>;
}

function Harness({ onRender }: { onRender: () => void }) {
  return (
    <BottomSheet open onClose={() => undefined} title="Daily goal">
      <Counted onRender={onRender} />
    </BottomSheet>
  );
}

function drag(handle: HTMLElement, from: number, to: number) {
  fireEvent.pointerDown(handle, { pointerId: 1, clientY: from, isPrimary: true });

  for (let y = from; y <= to; y += 8) {
    fireEvent.pointerMove(handle, { pointerId: 1, clientY: y });
  }
}

describe("dragging a sheet", () => {
  it("moves the panel without re-rendering what is inside it", () => {
    const onRender = vi.fn();
    render(<Harness onRender={onRender} />);

    const panel = screen.getByRole("dialog");
    const handle = screen.getByText("Daily goal").closest("header")!;

    const beforeDrag = onRender.mock.calls.length;
    drag(handle, 100, 220);

    /*
     * One render for the gesture at most: `dragging` flips to true, and that
     * is a real state change several things read. The sixteen pointermoves
     * in between contribute nothing.
     */
    expect(onRender.mock.calls.length - beforeDrag).toBeLessThanOrEqual(1);

    // And the panel actually followed the finger.
    expect(panel.style.getPropertyValue("--sheet-drag-y")).not.toBe("");
    expect(
      Number.parseFloat(panel.style.getPropertyValue("--sheet-drag-y")),
    ).toBeGreaterThan(0);
  });

  it("puts the panel back where the stylesheet wants it when the finger lifts", () => {
    render(<Harness onRender={() => undefined} />);

    const panel = screen.getByRole("dialog");
    const handle = screen.getByText("Daily goal").closest("header")!;

    drag(handle, 100, 140);
    expect(panel.style.getPropertyValue("--sheet-drag-y")).not.toBe("");

    fireEvent.pointerUp(handle, { pointerId: 1, clientY: 140 });

    // Cleared rather than set to zero: the resting value is the stylesheet's.
    expect(panel.style.getPropertyValue("--sheet-drag-y")).toBe("");
  });
});
