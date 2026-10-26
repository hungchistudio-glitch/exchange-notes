import { act, render, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import HangyumiStage from "@/components/hangyumi/HangyumiStage";

/* =========================================================
   When the GPU takes the studio's canvas back

   An iPhone after a long while in the background, or memory running
   short, can lose the WebGL context. The studio must not sit blank: the
   flat drawing stands in, and when the context comes back the studio is
   built again in the pose the round has reached. jsdom has no WebGL, so
   the studio itself is a stub that records what it is asked.
   ========================================================= */

const studio = vi.hoisted(() => ({
  create: vi.fn(),
  built: [] as { set: ReturnType<typeof vi.fn>; dispose: ReturnType<typeof vi.fn> }[],
}));

vi.mock("@/lib/hangyumi/studio", () => ({
  createHangyumiStudio: studio.create.mockImplementation(() => {
    const one = { set: vi.fn(), dispose: vi.fn() };
    studio.built.push(one);
    return one;
  }),
}));

describe("the studio's canvas", () => {
  it("shows the flat drawing while the context is lost and rebuilds the studio when it returns", async () => {
    const { container, rerender } = render(<HangyumiStage misses={1} status="playing" outfit={null} label="studio" />);
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
    rerender(<HangyumiStage misses={2} status="playing" outfit={null} label="studio" />);

    act(() => { container.querySelector("canvas")!.dispatchEvent(new Event("webglcontextrestored")); });
    expect(studio.create).toHaveBeenCalledTimes(2);
    expect(studio.built[0].dispose).toHaveBeenCalled();
    expect(studio.built[1].set).toHaveBeenLastCalledWith({ misses: 2, status: "playing", outfit: null });
    expect(stage).toHaveAttribute("data-live", "true");
    expect(stage.querySelector("svg")).toBeNull();
  });
});
