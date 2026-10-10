import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InterfaceModeProvider, useInterfaceMode } from "@/contexts/InterfaceModeContext";
import HomeModePortal from "@/components/home/HomeModePortal";
import ModeTransitionStage from "@/components/cosmic/ModeTransitionStage";
import { HOME_READY_TIMEOUT_MS, HOME_REVEAL_MS } from "@/lib/home/modeTransition";

const mocks = vi.hoisted(() => ({ persist: vi.fn(), update: vi.fn(), user: vi.fn() }));
vi.mock("@/lib/appPreferences", async importOriginal => ({
  ...await importOriginal<typeof import("@/lib/appPreferences")>(),
  getInterfaceMode: () => "standard",
  setInterfaceMode: mocks.persist,
}));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ from: () => ({ update: (data: unknown) => ({ eq: (key: string, id: string) => mocks.update(data, key, id) }) }) }) }));
vi.mock("@/lib/supabase/sessionUser", () => ({ getSessionUser: mocks.user }));

/* What the two homes report once they are drawn (lib/home/modeTransition):
   Cosmic its scene; Standard its scene and then its floating cookies. */
function State() {
  const { interfaceMode, setInterfaceMode, markHomeModeReady } = useInterfaceMode();
  return <><output data-testid="mode">{interfaceMode}</output>
    <button onClick={() => markHomeModeReady(interfaceMode, "scene")}>Scene drawn</button>
    <button onClick={() => markHomeModeReady(interfaceMode, "field")}>Cookies placed</button>
    <button onClick={() => markHomeModeReady("standard", "scene")}>Old frame</button>
    <button onClick={() => setInterfaceMode("standard")}>Interrupt</button></>;
}
function fixture(preview = true) {
  return render(<InterfaceModeProvider initialMode="standard" preview={preview}>
    <div data-app-scroll-viewport style={{overflowY:"auto",scrollBehavior:"smooth"}}><HomeModePortal /><State /></div>
    <ModeTransitionStage /></InterfaceModeProvider>);
}
const portal = () => document.querySelector<HTMLButtonElement>("[data-home-mode-portal]")!;
const veil = () => document.querySelector<HTMLElement>("[data-home-mode-transition]")!;
const scroller = () => document.querySelector<HTMLElement>("[data-app-scroll-viewport]")!;
const press = (name: string) => fireEvent.click(screen.getByRole("button", { name }));
const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
// React detects jsdom's prefixed animation support: it has WebkitAnimation
// styles but no AnimationEvent constructor. Dispatch the event React registers.
function animationEnd() {
  const name = "AnimationEvent" in window ? "animationend" : "webkitAnimationEnd";
  fireEvent(veil(), new Event(name, { bubbles: true }));
}
function cover() { fireEvent.click(portal()); animationEnd(); }
/** Everything the home now on screen reports, then the two frames before the lift. */
function drawn() { press("Scene drawn"); press("Cookies placed"); advance(40); }
function cross() { cover(); drawn(); animationEnd(); }
beforeEach(() => {
  vi.useFakeTimers(); mocks.persist.mockClear(); mocks.update.mockReset().mockResolvedValue({ error: null }); mocks.user.mockReset().mockResolvedValue({ id: "reader" });
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.useRealTimers(); document.documentElement.removeAttribute("data-interface-mode"); });

