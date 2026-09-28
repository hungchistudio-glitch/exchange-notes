import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import YumiRingOverlay from "@/components/home/yumi/YumiRingOverlay";
import type { YumiSceneOptions } from "@/lib/yumi3d/scene";

const scene = vi.hoisted(() => ({
  create: vi.fn(),
  lungeAt: vi.fn(() => true),
  eye: { x: 180, y: 290 },
  navigate: vi.fn(),
  search: vi.fn(),
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
  scene.eye = { x: 180, y: 290 };
  scene.create.mockImplementation((_canvas, incoming: YumiSceneOptions) => {
    options = incoming;
    return {
      setFocusLevel: vi.fn(), setScreenAnchor: vi.fn(), frame: vi.fn(),
      eyeScreenPosition: () => scene.eye, lungeAt: scene.lungeAt,
      resize: vi.fn(), dispose: vi.fn(),
    };
  });
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("the liquid ring destination integration", () => {
  it.each([
    [2, "/notes"],
    [4, "search"],
  ] as const)("routes a released orbit gesture to destination %s", async (target, destination) => {
    const view = fixture();
    await ready();
    act(() => options.onPullOpen?.());
    const buttons = Array.from(view.container.querySelectorAll<HTMLButtonElement>("[data-liquid-option]"));
    const point = (index: number) => {
      const angle = -Math.PI / 2 + Math.PI / 8 + index * Math.PI / 4;
      return { clientX: 195 + Math.cos(angle) * 132, clientY: 340 + Math.sin(angle) * 132 };
    };
    buttons.forEach((button, index) => {
      const { clientX: x, clientY: y } = point(index);
      const box = { left: x - 31, top: y - 31, right: x + 31, bottom: y + 31, width: 62, height: 62 } as DOMRect;
      vi.spyOn(button, "getBoundingClientRect").mockReturnValue(box);
      vi.spyOn(button.querySelector("[data-liquid-disc]")!, "getBoundingClientRect").mockReturnValue(box);
    });
    vi.stubGlobal("PointerEvent", MouseEvent);
    fireEvent.pointerDown(buttons[0], { ...point(0), button: 0 });
    fireEvent.pointerMove(buttons[0], point(target));
    fireEvent.pointerUp(buttons[0], point(target));
    expect(scene.navigate).not.toHaveBeenCalled();
    expect(scene.search).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(300));
    expect(screen.getByTestId("stage")).toHaveAttribute("data-yumi-mode", "rest");
    if (destination === "search") {
      expect(scene.search).toHaveBeenCalledOnce();
      expect(scene.navigate).not.toHaveBeenCalled();
    } else {
      expect(scene.navigate).toHaveBeenCalledExactlyOnceWith(destination);
      expect(scene.search).not.toHaveBeenCalled();
    }
  });

});
