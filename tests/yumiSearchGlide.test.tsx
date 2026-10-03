import { act, cleanup, render, screen } from "@testing-library/react";
import { useRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* =========================================================
   One motion from rest to the search (Chi, 2026-10-02: "一次滑到定位")

   Recorded on an iPhone home-screen app: tapping the field pushed the whole
   screen up, Yumi half off the top, and it took nearly three seconds to come
   back. These pin the three things that replaced that:

   - a tap from a touch screen opens the keyboard on a stand-in that is
     already in view, so iOS has nothing to scroll; the real field takes the
     focus a moment later, with anything typed meanwhile;
   - the field glides up with her, one continuous motion with no jump, and
     lands where the keyboard will leave room for it before the keyboard has
     arrived;
   - mouse focus is left alone.
   ========================================================= */

import YumiRingOverlay, { answerAnchorY } from "@/components/home/yumi/YumiRingOverlay";
import { disposeParkedYumiScene } from "@/lib/yumi3d/sceneCache";

const scene = vi.hoisted(() => ({ create: vi.fn() }));

vi.mock("@/lib/yumi3d/scene", () => ({ createYumiScene: scene.create }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/contexts/LexiconSearchContext", () => ({
  useLexiconSearchSheet: () => ({ openSearch: vi.fn() }),
}));

let frames: FrameRequestCallback[];
let clock = 0;

function fixture(onSubmit: (value: string) => void = vi.fn(), initialValue = "") {
  function Field({ onAnswerChange }: { onAnswerChange: (value: boolean) => void }) {
    const [value, setValue] = useState(initialValue);
    return (
      <form onSubmit={event => { event.preventDefault(); onSubmit(value); }}>
        <input
          aria-label="Search"
          type="text"
          enterKeyHint="search"
          value={value}
          onChange={event => {
            setValue(event.target.value);
            onAnswerChange(Boolean(event.target.value));
          }}
        />
      </form>
    );
  }
  function Home() {
    const stageRef = useRef<HTMLDivElement>(null);
    return (
      <div ref={stageRef} data-testid="stage">
        <YumiRingOverlay
          stageRef={stageRef}
          lines={{ primary: "Yumi is curious.", secondary: "" }}
          field={({ onAnswerChange }) => <Field onAnswerChange={onAnswerChange} />}
        >
          <div data-yumi-figure data-testid="figure" />
        </YumiRingOverlay>
      </div>
    );
  }
  const view = render(<Home />);
  const box = (element: Element, x: number, y: number, width: number, height: number) =>
    vi.spyOn(element, "getBoundingClientRect").mockReturnValue({
      x, y, left: x, top: y, right: x + width, bottom: y + height, width, height,
      toJSON: () => ({}),
    });
  box(view.container.querySelector("canvas")!, 0, 0, 390, 844);
  box(screen.getByTestId("figure"), 123, 283, 144, 144);
  return view;
}

async function ready() {
  await act(async () => { await vi.dynamicImportSettled(); });
}

/** Runs one animation frame, 16ms after the last. */
function frame() {
  clock += 16;
  const pending = frames;
  frames = [];
  act(() => pending.forEach(callback => callback(clock)));
}

function ringY(view: ReturnType<typeof fixture>) {
  const ring = view.container.querySelector<HTMLElement>("[data-yumi-ring]");
  const match = ring?.style.transform.match(/translate\(([-\d.]+)px, ([-\d.]+)px\)/);
  return match ? Number(match[2]) : Number.NaN;
}

function touch(target: Element, type: "touchstart" | "touchend", x = 195, y = 520) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  const point = { identifier: 1, clientX: x, clientY: y, target };
  Object.defineProperty(event, "changedTouches", { value: [point] });
  Object.defineProperty(event, "touches", { value: type === "touchstart" ? [point] : [] });
  act(() => { target.dispatchEvent(event); });
  return event;
}

beforeEach(() => {
  vi.useFakeTimers();
  frames = [];
  clock = 1000;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.push(callback);
    return frames.length;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.stubGlobal("visualViewport", Object.assign(new EventTarget(), { height: 844, offsetTop: 0 }));
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  scene.create.mockImplementation((): Partial<Record<string, unknown>> => ({
    setFocusLevel: vi.fn(), setScreenAnchor: vi.fn(), frame: vi.fn(),
    eyeScreenPosition: () => ({ x: 195, y: 355 }), lungeAt: vi.fn(() => false),
    resize: vi.fn(), dispose: vi.fn(),
    pointerDown: vi.fn(), pointerMove: vi.fn(), pointerUp: vi.fn(), pointerCancel: vi.fn(),
  }));
});

