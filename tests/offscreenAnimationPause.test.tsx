import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import useInView from "@/hooks/useInView";

/* =========================================================
   Not animating where nobody can see it

   Yumi's mark runs 28 infinite CSS animations. Each is individually cheap —
   nearly all animate transform or opacity — but each also holds a
   compositing layer for as long as it runs, and on the vocabulary page they
   ran the whole time the reader was scrolled down among their words.

   The home stage already did this; the mark, the one with the most
   animations, did not.

   The CSS half (`.stage[data-in-view="false"] * { animation-play-state:
   paused }`) was checked in a browser. This is the wiring: that the flag
   follows the observer, and — more importantly — that it fails towards
   "animates anyway" rather than towards a frozen Yumi.
   ========================================================= */

type ObserverCallback = (entries: { isIntersecting: boolean }[]) => void;

let callbacks: ObserverCallback[] = [];
let disconnected = 0;

function Probe() {
  const { ref, inView } = useInView<HTMLDivElement>();

  return (
    <div ref={ref} data-testid="stage" data-in-view={inView ? "true" : "false"} />
  );
}

function stage() {
  return screen.getByTestId("stage");
}

beforeEach(() => {
  callbacks = [];
  disconnected = 0;

  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(cb: ObserverCallback) {
        callbacks.push(cb);
      }
      observe() {}
      disconnect() {
        disconnected += 1;
      }
      unobserve() {}
      takeRecords() {
        return [];
      }
      root = null;
      rootMargin = "";
      thresholds = [];
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("pausing animation off screen", () => {
  it("starts visible, so nothing is frozen before the observer has reported", () => {
    render(<Probe />);

    expect(stage()).toHaveAttribute("data-in-view", "true");
  });

  it("follows the observer in both directions", () => {
    render(<Probe />);

    act(() => callbacks[0]([{ isIntersecting: false }]));
    expect(stage()).toHaveAttribute("data-in-view", "false");

    act(() => callbacks[0]([{ isIntersecting: true }]));
    expect(stage()).toHaveAttribute("data-in-view", "true");
  });

  it("stops observing when the component goes", () => {
    const view = render(<Probe />);

    view.unmount();

    expect(disconnected).toBe(1);
  });

  it("animates anyway where there is no IntersectionObserver", () => {
    vi.stubGlobal("IntersectionObserver", undefined);

    render(<Probe />);

    // The failure mode has to be a Yumi that moves, never a frozen one.
    expect(stage()).toHaveAttribute("data-in-view", "true");
  });
});
