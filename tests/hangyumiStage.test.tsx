import { act, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import HangyumiStage from "@/components/hangyumi/HangyumiStage";
import { LIQUID_EVENT, type LiquidFlowRequest } from "@/lib/starweaver/liquid";

/* =========================================================
   When the GPU takes the studio's canvas back

   An iPhone after a long while in the background, or memory running
   short, can lose the WebGL context. The studio must not sit blank: the
   flat drawing stands in, and when the context comes back the studio is
   built again in the pose the round has reached. jsdom has no WebGL, so
   the studio itself is a stub that records what it is asked.
   ========================================================= */

type Built = {
  set: ReturnType<typeof vi.fn>; dispose: ReturnType<typeof vi.fn>; present: ReturnType<typeof vi.fn>;
  rest: (lowered: boolean) => void;
};
const studio = vi.hoisted(() => ({
  create: vi.fn(),
  built: [] as Built[],
}));

vi.mock("@/lib/hangyumi/studio", () => ({
  createHangyumiStudio: studio.create.mockImplementation(
    (_canvas: HTMLCanvasElement, options: { onArrived?: (lowered: boolean) => void }) => {
      const one = { set: vi.fn(), dispose: vi.fn(), present: vi.fn(), rest: (lowered: boolean) => options.onArrived?.(lowered) };
      studio.built.push(one);
      return one;
    },
  ),
}));

afterEach(() => {
  studio.create.mockClear();
  studio.built.length = 0;
});

const sweeps = () => {
  const requests: LiquidFlowRequest[] = [];
  const onFlow = (event: Event) => requests.push((event as CustomEvent<LiquidFlowRequest>).detail);
  window.addEventListener(LIQUID_EVENT, onFlow);
  return { requests, stop: () => window.removeEventListener(LIQUID_EVENT, onFlow) };
};

describe("the studio's canvas", () => {
  it("shows the flat drawing while the context is lost and rebuilds the studio when it returns", async () => {
    const { container, rerender } = render(<HangyumiStage misses={1} status="playing" outfit={null} dealt onArrived={() => {}} label="studio" />);
    const stage = container.querySelector("[role=img]")!;
    await waitFor(() => expect(stage).toHaveAttribute("data-live", "true"));
    expect(stage.querySelector("svg")).toBeNull();

    const lost = new Event("webglcontextlost", { cancelable: true });
    act(() => { container.querySelector("canvas")!.dispatchEvent(lost); });
    // Asked the browser for the context back, and stood the drawing in.
    expect(lost.defaultPrevented).toBe(true);
    expect(stage).toHaveAttribute("data-live", "false");
    expect(stage.querySelector("svg")).not.toBeNull();

    // The round moves on while the studio is away.
    rerender(<HangyumiStage misses={2} status="playing" outfit={null} dealt onArrived={() => {}} label="studio" />);

    act(() => { container.querySelector("canvas")!.dispatchEvent(new Event("webglcontextrestored")); });
    expect(studio.create).toHaveBeenCalledTimes(2);
    expect(studio.built[0].dispose).toHaveBeenCalled();
    expect(studio.built[1].set).toHaveBeenLastCalledWith({ misses: 2, status: "playing", outfit: null });
    expect(stage).toHaveAttribute("data-live", "true");
    expect(stage.querySelector("svg")).toBeNull();
  });
});

/* The page comes in on the first line (Chi, 2026-11-11): once it has come
   to rest and the word is dealt, a honey-gold sweep and the keys. */
describe("the way in", () => {
  it("waits for the line and the deal, then sweeps once in Hangyumi's colours", async () => {
    const arrived = vi.fn();
    const { requests, stop } = sweeps();
    const { container, rerender } = render(
      <HangyumiStage misses={0} status="playing" outfit={null} dealt={false} onArrived={arrived} label="studio" />,
    );
    await waitFor(() => expect(studio.built).toHaveLength(1));
    // The line is at rest, but the word has not been dealt.
    act(() => studio.built[0].rest(true));
    expect(arrived).not.toHaveBeenCalled();
    expect(requests).toHaveLength(0);

    rerender(<HangyumiStage misses={0} status="playing" outfit={null} dealt onArrived={arrived} label="studio" />);
    expect(arrived).toHaveBeenCalledTimes(1);
    expect(requests.map(request => [request.kind, request.game])).toEqual([["sweep", "hangyumi"]]);

    // A studio built again after the GPU took the canvas back finds the page already in.
    const canvas = container.querySelector("canvas")!;
    act(() => { canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true })); });
    act(() => { canvas.dispatchEvent(new Event("webglcontextrestored")); });
    act(() => studio.built[1].rest(true));
    stop();
    expect(arrived).toHaveBeenCalledTimes(1);
    expect(requests).toHaveLength(1);
  });

  it("comes in with no sweep where nothing moved", async () => {
    const arrived = vi.fn();
    const { requests, stop } = sweeps();
    render(<HangyumiStage misses={0} status="playing" outfit={null} dealt onArrived={arrived} label="studio" />);
    await waitFor(() => expect(studio.built).toHaveLength(1));
    act(() => studio.built[0].rest(false));
    stop();
    expect(arrived).toHaveBeenCalledTimes(1);
    expect(requests).toHaveLength(0);
  });

  it("does not keep the page waiting where there is no studio", async () => {
    const arrived = vi.fn();
    studio.create.mockImplementationOnce(() => null);
    const { requests, stop } = sweeps();
    render(<HangyumiStage misses={0} status="playing" outfit={null} dealt onArrived={arrived} label="studio" />);
    await waitFor(() => expect(arrived).toHaveBeenCalledTimes(1));
    stop();
    expect(requests).toHaveLength(0);
  });
});

