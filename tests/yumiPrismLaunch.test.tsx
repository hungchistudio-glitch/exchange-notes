import { StrictMode } from "react";
import { act, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import YumiPrismLaunch from "@/components/launch/YumiPrismLaunch";
import {
  YUMI_PRISM_DURATION_MS,
  YUMI_PRISM_REDUCED_DURATION_MS,
} from "@/components/launch/yumiPrismTimeline";

const originalAnimate = Object.getOwnPropertyDescriptor(Element.prototype, "animate");

type ControlledAnimation = {
  duration: number | undefined;
  cancelled: boolean;
  finish: () => void;
};

// jsdom has no animation engine. These promises model completion and the
// rejection on cancellation, including StrictMode's setup/cleanup/setup cycle.
function installAnimations(throwAt?: number) {
  const created: ControlledAnimation[] = [];
  let calls = 0;
  Object.defineProperty(Element.prototype, "animate", {
    configurable: true,
    writable: true,
    value: (_frames: Keyframe[], options: KeyframeAnimationOptions) => {
      calls += 1;
      if (calls === throwAt) throw new Error("Animation setup failed");
      let resolve!: () => void;
      let reject!: (error: Error) => void;
      const finished = new Promise<void>((onResolve, onReject) => {
        resolve = onResolve;
        reject = onReject;
      });
      const record: ControlledAnimation = {
        duration: Number(options.duration),
        cancelled: false,
        finish: resolve,
      };
      created.push(record);
      return {
        finished,
        cancel() {
          record.cancelled = true;
          reject(new DOMException("Animation cancelled", "AbortError"));
        },
      } as unknown as Animation;
    },
  });
  return created;
}

function disableAnimations() {
  Object.defineProperty(Element.prototype, "animate", {
    configurable: true,
    writable: true,
    value: undefined,
  });
}

async function finishAnimations(animations: ControlledAnimation[]) {
  await act(async () => {
    for (const animation of animations) animation.finish();
  });
}

afterEach(() => {
  if (originalAnimate) {
    Object.defineProperty(Element.prototype, "animate", originalAnimate);
  } else {
    Reflect.deleteProperty(Element.prototype, "animate");
  }
  vi.useRealTimers();
});

describe("Prism production opening", () => {
  it("shows a readable static brand and hands over within 650ms without WAAPI", () => {
    vi.useFakeTimers();
    disableAnimations();
    const onComplete = vi.fn();
    const { container } = render(<YumiPrismLaunch launchId="fallback" onComplete={onComplete} />);
    const root = container.firstElementChild as HTMLElement;

    expect(root.style.getPropertyValue("--actor-opacity")).toBe("1");
    expect(root.style.getPropertyValue("--wordmark-opacity")).toBe("1");
    expect(root.style.getPropertyValue("--scene-opacity")).toBe("1");
    expect(onComplete).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(650));
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(root.style.getPropertyValue("--scene-opacity")).toBe("0");
  });

  it("cancels a partially created film and uses the short static fallback", async () => {
    vi.useFakeTimers();
    const animations = installAnimations(3);
    const onComplete = vi.fn();
    const { container } = render(<YumiPrismLaunch launchId="partial" onComplete={onComplete} />);

    expect(animations).toHaveLength(2);
    expect(animations.every(animation => animation.cancelled)).toBe(true);
    expect((container.firstElementChild as HTMLElement).style.getPropertyValue("--wordmark-opacity")).toBe("1");
    await act(async () => vi.advanceTimersByTime(650));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("finishes only once after all tracks end and preserves the final frame", async () => {
    vi.useFakeTimers();
    const animations = installAnimations();
    const onComplete = vi.fn();
    const { container } = render(<YumiPrismLaunch launchId="normal" onComplete={onComplete} />);
    expect(animations.length).toBeGreaterThan(1);
    expect(animations.every(animation => animation.duration === YUMI_PRISM_DURATION_MS)).toBe(true);

    await finishAnimations(animations.slice(0, -1));
    expect(onComplete).not.toHaveBeenCalled();
    await finishAnimations(animations.slice(-1));
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect((container.firstElementChild as HTMLElement).style.getPropertyValue("--scene-opacity")).toBe("0");

    act(() => vi.advanceTimersByTime(10000));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("survives StrictMode cancellation without ending the replacement film early", async () => {
    const animations = installAnimations();
    const onComplete = vi.fn();
    render(<StrictMode><YumiPrismLaunch launchId="strict" onComplete={onComplete} /></StrictMode>);
    const cancelled = animations.filter(animation => animation.cancelled);
    const running = animations.filter(animation => !animation.cancelled);
    expect(cancelled.length).toBeGreaterThan(0);
    expect(running.length).toBeGreaterThan(0);

    await finishAnimations(cancelled);
    expect(onComplete).not.toHaveBeenCalled();
    await finishAnimations(running);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("cancels on unmount and ignores late completion or safety timers", async () => {
    vi.useFakeTimers();
    const animations = installAnimations();
    const onComplete = vi.fn();
    const { unmount } = render(<YumiPrismLaunch launchId="unmount" onComplete={onComplete} />);
    unmount();
    expect(animations.every(animation => animation.cancelled)).toBe(true);
    await finishAnimations(animations);
    act(() => vi.advanceTimersByTime(10000));
    expect(onComplete).not.toHaveBeenCalled();
  });

  it("uses the latest handoff callback without restarting the film", async () => {
    const animations = installAnimations();
    const oldComplete = vi.fn();
    const latestComplete = vi.fn();
    const view = render(<YumiPrismLaunch launchId="callback" onComplete={oldComplete} />);
    const trackCount = animations.length;
    view.rerender(<YumiPrismLaunch launchId="callback" onComplete={latestComplete} />);
    expect(animations).toHaveLength(trackCount);
    await finishAnimations(animations);
    expect(oldComplete).not.toHaveBeenCalled();
    expect(latestComplete).toHaveBeenCalledTimes(1);
  });

  it("runs the reduced-motion version on its shorter clock", async () => {
    const animations = installAnimations();
    const onComplete = vi.fn();
    const { container } = render(<YumiPrismLaunch launchId="reduced" forceReducedMotion onComplete={onComplete} />);
    expect(container.firstElementChild).toHaveAttribute("data-reduced-motion", "true");
    expect(animations.every(animation => animation.duration === YUMI_PRISM_REDUCED_DURATION_MS)).toBe(true);
    await finishAnimations(animations);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("offers an accessible skip and releases even when tracks never finish", () => {
    vi.useFakeTimers();
    const animations = installAnimations();
    const onComplete = vi.fn();
    const { getByRole } = render(<YumiPrismLaunch launchId="skip" onComplete={onComplete} />);
    fireEvent.click(getByRole("button", { name: /略過/ }));
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(animations.every(animation => animation.cancelled)).toBe(true);
    act(() => vi.advanceTimersByTime(10000));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it("releases a stalled film automatically without a completion promise", async () => {
    vi.useFakeTimers();
    installAnimations();
    const onComplete = vi.fn();
    render(<YumiPrismLaunch launchId="stalled" onComplete={onComplete} />);
    act(() => vi.advanceTimersByTime(YUMI_PRISM_DURATION_MS));
    expect(onComplete).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTime(250));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
