import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import YumiMinimalLaunch from "@/components/launch/YumiMinimalLaunch";
import { ACTIVE_LAUNCH } from "@/components/launch/activeLaunch";
import {
  YUMI_MINIMAL_DURATION_MS,
  YUMI_MINIMAL_REDUCED_DURATION_MS,
} from "@/components/launch/yumiMinimalTimeline";

/*
 * The opening is handed to the browser as composited transform and opacity
 * animations rather than driven a frame at a time from JavaScript — it plays
 * while the app is booting, and a main-thread animation loses that contest.
 *
 * jsdom has no Web Animations API, so the test supplies one it can drive: it
 * records what was asked for and hands back a `finished` the test decides
 * when to settle.
 */
type FakeAnimation = {
  options: KeyframeAnimationOptions;
  cancelled: boolean;
  finish: () => void;
};

function useFakeAnimations() {
  const created: FakeAnimation[] = [];

  Element.prototype.animate = function animate(
    this: Element,
    _keyframes: unknown,
    options?: number | KeyframeAnimationOptions,
  ) {
    let settle: () => void = () => {};
    const finished = new Promise<void>((resolve) => {
      settle = resolve;
    });

    const record: FakeAnimation = {
      options: options as KeyframeAnimationOptions,
      cancelled: false,
      finish: settle,
    };
    created.push(record);

    return {
      finished,
      cancel() {
        record.cancelled = true;
      },
    } as unknown as Animation;
  } as Element["animate"];

  return created;
}

/** Settles every animation and lets the completion callback run. */
async function finishAll(animations: FakeAnimation[]) {
  await act(async () => {
    for (const animation of animations) animation.finish();
    await Promise.resolve();
  });
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

  it("renders as decoration, and hands the screen over when it ends", async () => {
    useReducedMotion(false);
    const animations = useFakeAnimations();
    const onComplete = vi.fn();

    const { container } = render(
      <YumiMinimalLaunch launchId="test-launch" onComplete={onComplete} />,
    );

    const launch = container.firstElementChild;
    expect(launch).toHaveAttribute("data-launch-id", "test-launch");
    // The page beneath is already titled; this is a film, not a landmark.
    expect(launch).toHaveAttribute("aria-hidden", "true");

    // One per animated element, all on the same clock.
    expect(animations.length).toBeGreaterThan(1);
    for (const animation of animations) {
      expect(animation.options.duration).toBe(YUMI_MINIMAL_DURATION_MS);
    }

    expect(onComplete).not.toHaveBeenCalled();

    await finishAll(animations);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("gets out of the way sooner when motion is reduced", async () => {
    useReducedMotion(true);
    const animations = useFakeAnimations();
    const onComplete = vi.fn();

    render(<YumiMinimalLaunch launchId="test-launch" onComplete={onComplete} />);

    for (const animation of animations) {
      expect(animation.options.duration).toBe(
        YUMI_MINIMAL_REDUCED_DURATION_MS,
      );
    }

    expect(onComplete).not.toHaveBeenCalled();

    await finishAll(animations);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("drops the pending completion callback when it is unmounted", async () => {
    useReducedMotion(false);
    const animations = useFakeAnimations();
    const onComplete = vi.fn();

    const { unmount } = render(
      <YumiMinimalLaunch launchId="test-launch" onComplete={onComplete} />,
    );

    unmount();

    // Every animation is stopped, and a late settle changes nothing.
    expect(animations.every((animation) => animation.cancelled)).toBe(true);

    await finishAll(animations);
    expect(onComplete).not.toHaveBeenCalled();
  });
});
