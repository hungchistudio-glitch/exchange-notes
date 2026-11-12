import { act, cleanup, render } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CosmicHomeYumi from "@/components/cosmic/CosmicHomeYumi";
import { disposeParkedYumiScene, parkYumiScene } from "@/lib/yumi3d/sceneCache";
import type { YumiSceneHandle } from "@/lib/yumi3d/scene";
import { resetVoiceSignal, voiceSignal } from "@/lib/voice/signal";

/* =========================================================
   Yumi on the obsidian bridge, stage two (Chi, 2026-11-12)

   A still stand that comes back to three quarters, a look at the search
   while it has the focus, the voice's real level on her eye and on a faint
   ring, and a loop that stops while she cannot be seen. The scene is a
   stub that records what it is told (WebGL is not to be had in jsdom).
   ========================================================= */

const create = vi.hoisted(() => vi.fn());
vi.mock("@/lib/yumi3d/scene", () => ({ createYumiScene: create }));

let frames: FrameRequestCallback[];
let handle: Record<string, ReturnType<typeof vi.fn>>;

beforeEach(() => {
  frames = [];
  create.mockReset();
  resetVoiceSignal();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { frames.push(callback); return frames.length; });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.stubGlobal("IntersectionObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  const canvas = document.createElement("canvas");
  vi.spyOn(canvas, "getContext").mockReturnValue({ isContextLost: () => false } as WebGLRenderingContext);
  handle = Object.fromEntries([
    "frame", "dispose", "resize", "setFocusLevel", "resetScreenAnchor", "setScreenAnchor", "setCosmicLevel",
    "setRotationPaused", "setGaze", "pointerDown", "pointerMove", "pointerUp", "pointerCancel", "setView",
    "setRest", "holdRest", "setNavigationLean", "setOutfit",
  ].map((name) => [name, vi.fn()]));
  parkYumiScene({ canvas, handle: handle as unknown as YumiSceneHandle, relay: { current: {} } });
});

afterEach(() => {
  cleanup();
  disposeParkedYumiScene();
  vi.unstubAllGlobals();
  resetVoiceSignal();
});

async function ready() { await act(async () => { await vi.dynamicImportSettled(); }); }
function frame(times = 1) {
  for (let i = 0; i < times; i++) {
    act(() => { const pending = frames.splice(0); pending.forEach((callback) => callback(performance.now() + i * 16)); });
  }
}
const lastGaze = () => handle.setGaze.mock.calls.at(-1) as [number, number];

describe("Yumi on the bridge", () => {
  it("stands still at three quarters, comes back after a turn, and hands the scene back turning", async () => {
    const view = render(<CosmicHomeYumi paused={false} fit="stage" />);
    await ready();
    expect(handle.setView).toHaveBeenCalledWith("three-quarter", true);
    expect(handle.setRest).toHaveBeenCalledWith({ view: "three-quarter", afterMs: 3000, seconds: 1.4 });
    view.unmount();
    /* The Standard home shares the scene and keeps its cruise. */
    expect(handle.setRest).toHaveBeenLastCalledWith(null);
    expect(handle.holdRest).toHaveBeenLastCalledWith(false);
  });

  it("holds the way back while the orbit is open or the search has the focus", async () => {
    const view = render(<CosmicHomeYumi paused={false} fit="stage" />);
    await ready();
    frame();
    expect(handle.holdRest).toHaveBeenLastCalledWith(false);
    view.rerender(<CosmicHomeYumi paused={false} fit="stage" holdRest />);
    frame();
    expect(handle.holdRest).toHaveBeenLastCalledWith(true);
  });

  it("looks down at the search while it has the focus, and back at the reader after", async () => {
    const view = render(<CosmicHomeYumi paused={false} fit="stage" attention="search" />);
    await ready();
    frame();
    expect(lastGaze()[1]).toBeGreaterThan(0.5);
    view.rerender(<CosmicHomeYumi paused={false} fit="stage" attention="idle" />);
    frame();
    expect(lastGaze()).toEqual([0, 0]);
  });

  it("follows the voice's real level on her eye and on the ring, and nothing without it", async () => {
    const glow = document.createElement("div");
    const glowRef = createRef<HTMLElement>() as { current: HTMLElement | null };
    glowRef.current = glow;
    const view = render(<CosmicHomeYumi paused={false} fit="stage" attention="listening" glowRef={glowRef} />);
    await ready();
    frame(4);
    expect(Number(glow.style.getPropertyValue("--voice-level") || 0)).toBe(0);

    voiceSignal.level = 0.8;
    frame(20);
    expect(Number(glow.style.getPropertyValue("--voice-level"))).toBeGreaterThan(0.4);
    expect(lastGaze()[1]).toBeLessThan(-0.1);

    view.rerender(<CosmicHomeYumi paused={false} fit="stage" attention="idle" glowRef={glowRef} />);
    frame(120);
    expect(Number(glow.style.getPropertyValue("--voice-level") || 0)).toBeLessThan(0.01);
  });

  it("stops asking for frames while the page is hidden, and starts again when it is back", async () => {
    render(<CosmicHomeYumi paused={false} fit="stage" />);
    await ready();
    frame();
    expect(frames.length).toBe(1);
    const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    frame();
    expect(frames.length).toBe(0);
    visibility.mockReturnValue("visible");
    act(() => { document.dispatchEvent(new Event("visibilitychange")); });
    expect(frames.length).toBe(1);
  });

  it("knows of a sheet over her from the page's changes, not a search every frame", async () => {
    render(<CosmicHomeYumi paused={false} fit="stage" />);
    await ready();
    frame();
    expect(handle.setRotationPaused).toHaveBeenLastCalledWith(false);
    const sheet = document.createElement("div");
    sheet.setAttribute("aria-modal", "true");
    await act(async () => { document.body.append(sheet); });
    frame();
    expect(handle.setRotationPaused).toHaveBeenLastCalledWith(true);
    sheet.remove();
  });
});
