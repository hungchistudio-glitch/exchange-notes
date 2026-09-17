import { act, render } from "@testing-library/react";
import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import SplashGate, {
  LAUNCH_REPLAY_AFTER_MS,
  LAUNCH_SESSION_KEY,
  ageLaunchMarker,
  forgetLaunchMarker,
} from "@/components/ui/SplashGate";
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

/* =========================================================
   The opening plays once per stretch of use, not once per session

   The obvious marker is a boolean — played, do not play again — and it
   shipped once and was taken out, because in an installed PWA it is the
   wrong unit. iOS keeps a web app's session alive across backgrounding, so
   the flag survived the app being closed and reopened: the opening played
   exactly once ever and was silently skipped for the life of the install,
   which is the opposite of what an opening is for.

   So the marker is a timestamp, refreshed for as long as the reader is
   here. What the gate asks on a new document is "how long were they away",
   and the two tests that matter most below are the ones that cover a stamp
   written by an older build and a stamp written by a clock that has since
   been moved back — both of which have to mean "play it".
   ========================================================= */

function markerAgedBy(milliseconds: number) {
  window.sessionStorage.setItem(
    LAUNCH_SESSION_KEY,
    `${Date.now() - milliseconds}`,
  );
}

function markerAgeMs() {
  return Date.now() - Number(window.sessionStorage.getItem(LAUNCH_SESSION_KEY));
}

/**
 * jsdom's visibilityState is a read-only prototype getter that always answers
 * "visible". Shadowing it with an own property and then removing that property
 * leaves the prototype's untouched, so this needs no restore of its own.
 */
function withVisibility(state: DocumentVisibilityState, body: () => void) {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state,
  });
  try {
    body();
  } finally {
    Reflect.deleteProperty(document, "visibilityState");
  }
}

