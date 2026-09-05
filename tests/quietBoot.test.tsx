import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import SplashGate from "@/components/ui/SplashGate";

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

vi.mock("@/components/launch/activeLaunch", () => ({
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
