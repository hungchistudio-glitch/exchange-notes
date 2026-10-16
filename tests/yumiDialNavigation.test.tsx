import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import YumiRingOverlay from "@/components/home/yumi/YumiRingOverlay";
import type { YumiSceneOptions } from "@/lib/yumi3d/scene";
import { setCoachStep, COACH_FINISHED } from "@/lib/home/tutorialCoach";
import { disposeParkedYumiScene } from "@/lib/yumi3d/sceneCache";

const scene = vi.hoisted(() => ({
  create: vi.fn(),
  lungeAt: vi.fn(() => true),
  eye: { x: 180, y: 290 },
  navigate: vi.fn(),
  search: vi.fn(),
  dispose: vi.fn(),
  rotationPaused: vi.fn(),
  pointerDown: vi.fn(), pointerMove: vi.fn(), pointerUp: vi.fn(), pointerCancel: vi.fn(),
}));

vi.mock("@/lib/yumi3d/scene", () => ({ createYumiScene: scene.create }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: scene.navigate }) }));
vi.mock("@/contexts/LexiconSearchContext", () => ({
  useLexiconSearchSheet: () => ({ openSearch: scene.search }),
}));

let options: YumiSceneOptions;
let pendingFrames: FrameRequestCallback[];

function fixture() {
  const click = vi.fn();
  function Home() {
    const stageRef = useRef<HTMLDivElement>(null);
    return (
      <div ref={stageRef} data-testid="stage">
        <YumiRingOverlay
          stageRef={stageRef}
          field={({ onAnswerChange }) => (
            <button onClick={() => onAnswerChange(true)}>Show answer</button>
          )}
        >
          <div data-yumi-figure data-testid="figure" />
          <button data-yumi-cookie onClick={click}>Cookie</button>
        </YumiRingOverlay>
      </div>
    );
  }
  const view = render(<Home />);
  function box(element: Element, x: number, y: number, width: number, height = width) {
    vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
      x, y, left: x, top: y, right: x + width, bottom: y + height, width, height,
      toJSON: () => ({}),
    });
  }
  box(view.container.querySelector("canvas")!, 0, 0, 390, 844);
  box(screen.getByTestId("figure"), 150, 280, 90);
  box(screen.getByRole("button", { name: "Cookie" }), 65, 260, 46);
  return { ...view, click };
}

async function ready() {
  await act(async () => { await vi.dynamicImportSettled(); });
  act(() => { const initial = pendingFrames.splice(0); initial.forEach(frame => frame(performance.now())); });
}

beforeEach(() => {
  vi.useFakeTimers();
  pendingFrames = [];
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    pendingFrames.push(callback);
    return pendingFrames.length;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  scene.lungeAt.mockClear();
  scene.navigate.mockClear();
  scene.search.mockClear();
  scene.dispose.mockClear();
  scene.rotationPaused.mockClear();
  setCoachStep(COACH_FINISHED);
  scene.create.mockClear();
  scene.pointerDown.mockClear(); scene.pointerMove.mockClear(); scene.pointerCancel.mockClear();
  scene.pointerUp.mockReset().mockImplementation(() => options.onTap?.());
  vi.stubGlobal("PointerEvent", class extends MouseEvent {
    readonly pointerId: number;
    readonly isPrimary: boolean;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 1;
      this.isPrimary = init.isPrimary ?? true;
    }
  });
  scene.eye = { x: 180, y: 290 };
  scene.create.mockImplementation((_canvas, incoming: YumiSceneOptions) => {
    options = incoming;
    return {
      setRotationPaused: scene.rotationPaused,
      setFocusLevel: vi.fn(), setScreenAnchor: vi.fn(), frame: vi.fn(),
      eyeScreenPosition: () => scene.eye, lungeAt: scene.lungeAt,
      resize: vi.fn(), dispose: scene.dispose,
      pointerDown: scene.pointerDown, pointerMove: scene.pointerMove, pointerUp: scene.pointerUp, pointerCancel: scene.pointerCancel,
    };
  });
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
});

afterEach(() => {
  cleanup();
  disposeParkedYumiScene();
  vi.useRealTimers();
});

