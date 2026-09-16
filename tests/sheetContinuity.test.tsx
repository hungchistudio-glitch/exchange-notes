import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import useRetainedWhileClosing from "@/components/foundation/overlays/useRetainedWhileClosing";
import useRevealMotion from "@/components/foundation/overlays/useRevealMotion";

/*
 * The two halves of "a thing leaves the screen intact".
 *
 * A sheet driven by a selection loses its content and its open flag in the
 * same render, and an inline card swapped for a button in a ternary is simply
 * gone on the next frame. Both read as a mis-tap rather than as a dismissal,
 * and both are invisible to a test that only checks what is on screen once
 * everything has settled — which is why they are pinned here.
 */

function Dish({ dish }: { dish: { name: string } | null }) {
  const shown = useRetainedWhileClosing(dish);

  return <p>{shown ? shown.name : "nothing"}</p>;
}

function Card({ open }: { open: boolean }) {
  const reveal = useRevealMotion(open);

  if (!reveal.rendered) return <p>gone</p>;

  return <p data-visible={reveal.visible ? "true" : "false"}>card</p>;
}

describe("what a sheet shows while it is leaving", () => {
  it("keeps the last selection after it is cleared", () => {
    const { rerender } = render(<Dish dish={{ name: "Mapo tofu" }} />);

    expect(screen.getByText("Mapo tofu")).toBeInTheDocument();

    // The reader closed the sheet: the selection is gone, the exit is not.
    rerender(<Dish dish={null} />);

    expect(screen.getByText("Mapo tofu")).toBeInTheDocument();
  });

  it("swaps to the next selection rather than holding the old one", () => {
    const { rerender } = render(<Dish dish={{ name: "Mapo tofu" }} />);

    rerender(<Dish dish={null} />);
    rerender(<Dish dish={{ name: "Dan dan noodles" }} />);

    expect(screen.getByText("Dan dan noodles")).toBeInTheDocument();
    expect(screen.queryByText("Mapo tofu")).not.toBeInTheDocument();
  });

  it("shows nothing before anything has ever been selected", () => {
    render(<Dish dish={null} />);

    expect(screen.getByText("nothing")).toBeInTheDocument();
  });
});

describe("an inline card that opens in place", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function frames() {
    // Two, because the reveal mounts on one and turns visible on the next:
    // doing both in a single commit leaves nothing to transition from.
    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
    });
  }

  it("mounts closed, then turns visible on a later frame", async () => {
    const { rerender } = render(<Card open={false} />);

    expect(screen.getByText("gone")).toBeInTheDocument();

    rerender(<Card open />);
    await frames();

    expect(screen.getByText("card")).toHaveAttribute("data-visible", "true");
  });

  it("stays mounted while it folds away, then leaves", async () => {
    const { rerender } = render(<Card open />);
    await frames();

    rerender(<Card open={false} />);
    await frames();

    // Still there, and no longer visible: this is the exit playing.
    expect(screen.getByText("card")).toHaveAttribute("data-visible", "false");

    await act(async () => {
      vi.advanceTimersByTime(400);
    });

    expect(screen.getByText("gone")).toBeInTheDocument();
  });
});
