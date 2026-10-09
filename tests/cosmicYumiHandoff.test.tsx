import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CosmicHomeYumi from "@/components/cosmic/CosmicHomeYumi";
import { disposeParkedYumiScene, parkYumiScene, takeParkedYumiScene, type ParkedYumiScene } from "@/lib/yumi3d/sceneCache";
import type { YumiSceneHandle } from "@/lib/yumi3d/scene";

const create = vi.hoisted(() => vi.fn());
vi.mock("@/lib/yumi3d/scene", () => ({ createYumiScene: create }));
let scene: ParkedYumiScene;
let frames: FrameRequestCallback[];
beforeEach(() => {
  frames = []; create.mockReset();
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { frames.push(callback); return frames.length; });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.stubGlobal("IntersectionObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("PointerEvent", class extends MouseEvent {
    readonly pointerId: number; readonly isPrimary: boolean;
    constructor(type: string, init: PointerEventInit = {}) { super(type, init); this.pointerId = init.pointerId ?? 1; this.isPrimary = init.isPrimary ?? true; }
  });
  const canvas = document.createElement("canvas");
  vi.spyOn(canvas, "getContext").mockReturnValue({isContextLost: () => false} as WebGLRenderingContext);
  const handle = {
    frame: vi.fn(), dispose: vi.fn(), resize: vi.fn(), setFocusLevel: vi.fn(), resetScreenAnchor: vi.fn(), setScreenAnchor: vi.fn(), setCosmicLevel: vi.fn(), setRotationPaused: vi.fn(), setGaze: vi.fn(), eyeScreenPosition: () => ({x:50,y:50}), pointerDown: vi.fn(), pointerMove: vi.fn(), pointerUp: vi.fn(), pointerCancel: vi.fn(),
  } as unknown as YumiSceneHandle;
  scene = { canvas, handle, relay: {current: {onTap: vi.fn()}} };
  parkYumiScene(scene);
});
afterEach(() => { cleanup(); disposeParkedYumiScene(); vi.unstubAllGlobals(); });
async function ready() { await act(async () => { await vi.dynamicImportSettled(); }); }
function frame() { act(() => { const pending = frames.splice(0); pending.forEach(callback => callback(performance.now())); }); }

describe("one Yumi across the two homes", () => {
  it("adopts the exact canvas and scene, then parks them without disposal or reconstruction", async () => {
    const view = render(<CosmicHomeYumi paused={false}>Fallback</CosmicHomeYumi>); await ready();
    expect(view.container.querySelector("canvas")).toBe(scene.canvas); expect(create).not.toHaveBeenCalled();
    expect(scene.handle.resetScreenAnchor).toHaveBeenCalledOnce();
    expect(scene.relay.current).toEqual({});
    view.unmount(); const returned = takeParkedYumiScene();
    expect(returned?.canvas).toBe(scene.canvas); expect(returned?.handle).toBe(scene.handle); expect(scene.handle.dispose).not.toHaveBeenCalled();
    if (returned) parkYumiScene(returned);
  });
  it("does not lose a parked scene when unmounted before the ready microtask", async () => {
    const view = render(<CosmicHomeYumi paused={false}>Fallback</CosmicHomeYumi>); view.unmount(); await ready();
    const returned = takeParkedYumiScene(); expect(returned?.handle).toBe(scene.handle); expect(scene.handle.dispose).not.toHaveBeenCalled();
    if (returned) parkYumiScene(returned);
  });
  it("pauses rotation and rejects grabs while the console is busy", async () => {
    const view = render(<CosmicHomeYumi paused={false}>Fallback</CosmicHomeYumi>); await ready(); frame();
    expect(scene.handle.setRotationPaused).toHaveBeenLastCalledWith(false);
    view.rerender(<CosmicHomeYumi paused>Fallback</CosmicHomeYumi>); frame();
    expect(scene.handle.setRotationPaused).toHaveBeenLastCalledWith(true);
    fireEvent.pointerDown(scene.canvas, {pointerId:1,button:0,isPrimary:true}); expect(scene.handle.pointerDown).not.toHaveBeenCalled();
  });
  it("cancels an interrupted gesture without completing a tap or leaving a captured pointer", async () => {
    render(<CosmicHomeYumi paused={false}>Fallback</CosmicHomeYumi>); await ready();
    fireEvent.pointerDown(scene.canvas, {pointerId:3,button:0,isPrimary:true,clientX:30,clientY:40});
    fireEvent.pointerMove(scene.canvas, {pointerId:3,clientX:60,clientY:80});
    fireEvent(window, new Event("blur"));
    fireEvent.pointerUp(scene.canvas, {pointerId:3});
    expect(scene.handle.pointerDown).toHaveBeenCalledWith(30,40); expect(scene.handle.pointerMove).toHaveBeenCalledWith(60,80);
    expect(scene.handle.pointerUp).not.toHaveBeenCalled(); expect(scene.handle.pointerCancel).toHaveBeenCalled();
  });
  it("keeps the SVG fallback when WebGL is unavailable", async () => {
    disposeParkedYumiScene(); create.mockReturnValue(null);
    const view = render(<CosmicHomeYumi paused={false}><svg aria-label="Fallback Yumi" /></CosmicHomeYumi>); await ready();
    expect(view.container.querySelector("[data-cosmic-yumi-live]")).toHaveAttribute("data-cosmic-yumi-live","false");
    expect(view.container.querySelector("svg")?.parentElement).toHaveAttribute("aria-hidden","false");
  });
});
