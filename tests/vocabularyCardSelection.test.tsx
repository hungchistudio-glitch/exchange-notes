import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import SwipeActionRow from "@/components/foundation/interaction/SwipeActionRow";

/* =========================================================
   A swipeable row must not make its contents unselectable

   Word cards live inside these rows, and a word card wraps its content in
   VocabularySelection so a reader can pick a phrase out of an example
   sentence and save it, or send it to a friend. That whole feature waits on
   a text selection being made inside the card.

   The row set `select-none` unconditionally, and `user-select` inherits, so
   the selection it was waiting for could not be made at all. Nothing else
   re-enabled it anywhere in the tree.

   The row still needs it during a drag — swiping sideways across a sentence
   would otherwise select the sentence — so the rule is "while dragging",
   not "always".
   ========================================================= */

function renderRow() {
  render(
    <SwipeActionRow trailingAction={{ label: "Delete", onAction: () => {} }}>
      <p>card contents</p>
    </SwipeActionRow>,
  );

  return screen.getByText("card contents").parentElement!;
}

describe("selecting text inside a swipeable row", () => {
  it("leaves text selectable at rest", () => {
    expect(renderRow().className).not.toContain("select-none");
  });

  it("suppresses selection while a drag is under way", () => {
    const row = renderRow();

    fireEvent.pointerDown(row, {
      pointerId: 1,
      clientX: 100,
      clientY: 100,
      button: 0,
    });

    expect(row.className).toContain("select-none");
  });

  it("gives selection back once the gesture is over", () => {
    const row = renderRow();

    fireEvent.pointerDown(row, { pointerId: 1, clientX: 100, clientY: 100, button: 0 });
    fireEvent.pointerUp(row, { pointerId: 1, clientX: 100, clientY: 100 });

    expect(row.className).not.toContain("select-none");
  });
});