describe("the home mode transition", () => {
  it("commits only after cover, waits for the new home to be drawn, and reveals after two frames", () => {
    fixture(); const button = portal(); fireEvent.click(button);
    advance(150); expect(screen.getByTestId("mode")).toHaveTextContent("standard");
    animationEnd();
    expect(screen.getByTestId("mode")).toHaveTextContent("yumi-cosmic");
    advance(700); expect(veil()).toHaveAttribute("data-home-mode-transition", "waiting");
    press("Scene drawn");
    expect(veil()).toHaveAttribute("data-home-mode-transition", "waiting");
    advance(40); expect(veil()).toHaveAttribute("data-home-mode-transition", "revealing");
    animationEnd(); expect(veil()).toBeNull(); expect(portal()).toBe(button);
  });

  it("does not lift off Standard until its floating cookies are placed as well as Yumi", () => {
    fixture(); cross(); // into Cosmic
    cover(); // and back
    press("Scene drawn"); advance(200);
    expect(veil()).toHaveAttribute("data-home-mode-transition", "waiting");
    expect(veil()).toHaveAttribute("data-ready", "scene");
    press("Cookies placed"); advance(40);
    expect(veil()).toHaveAttribute("data-home-mode-transition", "revealing");
  });

  it("covers in the colour of the home being entered", () => {
    fixture(); fireEvent.click(portal());
    expect(veil()).toHaveAttribute("data-target", "yumi-cosmic");
    animationEnd(); drawn(); animationEnd();
    fireEvent.click(portal()); expect(veil()).toHaveAttribute("data-target", "standard");
  });

  it("moves the switch at the press and keeps it above the veil until the crossing ends", () => {
    fixture(); fireEvent.click(portal());
    // The mode has not committed, but the thumb is already on its new side.
    expect(screen.getByTestId("mode")).toHaveTextContent("standard");
    expect(portal()).toHaveAttribute("data-cosmic", "true");
    expect(portal()).toHaveAttribute("data-crossing", "true");
    expect(portal()).toHaveAttribute("aria-pressed", "false");
    animationEnd(); expect(portal()).toHaveAttribute("aria-pressed", "true");
    drawn(); animationEnd();
    expect(portal()).toHaveAttribute("data-cosmic", "true");
    expect(portal()).not.toHaveAttribute("data-crossing");
  });

  it("ignores the outgoing scene's late frame and repeated taps", () => {
    fixture(); portal().focus(); cover();
    press("Old frame"); fireEvent.click(portal()); advance(700);
    expect(veil()).toHaveAttribute("data-home-mode-transition", "waiting");
    expect(veil()).not.toHaveAttribute("data-ready");
    drawn(); animationEnd(); expect(portal()).toHaveAttribute("aria-pressed", "true");
    portal().focus(); expect(portal()).toHaveFocus();
  });

  it("lands every crossing at the top, only under cover, and releases its scroll lock", () => {
    fixture(); scroller().scrollTop = 30;
    fireEvent.click(portal()); expect(scroller().scrollTop).toBe(30);
    expect(scroller().style.overflowY).toBe("hidden");
    animationEnd(); expect(scroller().scrollTop).toBe(0);
    drawn(); animationEnd(); expect(scroller().style.overflowY).toBe("auto");
    expect(scroller().style.scrollBehavior).toBe("smooth");
    // No memory of where either home was left: the switch is at the top.
    scroller().scrollTop = 410; cover(); expect(scroller().scrollTop).toBe(0);
    drawn(); animationEnd(); cover(); expect(scroller().scrollTop).toBe(0);
  });

  it("makes sure of the top just before lifting, after content that arrived while covered", () => {
    fixture(); cover();
    expect(scroller().scrollTop).toBe(0);
    scroller().scrollTop = 120; // content arriving under the veil anchored the scroll
    drawn();
    expect(veil()).toHaveAttribute("data-home-mode-transition", "revealing");
    expect(scroller().scrollTop).toBe(0);
  });

  it("steps the switch away as the page leaves the top, and brings it back there", () => {
    fixture();
    const scroll = (top: number) => { scroller().scrollTop = top; fireEvent.scroll(scroller()); advance(20); };
    expect(portal().style.getPropertyValue("--tuck")).toBe("0.000");
    scroll(10); expect(portal().style.getPropertyValue("--tuck")).toBe("0.250");
    expect(portal()).not.toHaveAttribute("data-tucked");
    scroll(30); expect(portal()).toHaveAttribute("data-tucked", "true");
    scroll(400); expect(portal().style.getPropertyValue("--tuck")).toBe("1.000");
    scroll(0); expect(portal().style.getPropertyValue("--tuck")).toBe("0.000");
    expect(portal()).not.toHaveAttribute("data-tucked");
  });

  it("does not overwrite account or device preferences in a preview", async () => {
    document.documentElement.setAttribute("data-interface-mode", "yumi-cosmic");
    const view = fixture(); cross(); await act(async () => {});
    expect(mocks.persist).not.toHaveBeenCalled(); expect(mocks.user).not.toHaveBeenCalled();
    view.unmount(); expect(document.documentElement).toHaveAttribute("data-interface-mode", "yumi-cosmic");
  });

  it("cancels a pending commit and restores styles on unmount", async () => {
    const view = fixture(false); fireEvent.click(portal()); advance(100); view.unmount(); advance(3000);
    await act(async () => {}); expect(mocks.persist).not.toHaveBeenCalled(); expect(mocks.update).not.toHaveBeenCalled();
    expect(document.documentElement.style.overflow).toBe("");
  });

  it("lets settings interrupt without a late mode flip", () => {
    fixture(); fireEvent.click(portal()); fireEvent.click(screen.getByRole("button", {name:"Interrupt"})); advance(3000);
    expect(screen.getByTestId("mode")).toHaveTextContent("standard"); expect(veil()).toBeNull();
    expect(portal()).toHaveAttribute("data-cosmic", "false");
  });

  it("respects reduced motion without mounting an animated overlay", () => {
    const original = window.matchMedia;
    vi.spyOn(window, "matchMedia").mockImplementation(query => ({ ...original(query), matches: query.includes("prefers-reduced-motion") }));
    fixture(); fireEvent.click(portal()); expect(screen.getByTestId("mode")).toHaveTextContent("yumi-cosmic"); expect(veil()).toBeNull();
  });

  it("is not cut short by a resize, which on a phone is the toolbar settling", () => {
    fixture(); fireEvent.click(portal()); fireEvent(window, new Event("resize"));
    expect(veil()).toHaveAttribute("data-home-mode-transition", "covering");
    animationEnd(); drawn(); animationEnd();
    expect(screen.getByTestId("mode")).toHaveTextContent("yumi-cosmic"); expect(veil()).toBeNull();
    expect(scroller().style.overflowY).toBe("auto");
  });

  it("lands at once when the page is sent to the background mid-crossing", () => {
    fixture(); fireEvent.click(portal());
    const hidden = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    fireEvent(document, new Event("visibilitychange"));
    hidden.mockRestore();
    expect(screen.getByTestId("mode")).toHaveTextContent("yumi-cosmic"); expect(veil()).toBeNull();
    expect(scroller().style.overflowY).toBe("auto");
  });

  it("has a bounded recovery if readiness or animation events never arrive", () => {
    fixture(); fireEvent.click(portal()); advance(450);
    expect(screen.getByTestId("mode")).toHaveTextContent("yumi-cosmic");
    advance(HOME_READY_TIMEOUT_MS); expect(veil()).toHaveAttribute("data-home-mode-transition","revealing");
    advance(HOME_REVEAL_MS + 200); expect(veil()).toBeNull(); expect(portal()).toHaveAttribute("aria-disabled","false");
  });

  it("serializes preference writes even when the first request is slow", async () => {
    let resolve!: (value: {error: null}) => void;
    mocks.update.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    fixture(false); cross(); await act(async () => {}); cross(); await act(async () => {});
    expect(mocks.update).toHaveBeenCalledTimes(1);
    await act(async () => { resolve({error: null}); });
    expect(mocks.update.mock.calls).toEqual([[{interface_mode:"yumi-cosmic"},"id","reader"],[{interface_mode:"standard"},"id","reader"]]);
  });

  it("keeps local mode usable after a rejected profile write", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {}); mocks.update.mockRejectedValueOnce(new Error("offline"));
    fixture(false); cross(); await act(async () => {});
    expect(screen.getByTestId("mode")).toHaveTextContent("yumi-cosmic");
    cross(); await act(async () => {}); expect(mocks.update).toHaveBeenCalledTimes(2);
  });
});
