import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import SplashGate from "@/components/ui/SplashGate";
import { isLaunching } from "@/lib/launchState";

/* =========================================================
   Nothing under the opening animates while it plays

   The opening is a fixed, opaque overlay at z-index 1000, and the whole app
   mounts underneath it: the home stage's nineteen infinite animations, the
   mark's twenty-eight, the wake, the cookie tray — every one of them drawing
   frames behind something nobody can see through, and taking those frames
   from the one animation that is actually on screen. Reported as the opening
   often stuttering.

   The flag is what the CSS keys on. Its lifetime is the whole point: set
   while the overlay is up, gone the moment it is not, and gone on unmount
   too — a flag left behind would freeze the app it was meant to protect.
   ========================================================= */

// Hoisted, because vi.mock's factory is lifted above ordinary consts.
const { OPENING_MS } = vi.hoisted(() => ({ OPENING_MS: 2800 }));

vi.mock("@/components/launch/activeLaunch", () => ({
  ACTIVE_LAUNCH: { id: "test-opening", durationMs: OPENING_MS },
  default: ({ onComplete }: { onComplete?: () => void }) => (
    <button type="button" data-testid="finish" onClick={() => onComplete?.()}>
      opening
    </button>
  ),
}));

function launching() {
  return document.documentElement.dataset.launching;
}

afterEach(() => {
  delete document.documentElement.dataset.launching;
});

describe("the flag that quietens the app under the opening", () => {
  it("is set while the opening is on screen", () => {
    render(<SplashGate />);

    expect(launching()).toBe("true");
  });

  it("is gone the moment the opening finishes", () => {
    const { getByTestId } = render(<SplashGate />);

    act(() => {
      getByTestId("finish").click();
    });

    expect(launching()).toBeUndefined();
  });

  it("tells the route stage the same story", () => {
    // Both signals come from here, and both have to clear together — one is
    // read by CSS, the other by RouteStage, and an opening that is gone must
    // not still be suppressing route transitions.
    const view = render(<SplashGate />);
    expect(isLaunching()).toBe(true);

    view.unmount();

    expect(isLaunching()).toBe(false);
  });

  it("is gone if the opening is unmounted mid-play", () => {
    // A route change, or a sign-out, while the overlay is still up. A flag
    // left behind would pause the app's animations for the rest of the
    // session, which is a worse bug than the one it fixes.
    const view = render(<SplashGate />);
    expect(launching()).toBe("true");

    view.unmount();

    expect(launching()).toBeUndefined();
  });
});

describe("the gate letting go without being told", () => {
  it("opens on its own if the opening never reports finishing", () => {
    /*
     * Reported as the opening getting stuck.
     *
     * Until this the only way out was the animation saying it had finished,
     * so anything that stopped it finishing left an opaque sheet over the
     * whole app for the life of the document. Browsers suspend animations in
     * a backgrounded tab, and opening the app and immediately switching away
     * is an ordinary thing to do.
     */
    vi.useFakeTimers();

    try {
      const { container } = render(<SplashGate />);
      expect(container.querySelector("[data-testid='finish']")).not.toBeNull();

      // Well past the animation, and it has still said nothing.
      act(() => {
        vi.advanceTimersByTime(OPENING_MS + 5000);
      });

      expect(container.querySelector("[data-testid='finish']")).toBeNull();
      expect(isLaunching()).toBe(false);
      expect(launching()).toBeUndefined();
    } finally {
      vi.useRealTimers();
    }
  });

  it("still lets a healthy opening hand over on its own terms", () => {
    vi.useFakeTimers();

    try {
      const { container } = render(<SplashGate />);

      act(() => {
        container
          .querySelector<HTMLButtonElement>("[data-testid='finish']")
          ?.click();
      });

      expect(container.querySelector("[data-testid='finish']")).toBeNull();

      // And the ceiling that never fired does not fire later either.
      act(() => {
        vi.advanceTimersByTime(OPENING_MS + 5000);
      });

      expect(isLaunching()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
