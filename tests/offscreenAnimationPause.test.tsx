import { readFileSync } from "node:fs";

import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import useInView from "@/hooks/useInView";

/* =========================================================
   Not animating where nobody can see it

   The app draws a lot of decoration with infinite CSS animations — about a
   hundred and fifty of them, 28 in Yumi's mark alone. Each is individually
   cheap and nearly all animate transform or opacity, but each also advances a
   compositing layer on every frame for as long as it runs, and they ran
   whether or not anyone could see them.

   The mark and the home stage did this first, each with its own copy of the
   rule in its own stylesheet — which is exactly how the mark came to pause
   itself while the feeding face and cookie tray beside it kept going. There
   is one rule now, in globals.css, and every animated region opts into it.

   The CSS half was checked in a browser: eight animations running, eight
   paused, eight running again. This is the wiring — that the flag follows the
   observer, and, more importantly, that it fails towards "animates anyway"
   rather than towards a frozen Yumi.
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

  it("defines what data-in-view means exactly once", () => {
    /*
     * The rule used to be copied into each stylesheet that wanted it, so a
     * region was only paused if someone had remembered to write it there
     * too. One definition, in globals.css, reaches every marked region and
     * everything inside it — including animations declared in a completely
     * different stylesheet, which is how Yumi's shared motion classes are
     * covered without naming them anywhere.
     */
    const globals = readFileSync("app/globals.css", "utf8");

    expect(globals).toContain('[data-in-view="false"]');
    expect(globals).toContain("animation-play-state: paused !important;");
  });
});