afterEach(() => {
  cleanup();
  disposeParkedYumiScene();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("a tap on the field from a touch screen", () => {
  it("opens the keyboard on a stand-in, then hands the focus and the typing to the field", async () => {
    const view = fixture();
    await ready();
    frame();

    const input = screen.getByRole("textbox", { name: "Search" });
    touch(input, "touchstart");
    const end = touch(input, "touchend");

    // The tap's own focus — the one iOS would scroll into view — is cancelled.
    expect(end.defaultPrevented).toBe(true);
    const proxy = view.container.querySelector<HTMLInputElement>("[data-keyboard-proxy]")!;
    expect(document.activeElement).toBe(proxy);
    // Same keyboard as the field's.
    expect(proxy.getAttribute("enterkeyhint")).toBe("search");
    // The screen is already answering: she and the column are on their way.
    expect(screen.getByTestId("stage")).toHaveAttribute("data-yumi-mode", "answering");

    proxy.value = "ga";
    act(() => vi.advanceTimersByTime(250));

    expect(document.activeElement).toBe(input);
    expect(input).toHaveValue("ga");
    expect(proxy.value).toBe("");
    expect(screen.getByTestId("stage")).toHaveAttribute("data-yumi-mode", "answering");
  });

  it("waits out a composition (注音) instead of cutting it", async () => {
    const view = fixture();
    await ready();
    const input = screen.getByRole("textbox", { name: "Search" });
    touch(input, "touchstart");
    touch(input, "touchend");
    const proxy = view.container.querySelector<HTMLInputElement>("[data-keyboard-proxy]")!;

    act(() => { proxy.dispatchEvent(new Event("compositionstart")); });
    act(() => vi.advanceTimersByTime(400));
    expect(document.activeElement).toBe(proxy);

    proxy.value = "我";
    act(() => { proxy.dispatchEvent(new Event("compositionend")); });
    act(() => vi.advanceTimersByTime(10));
    expect(document.activeElement).toBe(input);
    expect(input).toHaveValue("我");
  });

  it("submits the latest text when Search is pressed during the hand-off", async () => {
    const submit = vi.fn();
    const view = fixture(submit);
    await ready();
    const input = screen.getByRole("textbox", { name: "Search" });
    touch(input, "touchstart");
    touch(input, "touchend");
    const proxy = view.container.querySelector<HTMLInputElement>("[data-keyboard-proxy]")!;
    proxy.value = "bonjour";
    act(() => { proxy.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true })); });
    act(() => vi.runOnlyPendingTimers());
    expect(submit).toHaveBeenCalledWith("bonjour");
  });

  it("preserves edits to an existing query during the hand-off", async () => {
    const view = fixture(undefined, "cats");
    await ready();
    const input = screen.getByRole("textbox", { name: "Search" });
    touch(input, "touchstart");
    touch(input, "touchend");
    const proxy = view.container.querySelector<HTMLInputElement>("[data-keyboard-proxy]")!;
    expect(proxy.value).toBe("cats");
    proxy.value = "cat";
    act(() => vi.advanceTimersByTime(250));
    expect(input).toHaveValue("cat");
  });

  it("leaves a drag across the field alone", async () => {
    fixture();
    await ready();
    const input = screen.getByRole("textbox", { name: "Search" });
    touch(input, "touchstart", 195, 520);
    const move = new Event("touchmove", { bubbles: true });
    Object.defineProperty(move, "changedTouches", { value: [{ identifier: 1, clientX: 195, clientY: 470 }] });
    act(() => { input.dispatchEvent(move); });
    expect(touch(input, "touchend", 195, 470).defaultPrevented).toBe(false);
  });
});

describe("the glide", () => {
  it("takes the field up with her in one motion, to where the keyboard will leave room", async () => {
    const view = fixture();
    await ready();
    frame();
    frame();
    const rest = ringY(view);
    expect(rest).toBeCloseTo(355, 0);

    const input = screen.getByRole("textbox", { name: "Search" });
    touch(input, "touchstart");
    touch(input, "touchend");

    const path = [rest];
    for (let index = 0; index < 60; index += 1) {
      frame();
      path.push(ringY(view));
    }

    // Never back down, and never a jump: the biggest step is the first,
    // an exponential ease, and it is a fraction of the way.
    const steps = path.slice(1).map((y, index) => path[index] - y);
    expect(Math.min(...steps)).toBeGreaterThanOrEqual(-0.5);
    expect(Math.max(...steps)).toBeLessThan((rest - 120) * 0.15);
    // Placed for the keyboard before the keyboard has arrived.
    expect(path.at(-1)).toBeCloseTo(answerAnchorY(844, 844 * 0.56), 0);
    expect(path.at(-1)).toBe(120);
  });

  it("does not drift while a keyboard animates up", async () => {
    const view = fixture();
    await ready();
    frame();
    const input = screen.getByRole("textbox", { name: "Search" });
    touch(input, "touchstart");
    touch(input, "touchend");
    for (let index = 0; index < 80; index += 1) frame();
    const placed = ringY(view);

    // The keyboard rises over ~300ms, reporting a new height every frame.
    const viewport = window.visualViewport as unknown as { height: number };
    const seen: number[] = [];
    for (let height = 844; height >= 470; height -= 20) {
      viewport.height = height;
      frame();
      seen.push(ringY(view));
    }
    for (let index = 0; index < 20; index += 1) {
      frame();
      seen.push(ringY(view));
    }

    expect(Math.max(...seen) - Math.min(...seen)).toBeLessThan(1);
    expect(placed).toBe(120);
  });
});

describe("mouse focus", () => {
  it("is native: no stand-in, no prediction", async () => {
    const view = fixture();
    await ready();
    frame();
    const input = screen.getByRole("textbox", { name: "Search" });
    act(() => input.focus());
    for (let index = 0; index < 60; index += 1) frame();

    expect(document.activeElement).toBe(input);
    expect(ringY(view)).toBeCloseTo(answerAnchorY(844, 844), 0);
  });
});

describe("where she sits", () => {
  it("takes the visible height it is given", () => {
    expect(answerAnchorY(844, 844)).toBeCloseTo(844 * 0.2);
    expect(answerAnchorY(844, 470)).toBe(120);
    expect(answerAnchorY(932, 932 * 0.56)).toBeGreaterThanOrEqual(120);
  });
});
