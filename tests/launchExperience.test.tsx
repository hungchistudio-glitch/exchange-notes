import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import YumiMinimalLaunch from "@/components/launch/YumiMinimalLaunch";
import { ACTIVE_LAUNCH } from "@/components/launch/activeLaunch";
import {
  YUMI_MINIMAL_DURATION_MS,
  YUMI_MINIMAL_REDUCED_DURATION_MS,
} from "@/components/launch/yumiMinimalTimeline";

/*
 * The opening is driven by requestAnimationFrame, not by timers, so the frames
 * are handed out by this queue rather than advanced by fake timers. Driving it
 * by hand is also what lets a test stop one frame short of the end and check
 * that nothing has fired yet.
 */
/* A real rAF timestamp is milliseconds since navigation start, never zero by
   the time anything has rendered — and the component uses a zero origin as its
   "not started yet" sentinel, so a test that opens at 0 never advances. */
const T0 = 1_000;

function useManualFrames() {
  const pending: FrameRequestCallback[] = [];

  vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    pending.push(cb);
    return pending.length;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {
    pending.length = 0;
  });

  return function frame(at: number) {
    const due = pending.splice(0, pending.length);
    act(() => {
      for (const cb of due) cb(at);
    });
  };
}

function useReducedMotion(reduced: boolean) {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query) =>
      ({
        matches: reduced && query === "(prefers-reduced-motion: reduce)",
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }) as MediaQueryList,
  );
}

describe("active launch experience", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("exposes one versioned switch point for production and review", () => {
    expect(ACTIVE_LAUNCH.id).toBe("yumi-minimal-v1");
    expect(ACTIVE_LAUNCH.durationMs).toBe(YUMI_MINIMAL_DURATION_MS);
    expect(ACTIVE_LAUNCH.Component).toBe(YumiMinimalLaunch);
  });

  it("renders as decoration, and hands the screen over when it ends", () => {
    useReducedMotion(false);
    const frame = useManualFrames();
    const onComplete = vi.fn();

    const { container } = render(
      <YumiMinimalLaunch launchId="test-launch" onComplete={onComplete} />,
    );

    const launch = container.firstElementChild;
    expect(launch).toHaveAttribute("data-launch-id", "test-launch");
    // The page beneath is already titled; this is a film, not a landmark.
    expect(launch).toHaveAttribute("aria-hidden", "true");

    frame(T0);
    frame(T0 + YUMI_MINIMAL_DURATION_MS - 1);
    expect(onComplete).not.toHaveBeenCalled();

    frame(T0 + YUMI_MINIMAL_DURATION_MS);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("gets out of the way sooner when motion is reduced", () => {
    useReducedMotion(true);
    const frame = useManualFrames();
    const onComplete = vi.fn();

    render(<YumiMinimalLaunch launchId="test-launch" onComplete={onComplete} />);

    frame(T0);
    frame(T0 + YUMI_MINIMAL_REDUCED_DURATION_MS - 1);
    expect(onComplete).not.toHaveBeenCalled();

    frame(T0 + YUMI_MINIMAL_REDUCED_DURATION_MS);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("drops the pending completion callback when it is unmounted", () => {
    useReducedMotion(false);
    const frame = useManualFrames();
    const onComplete = vi.fn();

    const { unmount } = render(
      <YumiMinimalLaunch launchId="test-launch" onComplete={onComplete} />,
    );

    frame(T0);
    unmount();
    frame(T0 + YUMI_MINIMAL_DURATION_MS);

    expect(onComplete).not.toHaveBeenCalled();
  });
});