describe("the opening's replay window", () => {
  it("goes straight in when the app was in use a moment ago", () => {
    const first = render(<SplashGate />);

    act(() => first.getByTestId("finish").click());
    first.unmount();

    const next = render(<SplashGate />);

    expect(next.queryByTestId("finish")).toBeNull();
    expect(isLaunching()).toBe(false);
    expect(launching()).toBeUndefined();
  });

  it("goes straight in for a return inside the window", () => {
    markerAgedBy(LAUNCH_REPLAY_AFTER_MS - 60_000);

    expect(render(<SplashGate />).queryByTestId("finish")).toBeNull();
  });

  it("plays again once the app has been away longer than the window", () => {
    markerAgedBy(LAUNCH_REPLAY_AFTER_MS + 1000);

    const view = render(<SplashGate />);

    expect(view.queryByTestId("finish")).not.toBeNull();
    expect(launching()).toBe("true");
  });

  it("stamps the marker when the reader leaves the document", () => {
    const view = render(<SplashGate />);
    act(() => view.getByTestId("finish").click());

    markerAgedBy(LAUNCH_REPLAY_AFTER_MS + 1000);
    act(() => {
      window.dispatchEvent(new Event("pagehide"));
    });

    expect(markerAgeMs()).toBeLessThan(1000);
  });

  it("stamps the marker when the app is backgrounded", () => {
    const view = render(<SplashGate />);
    act(() => view.getByTestId("finish").click());

    markerAgedBy(LAUNCH_REPLAY_AFTER_MS + 1000);
    withVisibility("hidden", () => {
      act(() => {
        document.dispatchEvent(new Event("visibilitychange"));
      });
    });

    expect(markerAgeMs()).toBeLessThan(1000);
  });

  /*
   * The case that makes this a leaving stamp rather than a use stamp.
   *
   * iOS keeps an installed web app's document alive across backgrounding, so
   * coming back after an afternoon away fires visibilitychange on a document
   * that never stopped running. Stamping "now" there would quietly declare
   * the reader present, and the reload that eventually arrives would find a
   * marker seconds old and skip an opening that was thoroughly due.
   */
  it("does not stamp the marker when the reader comes back", () => {
    const view = render(<SplashGate />);
    act(() => view.getByTestId("finish").click());

    markerAgedBy(LAUNCH_REPLAY_AFTER_MS + 1000);
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(markerAgeMs()).toBeGreaterThan(LAUNCH_REPLAY_AFTER_MS);

    view.unmount();
    expect(render(<SplashGate />).queryByTestId("finish")).not.toBeNull();
  });

  /*
   * The review harness at /launch-review/session asks for a replay and then
   * reloads — and a reload is a way out of the document, which is when the
   * gate stamps. Without the request suspending that stamp the harness
   * overwrites its own request on the way out and can never replay anything.
   */
  it.each([
    ["forgetting the marker", forgetLaunchMarker],
    ["ageing the marker past the window", () => ageLaunchMarker(LAUNCH_REPLAY_AFTER_MS + 1000)],
  ])("survives the leaving stamp when a replay is requested by %s", (_label, request) => {
    const view = render(<SplashGate />);
    act(() => view.getByTestId("finish").click());

    act(() => request());
    act(() => {
      window.dispatchEvent(new Event("pagehide"));
    });
    view.unmount();

    const replay = render(<SplashGate />);
    expect(replay.queryByTestId("finish")).not.toBeNull();
    expect(launching()).toBe("true");
  });

  it("spends the replay request once the opening is given", () => {
    forgetLaunchMarker();
    const replay = render(<SplashGate />);
    expect(replay.queryByTestId("finish")).not.toBeNull();

    act(() => replay.getByTestId("finish").click());
    markerAgedBy(LAUNCH_REPLAY_AFTER_MS + 1000);
    act(() => {
      window.dispatchEvent(new Event("pagehide"));
    });

    expect(markerAgeMs()).toBeLessThan(1000);
  });

  it("stops refreshing the marker once it has been unmounted", () => {
    const view = render(<SplashGate />);
    act(() => view.getByTestId("finish").click());
    view.unmount();

    markerAgedBy(LAUNCH_REPLAY_AFTER_MS + 1000);
    window.dispatchEvent(new Event("pagehide"));

    expect(render(<SplashGate />).queryByTestId("finish")).not.toBeNull();
  });

  it("plays again when the tab session has no marker", () => {
    const first = render(<SplashGate />);
    act(() => first.getByTestId("finish").click());
    first.unmount();

    // A fresh tab has its own empty session storage.
    window.sessionStorage.clear();
    const nextSession = render(<SplashGate />);
    expect(nextSession.queryByTestId("finish")).not.toBeNull();
    expect(isLaunching()).toBe(true);
  });

  it("ignores the boolean marker an earlier build wrote", () => {
    window.sessionStorage.setItem(LAUNCH_SESSION_KEY, "complete");

    expect(render(<SplashGate />).queryByTestId("finish")).not.toBeNull();
  });

  it("plays again when the clock has moved backwards under the marker", () => {
    markerAgedBy(-60_000);

    expect(render(<SplashGate />).queryByTestId("finish")).not.toBeNull();
  });

  it("does not treat a different opening version as completed", () => {
    window.sessionStorage.setItem(
      "exchange-notes:launch:previous-opening",
      `${Date.now()}`,
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

  it("hides a recently seen SSR opening before hydration and hydrates cleanly", async () => {
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

  /*
   * The parser script and seenRecently() are two implementations of one
   * decision, in two languages, and only one of them is reachable from a
   * test that renders. Running the script against a marker the gate would
   * replay is the only thing that catches them disagreeing — which would
   * show up as the opening being hidden for a document that then plays it.
   */
  it("reaches the same verdict in the parser script as in the gate", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);

    for (const marker of [
      `${Date.now() - LAUNCH_REPLAY_AFTER_MS - 1000}`,
      `${Date.now() + 60_000}`,
      "complete",
      "",
    ]) {
      window.sessionStorage.setItem(LAUNCH_SESSION_KEY, marker);
      container.innerHTML = renderToString(<SplashGate />);
      window.eval(container.querySelector("script")!.textContent!);

      expect(container.firstElementChild, marker).not.toHaveAttribute("hidden");
    }

    container.remove();
  });
});