describe("the Yumi dial destination integration", () => {
  it("enables home rotation and pauses it for navigation, search and the tour", async () => {
    fixture(); await ready();
    expect(options.continuousRotation).toBe(true);
    const frame = () => act(() => { const callbacks = pendingFrames.splice(0); callbacks.forEach(callback => callback(performance.now())); });
    frame();
    expect(scene.rotationPaused).toHaveBeenLastCalledWith(false);
    act(() => options.onPullOpen?.()); frame();
    expect(scene.rotationPaused).toHaveBeenLastCalledWith(true);
    act(() => options.onTap?.()); frame();
    expect(scene.rotationPaused).toHaveBeenLastCalledWith(false);
    act(() => setCoachStep(0)); frame();
    expect(scene.rotationPaused).toHaveBeenLastCalledWith(true);
    act(() => setCoachStep(COACH_FINISHED)); frame();
    expect(scene.rotationPaused).toHaveBeenLastCalledWith(false);
    fireEvent.click(screen.getByRole("button", { name: "Show answer" })); frame();
    expect(scene.rotationPaused).toHaveBeenLastCalledWith(true);
  });

  /*
   * Turning the dial only chooses; it never enters. The key brought to the
   * top is entered by a second, ordinary tap on it.
   */
  it.each([
    [2, "/notes"],
    [4, "search"],
  ] as const)("turns destination %s to the top on a drag, then enters it on a tap", async (target, destination) => {
    const view = fixture();
    await ready();
    act(() => options.onPullOpen?.());
    const dial = view.container.querySelector<HTMLElement>("[data-dial]")!;
    vi.spyOn(dial, "getBoundingClientRect").mockReturnValue({ left: 45, top: 190, width: 300, height: 300, right: 345, bottom: 490 } as DOMRect);
    const at = (angle: number) => ({ clientX: 195 + Math.cos(angle) * 132, clientY: 340 + Math.sin(angle) * 132 });
    const top = view.container.querySelector<HTMLButtonElement>("[data-dial-item='0']")!;
    const flushFrames = () => act(() => { for (let i = 0; i < 40 && pendingFrames.length; i++) pendingFrames.splice(0).forEach(frame => frame(performance.now() + 1000)); });
    fireEvent.pointerDown(top, { ...at(-Math.PI / 2), button: 0 });
    // Counter-clockwise, a detent at a time, brings later keys up to the index.
    for (let step = 1; step <= target; step++) {
      fireEvent.pointerMove(top, at(-Math.PI / 2 - step * Math.PI / 4));
      flushFrames();
    }
    fireEvent.pointerUp(top, at(-Math.PI / 2 - target * Math.PI / 4));
    flushFrames();
    fireEvent.click(top, { detail: 1 });
    expect(scene.navigate).not.toHaveBeenCalled();
    expect(scene.search).not.toHaveBeenCalled();
    expect(screen.getByTestId("stage")).toHaveAttribute("data-yumi-mode", "open");

    const chosen = view.container.querySelector<HTMLButtonElement>(`[data-dial-item='${target}']`)!;
    expect(chosen).toHaveAttribute("aria-current", "true");
    fireEvent.pointerDown(chosen, { ...at(-Math.PI / 2), button: 0 });
    fireEvent.pointerUp(chosen, at(-Math.PI / 2));
    fireEvent.click(chosen, { detail: 1 });
    expect(screen.getByTestId("stage")).toHaveAttribute("data-yumi-mode", "rest");
    if (destination === "search") {
      expect(scene.search).toHaveBeenCalledOnce();
      expect(scene.navigate).not.toHaveBeenCalled();
    } else {
      expect(scene.navigate).toHaveBeenCalledExactlyOnceWith(destination);
      expect(scene.search).not.toHaveBeenCalled();
    }
  });

  it("does not let a second finger on the background close a dial mid-turn", async () => {
    const view = fixture(); await ready();
    act(() => options.onPullOpen?.());
    const top = view.container.querySelector<HTMLButtonElement>("[data-dial-item='0']")!;
    fireEvent.pointerDown(top, { clientX: 195, clientY: 208, button: 0 });
    const canvas = view.container.querySelector("canvas")!;
    fireEvent.pointerDown(canvas, { clientX: 30, clientY: 50, pointerId: 2, button: 0 });
    fireEvent.pointerUp(canvas, { clientX: 30, clientY: 50, pointerId: 2 });
    expect(screen.getByTestId("stage")).toHaveAttribute("data-yumi-mode", "open");
  });

  it.each([
    [30, 50], [195, 222], [195, 488], [360, 740],
  ])("closes on a short blank tap at %s,%s without navigating", async (clientX, clientY) => {
    const view = fixture();
    await ready();
    act(() => options.onPullOpen?.());
    scene.eye = { x: 195, y: 354 };
    const canvas = view.container.querySelector("canvas")!;
    fireEvent.pointerDown(canvas, { clientX, clientY, pointerId: 1, button: 0 });
    fireEvent.pointerUp(canvas, { clientX, clientY, pointerId: 1 });
    fireEvent.click(canvas, { detail: 1 });
    expect(screen.getByTestId("stage")).toHaveAttribute("data-yumi-mode", "rest");
    expect(scene.navigate).not.toHaveBeenCalled();
    expect(scene.search).not.toHaveBeenCalled();
    expect(scene.pointerDown).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /^(Home|首頁)$/i })).not.toBeInTheDocument();
  });

  it("keeps the ring open after a background drag, even when the finger returns to its start", async () => {
    const view = fixture(); await ready();
    act(() => options.onPullOpen?.());
    const canvas = view.container.querySelector("canvas")!;
    fireEvent.pointerDown(canvas, { clientX: 30, clientY: 50, pointerId: 1 });
    fireEvent.pointerMove(canvas, { clientX: 80, clientY: 50, pointerId: 1 });
    fireEvent.pointerUp(canvas, { clientX: 30, clientY: 50, pointerId: 1 });
    expect(screen.getByTestId("stage")).toHaveAttribute("data-yumi-mode", "open");
    expect(scene.navigate).not.toHaveBeenCalled();
  });

  it.each(["pointercancel", "lostpointercapture", "blur"])("cancels an interrupted blank tap on %s and accepts the next tap", async type => {
    const view = fixture(); await ready();
    act(() => options.onPullOpen?.());
    const canvas = view.container.querySelector("canvas")!;
    const point = { clientX: 30, clientY: 50, pointerId: 1 };
    fireEvent.pointerDown(canvas, point);
    if (type === "blur") fireEvent.blur(window);
    else fireEvent(canvas, new PointerEvent(type, { ...point, bubbles: true }));
    fireEvent.pointerUp(canvas, point);
    expect(screen.getByTestId("stage")).toHaveAttribute("data-yumi-mode", "open");
    fireEvent.pointerDown(canvas, point);
    fireEvent.pointerUp(canvas, point);
    expect(screen.getByTestId("stage")).toHaveAttribute("data-yumi-mode", "rest");
  });

  it("ignores holds, secondary fingers and outside taps while already home", async () => {
    const view = fixture(); await ready();
    const canvas = view.container.querySelector("canvas")!;
    const point = { clientX: 30, clientY: 50, pointerId: 1 };
    fireEvent.pointerDown(canvas, point); fireEvent.pointerUp(canvas, point);
    expect(screen.getByTestId("stage")).toHaveAttribute("data-yumi-mode", "rest");
    act(() => options.onPullOpen?.());
    fireEvent.pointerDown(canvas, { ...point, isPrimary: false }); fireEvent.pointerUp(canvas, point);
    expect(screen.getByTestId("stage")).toHaveAttribute("data-yumi-mode", "open");
    fireEvent.pointerDown(canvas, point);
    act(() => vi.advanceTimersByTime(600));
    fireEvent.pointerUp(canvas, point);
    expect(screen.getByTestId("stage")).toHaveAttribute("data-yumi-mode", "open");
  });

  it("still closes from Yumi or Escape and preserves an existing search answer", async () => {
    const view = fixture(); await ready();
    fireEvent.click(screen.getByRole("button", { name: "Show answer" }));
    act(() => options.onPullOpen?.());
    const canvas = view.container.querySelector("canvas")!;
    fireEvent.pointerDown(canvas, { clientX: 180, clientY: 290, pointerId: 1 });
    fireEvent.pointerUp(canvas, { clientX: 180, clientY: 290, pointerId: 1 });
    expect(scene.pointerUp).toHaveBeenCalledOnce();
    expect(screen.getByTestId("stage")).toHaveAttribute("data-yumi-mode", "answering");
    act(() => options.onPullOpen?.());
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByTestId("stage")).toHaveAttribute("data-yumi-mode", "answering");
  });

  it("cancels a Yumi pull when capture is lost instead of toggling navigation", async () => {
    const view = fixture(); await ready();
    const canvas = view.container.querySelector("canvas")!;
    const point = { clientX: 180, clientY: 290, pointerId: 1 };
    fireEvent.pointerDown(canvas, point);
    fireEvent(canvas, new PointerEvent("lostpointercapture", { pointerId: 1, bubbles: true }));
    expect(scene.pointerCancel).toHaveBeenCalledOnce();
    expect(scene.pointerMove).not.toHaveBeenCalled();
    expect(scene.pointerUp).not.toHaveBeenCalled();
    expect(screen.getByTestId("stage")).toHaveAttribute("data-yumi-mode", "rest");
  });

  it("does not reopen on a late pointer release after Escape cancels a Yumi pull", async () => {
    const view = fixture(); await ready();
    act(() => options.onPullOpen?.());
    const canvas = view.container.querySelector("canvas")!;
    const point = { clientX: 180, clientY: 290, pointerId: 1 };
    fireEvent.pointerDown(canvas, point);
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.pointerUp(canvas, point);
    expect(scene.pointerCancel).toHaveBeenCalledOnce();
    expect(scene.pointerUp).not.toHaveBeenCalled();
    expect(screen.getByTestId("stage")).toHaveAttribute("data-yumi-mode", "rest");
  });

  /*
   * Opened by a finger, focus stays where it was: handing it to key 01 drew
   * the browser's focus ring and the glass highlight there, so the first key
   * looked chosen before the finger had moved. From the keyboard it still
   * goes in, and comes back to the key it came from.
   */
  it("moves focus into the ring only when the keyboard opened it", async () => {
    const view = fixture();
    await ready();

    act(() => options.onPullOpen?.());
    const first = view.container.querySelector<HTMLButtonElement>("[data-dial-item='0']")!;
    expect(first).not.toHaveFocus();

    act(() => options.onTap?.());
    const key = screen.getByRole("button", { name: /主要導覽|Main navigation|Navigation/i });
    expect(key).not.toHaveFocus();

    fireEvent.click(key);
    expect(first).toHaveFocus();

    act(() => options.onTap?.());
    expect(key).toHaveFocus();
  });

  it("brings focus to the key at the top when an arrow is pressed from outside the dial", async () => {
    const view = fixture(); await ready();
    act(() => options.onPullOpen?.());
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(view.container.querySelector("[data-dial-item='0']")).toHaveFocus();
  });

  it("exposes the menu state and hides closed destinations from assistive technology", async () => {
    const view = fixture(); await ready();
    const key = screen.getByRole("button", { name: /主要導覽|Main navigation|Navigation/i });
    const first = view.container.querySelector<HTMLButtonElement>("[data-dial-item='0']")!;
    const label = first.getAttribute("aria-label")!;
    expect(key).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: label })).not.toBeInTheDocument();
    fireEvent.click(key);
    expect(key).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: label })).toHaveFocus();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(key).toHaveFocus();
    expect(key).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: label })).not.toBeInTheDocument();
  });
  /*
   * Going home used to rebuild her from nothing — renderer, environment,
   * shaders — which measured as a 150–200ms frozen frame on a fast Mac every
   * time. Leaving now parks the scene and coming back takes it again.
   */
  it("keeps the same scene and canvas across a visit to another screen", async () => {
    const first = fixture();
    await ready();
    const canvas = first.container.querySelector("canvas")!;
    vi.spyOn(canvas, "getContext").mockReturnValue({ isContextLost: () => false } as never);
    expect(scene.create).toHaveBeenCalledTimes(1);

    first.unmount();
    expect(scene.dispose).not.toHaveBeenCalled();

    const second = fixture();
    await ready();
    expect(scene.create).toHaveBeenCalledTimes(1);
    expect(second.container.querySelector("canvas")).toBe(canvas);

    /* And the callbacks reach the screen that is mounted now. */
    act(() => options.onTap?.());
    expect(screen.getByTestId("stage")).toHaveAttribute("data-yumi-mode", "open");
  });

  it("builds her again when the parked context was lost", async () => {
    const first = fixture();
    await ready();
    const canvas = first.container.querySelector("canvas")!;
    vi.spyOn(canvas, "getContext").mockReturnValue({ isContextLost: () => true } as never);

    first.unmount();
    fixture();
    await ready();

    expect(scene.dispose).toHaveBeenCalledTimes(1);
    expect(scene.create).toHaveBeenCalledTimes(2);
  });
});
