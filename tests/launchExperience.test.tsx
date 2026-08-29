import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ExchangeNotesLaunch, {
  REDUCED_MOTION_HOLD_MS,
} from "@/components/launch/ExchangeNotesLaunch";
import YumiMinimalLaunch from "@/components/launch/YumiMinimalLaunch";
import { ACTIVE_LAUNCH } from "@/components/launch/activeLaunch";
import { YUMI_MINIMAL_DURATION_MS } from "@/components/launch/yumiMinimalTimeline";

const REDUCED_EXIT_MS = 16;

function useReducedMotion() {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query) =>
      ({
        matches: query === "(prefers-reduced-motion: reduce)",
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
  beforeEach(() => {
    vi.useFakeTimers();
    useReducedMotion();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("exposes one versioned switch point for production and review", () => {
    expect(ACTIVE_LAUNCH.id).toBe("yumi-minimal-v1");
    expect(ACTIVE_LAUNCH.durationMs).toBe(YUMI_MINIMAL_DURATION_MS);
    expect(ACTIVE_LAUNCH.Component).toBe(YumiMinimalLaunch);
  });

  it("briefly shows the resolved frame for reduced motion, then unmounts", () => {
    const onComplete = vi.fn();
    const { container } = render(
      <ExchangeNotesLaunch
        launchId="test-launch"
        onComplete={onComplete}
      />,
    );

    const launch = container.firstElementChild;
    expect(launch).toHaveAttribute("data-launch-id", "test-launch");
    expect(launch).toHaveAttribute("aria-hidden", "true");
    expect(launch).not.toHaveAttribute("role");

    act(() => {
      vi.advanceTimersByTime(REDUCED_MOTION_HOLD_MS - 1);
    });
    expect(onComplete).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(launch).toHaveAttribute("data-exiting");
    expect(launch).toHaveAttribute("data-paused");

    act(() => {
      vi.advanceTimersByTime(REDUCED_EXIT_MS);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(container.firstElementChild).toBeNull();
  });

  it("clears the pending completion callback when it is unmounted", () => {
    const onComplete = vi.fn();
    const { unmount } = render(
      <ExchangeNotesLaunch
        launchId="test-launch"
        onComplete={onComplete}
      />,
    );

    act(() => {
      vi.advanceTimersByTime(REDUCED_MOTION_HOLD_MS);
    });
    unmount();

    act(() => {
      vi.advanceTimersByTime(REDUCED_EXIT_MS);
    });
    expect(onComplete).not.toHaveBeenCalled();
  });
});
