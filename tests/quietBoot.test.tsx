import { act, render } from "@testing-library/react";
import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

beforeEach(() => {
  window.sessionStorage.clear();
});

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

  it("prevents focus in the covered app and restores it on completion", () => {
    const view = render(
      <>
        <main data-app-viewport>
          <button type="button">App action</button>
        </main>
        <SplashGate />
      </>,
    );
    const viewport = view.container.querySelector("[data-app-viewport]");
    expect(viewport).toHaveAttribute("inert");

    act(() => view.getByTestId("finish").click());
    expect(viewport).not.toHaveAttribute("inert");
  });

  it.each([null, "already-inert"])(
    "restores the prior inert attribute %s after an interrupted opening",
    (priorInert) => {
      const viewport = document.createElement("main");
      viewport.dataset.appViewport = "";
      if (priorInert !== null) viewport.setAttribute("inert", priorInert);
      document.body.appendChild(viewport);

      const view = render(<SplashGate />);
      expect(viewport).toHaveAttribute("inert");
      view.unmount();

      expect(viewport.getAttribute("inert")).toBe(priorInert);
      viewport.remove();
    },
  );
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

describe("one completed opening per tab session", () => {
  it("skips later mounts only after the opening completes", () => {
    const first = render(<SplashGate />);

    act(() => first.getByTestId("finish").click());
    first.unmount();

    const next = render(<SplashGate />);

    expect(next.queryByTestId("finish")).toBeNull();
    expect(isLaunching()).toBe(false);
    expect(launching()).toBeUndefined();
  });

  it("plays again when the tab session has no completion marker", () => {
    const first = render(<SplashGate />);
    act(() => first.getByTestId("finish").click());
    first.unmount();

    // A fresh tab has its own empty session storage.
    window.sessionStorage.clear();
    const nextSession = render(<SplashGate />);
    expect(nextSession.queryByTestId("finish")).not.toBeNull();
    expect(isLaunching()).toBe(true);
  });

  it("does not treat a different opening version as completed", () => {
    window.sessionStorage.setItem(
      "exchange-notes:launch:previous-opening",
      "complete",
    );

    const current = render(<SplashGate />);
    expect(current.queryByTestId("finish")).not.toBeNull();
  });

  it("retries after an interrupted mount, including Strict Mode replay", () => {
    const interrupted = render(
      <StrictMode>
        <SplashGate />
      </StrictMode>,
    );
    expect(interrupted.queryByTestId("finish")).not.toBeNull();
    interrupted.unmount();

    const retry = render(<SplashGate />);
    expect(retry.queryByTestId("finish")).not.toBeNull();
    expect(launching()).toBe("true");
  });

  it("also remembers an opening released by the fallback deadline", () => {
    vi.useFakeTimers();
    try {
      const stalled = render(<SplashGate />);
      act(() => vi.advanceTimersByTime(OPENING_MS + 5000));
      stalled.unmount();

      const next = render(<SplashGate />);
      expect(next.queryByTestId("finish")).toBeNull();
      expect(isLaunching()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("still plays and exits if access to session storage throws", () => {
    vi.spyOn(window, "sessionStorage", "get").mockImplementation(() => {
      throw new DOMException("Storage blocked", "SecurityError");
    });

    const view = render(<SplashGate />);
    expect(view.queryByTestId("finish")).not.toBeNull();
    act(() => view.getByTestId("finish").click());
    expect(view.queryByTestId("finish")).toBeNull();
    expect(isLaunching()).toBe(false);
    expect(launching()).toBeUndefined();
  });

  it("releases the app when storage can be read but not written", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Storage full", "QuotaExceededError");
    });

    const view = render(<SplashGate />);
    act(() => view.getByTestId("finish").click());
    expect(view.queryByTestId("finish")).toBeNull();
    expect(isLaunching()).toBe(false);
  });

  it("hides a completed SSR opening before hydration and hydrates cleanly", async () => {
    const first = render(<SplashGate />);
    act(() => first.getByTestId("finish").click());
    first.unmount();

    const container = document.createElement("div");
    document.body.appendChild(container);
    container.innerHTML = renderToString(<SplashGate />);

    // Execute the emitted parser script independently of React. This is the
    // protection while a slow connection is still downloading hydration JS.
    const parserScript = container.querySelector("script");
    expect(parserScript).not.toBeNull();
    window.eval(parserScript!.textContent!);
    expect(container.firstElementChild).toHaveAttribute("hidden");

    const onRecoverableError = vi.fn();
    let root: ReturnType<typeof hydrateRoot>;
    await act(async () => {
      root = hydrateRoot(container, <SplashGate />, { onRecoverableError });
    });

    expect(container).toBeEmptyDOMElement();
    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(isLaunching()).toBe(false);
    expect(launching()).toBeUndefined();

    act(() => root.unmount());
    container.remove();
  });
});