/* A Nightscale piece a third win unlocked (Chi, 2026-11-11): the line
   lowers it, then the page shows it whole. */
describe("a piece lowered on the line", () => {
  const won = (present: { key: string; itemId: string } | null, onPresented: () => void) => (
    <HangyumiStage misses={0} status="won" outfit={null} dealt onArrived={() => {}} present={present} onPresented={onPresented} label="studio" />
  );

  it("asks the studio to lower it once per round, and tells the page when it has reached us", async () => {
    const presented = vi.fn();
    const { rerender } = render(won(null, presented));
    await waitFor(() => expect(studio.built).toHaveLength(1));
    rerender(won({ key: "r1", itemId: "ns-fang-drop" }, presented));
    expect(studio.built[0].present).toHaveBeenCalledTimes(1);
    expect(studio.built[0].present.mock.calls[0][0]).toBe("ns-fang-drop");
    expect(presented).not.toHaveBeenCalled();
    act(() => studio.built[0].present.mock.calls[0][1]());
    expect(presented).toHaveBeenCalledTimes(1);
    rerender(won({ key: "r1", itemId: "ns-fang-drop" }, presented));
    expect(studio.built[0].present).toHaveBeenCalledTimes(1);
  });

  it("sends it straight to the page when the GPU takes the canvas back on the way", async () => {
    const presented = vi.fn();
    const { container, rerender } = render(won(null, presented));
    await waitFor(() => expect(studio.built).toHaveLength(1));
    rerender(won({ key: "r2", itemId: "ns-two-banners" }, presented));
    act(() => { container.querySelector("canvas")!.dispatchEvent(new Event("webglcontextlost", { cancelable: true })); });
    expect(presented).toHaveBeenCalledTimes(1);
  });

  it("shows it at once where there is no studio", async () => {
    const presented = vi.fn();
    studio.create.mockImplementationOnce(() => null);
    const { rerender } = render(won(null, presented));
    await waitFor(() => expect(studio.create).toHaveBeenCalled());
    rerender(won({ key: "r3", itemId: "ns-seam-pin" }, presented));
    expect(presented).toHaveBeenCalledTimes(1);
  });
});

