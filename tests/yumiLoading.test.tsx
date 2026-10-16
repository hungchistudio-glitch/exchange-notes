import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import Yumi3DFigure from "@/components/yumi3d/Yumi3DFigure";
import YumiPrismLaunch from "@/components/launch/YumiPrismLaunch";

const create = vi.hoisted(() => vi.fn());
vi.mock("@/lib/yumi3d/scene", () => ({ createYumiScene: create }));

beforeEach(() => {
  create.mockReset();
  vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function settle() {
  await act(async () => {
    await vi.dynamicImportSettled();
  });
}

const handle = () => ({
  frame: vi.fn(),
  dispose: vi.fn(),
  resize: vi.fn(),
  setScreenAnchor: vi.fn(),
});

const loader = (container: HTMLElement) =>
  container.querySelector("[data-yumi-loading]");

describe("one Yumi: the loader holds her place, never the old flat mark", () => {
  it("shows the loader until the scene starts, then hands over", async () => {
    create.mockReturnValue(handle());
    const { container } = render(<Yumi3DFigure />);

    expect(loader(container)).toHaveAttribute("data-yumi-loading", "loading");
    expect(container.querySelector("svg")).toBeNull();

    await settle();
    expect(loader(container)).toHaveAttribute("data-yumi-loading", "done");
  });

  it("keeps a still ring, and no substitute Yumi, without WebGL", async () => {
    create.mockReturnValue(null);
    const { container } = render(<Yumi3DFigure />);

    await settle();
    expect(loader(container)).toHaveAttribute("data-yumi-loading", "unavailable");
    expect(container.querySelector("svg")).toBeNull();
  });

  it("stops the band when the scene is slow, and still takes a late arrival", async () => {
    vi.useFakeTimers();
    create.mockReturnValue(handle());
    const { container } = render(<Yumi3DFigure />);

    // Synchronous from render to here, so the chunk has not resolved yet.
    act(() => {
      vi.advanceTimersByTime(15_000);
    });
    expect(loader(container)).toHaveAttribute("data-yumi-loading", "unavailable");

    vi.useRealTimers();
    await settle();
    expect(loader(container)).toHaveAttribute("data-yumi-loading", "done");
  });

  it("opens on empty pearl glass rather than a flat Yumi before the model draws", () => {
    create.mockReturnValue(null);
    const { container } = render(<YumiPrismLaunch launchId="no-flat-lens" reviewMode />);

    expect(container.querySelector('[data-track="actor"] svg')).toBeNull();
    expect(container.querySelector('[data-track="pupil"]')).toBeNull();
    expect(container.textContent).toContain("Exchange Notes");
  });
});

/*
 * The places the old Yumi used to stand in for the 3D one. Read as source,
 * because the regression this guards against is an import: the flat mark
 * coming back as somebody's quick fallback.
 */
const THREE_D_ONLY = [
  "components/landing/LandingPage.tsx",
  "components/info/InfoPage.tsx",
  "components/launch/YumiPrismLaunch.tsx",
  "components/home/yumi/YumiHomeStage.tsx",
  "components/cosmic/CommandDeck.tsx",
  "components/cosmic/CosmicHomeYumi.tsx",
  "components/shop/ShopStage.tsx",
  "components/yumi3d/Yumi3DFigure.tsx",
];

describe.each(THREE_D_ONLY)("%s", (file) => {
  it("does not draw the old flat Yumi", () => {
    const source = readFileSync(resolve(process.cwd(), file), "utf8");
    expect(source).not.toMatch(/import\s+(ExchangeNotesMark|YumiMark)\b/);
    expect(source).not.toMatch(/<(ExchangeNotesMark|YumiMark)\b/);
  });
});
