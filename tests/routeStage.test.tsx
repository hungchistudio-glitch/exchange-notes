import { act, render, screen } from "@testing-library/react";
import { useEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/* =========================================================
   One fade, everywhere inside the signed-in app

   Standard Mode had no route animation at all — navigating between screens
   was an instant swap. Cosmic Mode had six different arrivals, tagged by each
   control and mapped to named keyframes. Both are now the same 240ms fade.

   It is an opacity animation on one element, and the mechanism is the point.
   This was a <ViewTransition> boundary, which is not a fade: the browser
   rasterises the outgoing page, applies the update, rasterises the incoming
   page, and animates those two snapshots in the top layer while the live page
   neither renders nor answers a touch. Standard Mode went from doing none of
   that to doing all of it on every navigation, and the app got heavier.

   The old tests here mocked ViewTransition away, so they proved the boundary
   was in the tree and nothing at all about what it cost. These check the
   animation that actually runs.
   ========================================================= */

const mode = vi.hoisted(() => ({ modeTransition: false as boolean | string }));
const route = vi.hoisted(() => ({ pathname: "/home" }));

vi.mock("@/contexts/InterfaceModeContext", () => ({
  useInterfaceMode: () => ({
    isCosmic: false,
    modeTransition: mode.modeTransition,
  }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => route.pathname,
}));

const RouteStage = (await import("@/components/foundation/layout/RouteStage"))
  .default;
const { setLaunching } = await import("@/lib/launchState");

/*
 * Every fade the stage asked the browser for.
 *
 * The call is what is being checked rather than a running Animation object:
 * jsdom carries a stub `animate` that returns without registering anything,
 * so asking the element what it is animating always answers "nothing".
 */
const fades: KeyframeAnimationOptions[] = [];

/** Every animation the stage asked for. */
function stageAnimations() {
  return fades;
}

beforeEach(() => {
  mode.modeTransition = false;
  route.pathname = "/home";
  setLaunching(false);
  fades.length = 0;

  // jsdom has no Web Animations API at all, so there is nothing to spy on.
  Element.prototype.animate = function animate(
    this: Element,
    _keyframes: unknown,
    options?: number | KeyframeAnimationOptions,
  ) {
    fades.push(options as KeyframeAnimationOptions);
    return { cancel() {}, finished: Promise.resolve() } as unknown as Animation;
  } as Element["animate"];
});

describe("the stage every protected route is played on", () => {
  it("does not animate the first screen of the session", () => {
    /*
     * Arriving is not navigating. Fading in the screen the reader opened the
     * app on would put a fade under the opening animation.
     */
    render(
      <RouteStage>
        <p>a screen</p>
      </RouteStage>,
    );

    expect(stageAnimations()).toHaveLength(0);
    expect(screen.getByText("a screen")).toBeInTheDocument();
  });

  it("fades the page in on a navigation", () => {
    const view = render(
      <RouteStage>
        <p>a screen</p>
      </RouteStage>,
    );

    route.pathname = "/vocabulary";
    view.rerender(
      <RouteStage>
        <p>another screen</p>
      </RouteStage>,
    );

    expect(stageAnimations()).toHaveLength(1);
  });

  it("stays out of the way while the interface mode is changing", () => {
    // The mode sequence is replacing the shell underneath. A route animation
    // running at the same time would be animating over its own replacement.
    const view = render(
      <RouteStage>
        <p>a screen</p>
      </RouteStage>,
    );

    mode.modeTransition = "to-cosmic";
    route.pathname = "/vocabulary";
    view.rerender(
      <RouteStage>
        <p>a screen</p>
      </RouteStage>,
    );

    expect(stageAnimations()).toHaveLength(0);
    // And the page is still rendered — stepping aside must not mean vanishing.
    expect(screen.getByText("a screen")).toBeInTheDocument();
  });

  it("does not animate underneath the opening", () => {
    // Reported as the home screen flashing before the opening appeared.
    setLaunching(true);

    const view = render(
      <RouteStage>
        <p>a screen</p>
      </RouteStage>,
    );

    route.pathname = "/vocabulary";
    view.rerender(
      <RouteStage>
        <p>a screen</p>
      </RouteStage>,
    );

    expect(stageAnimations()).toHaveLength(0);
  });

  it("does not remount the page when the opening hands the screen over", () => {
    /*
     * Reported as the install-prompt card vanishing on reaching Home.
     *
     * An earlier version swapped between a wrapper and bare children — a
     * different element type in the same position, so React unmounted and
     * remounted the whole page the instant the opening finished. Every effect
     * re-ran and every piece of page state reset, 2.8 seconds after load. The
     * install prompt opens on a 1.2s timer and is therefore still behind the
     * overlay at that moment, so it was thrown away exactly as it was handed
     * the screen.
     */
    let mounts = 0;

    function Page() {
      useEffect(() => {
        mounts += 1;
      }, []);

      return <p>a screen</p>;
    }

    setLaunching(true);

    const view = render(
      <RouteStage>
        <Page />
      </RouteStage>,
    );
    expect(mounts).toBe(1);

    act(() => setLaunching(false));
    view.rerender(
      <RouteStage>
        <Page />
      </RouteStage>,
    );

    // The page was never torn down and rebuilt.
    expect(mounts).toBe(1);
  });

  it("gives a reader who asked for less motion no fade at all", () => {
    const original = window.matchMedia;

    window.matchMedia = ((query: string) =>
      ({
        matches: query.includes("prefers-reduced-motion"),
        media: query,
        addEventListener() {},
        removeEventListener() {},
      })) as unknown as typeof window.matchMedia;

    try {
      const view = render(
        <RouteStage>
          <p>a screen</p>
        </RouteStage>,
      );

      route.pathname = "/vocabulary";
      view.rerender(
        <RouteStage>
          <p>a screen</p>
        </RouteStage>,
      );

      expect(stageAnimations()).toHaveLength(0);
    } finally {
      window.matchMedia = original;
    }
  });
});
