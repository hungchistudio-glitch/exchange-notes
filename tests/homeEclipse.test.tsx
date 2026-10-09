import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InterfaceModeProvider, useInterfaceMode } from "@/contexts/InterfaceModeContext";
import HomeModePortal from "@/components/home/HomeModePortal";
import ModeTransitionStage from "@/components/cosmic/ModeTransitionStage";
import { eclipseRadius } from "@/lib/home/eclipse";

const mocks = vi.hoisted(() => ({ persist: vi.fn(), update: vi.fn(), user: vi.fn() }));
vi.mock("@/lib/appPreferences", async importOriginal => ({
  ...await importOriginal<typeof import("@/lib/appPreferences")>(),
  getInterfaceMode: () => "standard",
  setInterfaceMode: mocks.persist,
}));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({ from: () => ({ update: (data: unknown) => ({ eq: (key: string, id: string) => mocks.update(data, key, id) }) }) }) }));
vi.mock("@/lib/supabase/sessionUser", () => ({ getSessionUser: mocks.user }));
function State() {
  const { interfaceMode, setInterfaceMode, eclipseTransition } = useInterfaceMode();
  return <><output data-testid="mode">{interfaceMode}</output><output data-testid="duration">{eclipseTransition?.duration}</output><button onClick={() => setInterfaceMode("standard")}>Interrupt</button></>;
}
function fixture(preview = true) {
  return render(<InterfaceModeProvider initialMode="standard" preview={preview}><HomeModePortal /><ModeTransitionStage /><State /></InterfaceModeProvider>);
}
const portal = () => document.querySelector<HTMLButtonElement>("[data-home-mode-portal]")!;
const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
beforeEach(() => {
  vi.useFakeTimers(); sessionStorage.clear(); mocks.persist.mockClear(); mocks.update.mockReset().mockResolvedValue({ error: null }); mocks.user.mockReset().mockResolvedValue({ id: "reader" });
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.useRealTimers(); document.documentElement.removeAttribute("data-interface-mode"); });

describe("the home eclipse", () => {
  it("commits under full cover, ends cleanly, and shortens subsequent crossings", () => {
    fixture(); const button = portal(); fireEvent.click(button);
    expect(screen.getByTestId("duration")).toHaveTextContent("900");
    advance(449); expect(screen.getByTestId("mode")).toHaveTextContent("standard");
    advance(1); expect(screen.getByTestId("mode")).toHaveTextContent("yumi-cosmic");
    expect(document.querySelector("[data-eclipse]")).not.toBeNull();
    expect(portal()).toBe(button); expect(button).toHaveAttribute("aria-pressed", "true");
    advance(450); expect(document.querySelector("[data-eclipse]")).toBeNull();
    fireEvent.click(button); expect(screen.getByTestId("duration")).toHaveTextContent("650");
    advance(325); expect(screen.getByTestId("mode")).toHaveTextContent("standard");
    advance(325); expect(button).toHaveAttribute("aria-disabled", "false");
  });
  it("ignores repeated taps while crossing without losing keyboard focus", () => {
    fixture(); portal().focus(); fireEvent.click(portal()); advance(100); fireEvent.click(portal()); advance(800);
    expect(screen.getByTestId("mode")).toHaveTextContent("yumi-cosmic");
    expect(portal()).toHaveFocus();
  });
  it("does not overwrite account or device preferences in a preview", async () => {
    document.documentElement.setAttribute("data-interface-mode", "yumi-cosmic");
    const view = fixture(); fireEvent.click(portal()); advance(900);
    await act(async () => {});
    expect(mocks.persist).not.toHaveBeenCalled(); expect(mocks.user).not.toHaveBeenCalled();
    expect(sessionStorage.getItem("yumi-eclipse-seen")).toBeNull();
    view.unmount(); expect(document.documentElement).toHaveAttribute("data-interface-mode", "yumi-cosmic");
  });
  it("cancels every pending commit on unmount", async () => {
    const view = fixture(false); fireEvent.click(portal()); advance(200); view.unmount(); advance(2000);
    await act(async () => {}); expect(mocks.persist).not.toHaveBeenCalled(); expect(mocks.update).not.toHaveBeenCalled();
  });
  it("lets the existing settings interruption cancel the eclipse", () => {
    fixture(); fireEvent.click(portal()); advance(200); fireEvent.click(screen.getByRole("button", { name: "Interrupt" })); advance(1000);
    expect(screen.getByTestId("mode")).toHaveTextContent("standard"); expect(document.querySelector("[data-eclipse]")).toBeNull();
  });
  it("respects reduced motion without mounting an animated overlay", () => {
    const original = window.matchMedia;
    vi.spyOn(window, "matchMedia").mockImplementation(query => ({ ...original(query), matches: query.includes("prefers-reduced-motion") }));
    fixture(); fireEvent.click(portal()); expect(screen.getByTestId("mode")).toHaveTextContent("yumi-cosmic"); expect(document.querySelector("[data-eclipse]")).toBeNull();
  });
  it("serializes profile writes when the reader returns before the first write finishes", async () => {
    let resolve!: (value: {error: null}) => void;
    mocks.update.mockImplementationOnce(() => new Promise(done => { resolve = done; }));
    fixture(false); fireEvent.click(portal()); advance(900); await act(async () => {});
    fireEvent.click(portal()); advance(650); await act(async () => {});
    expect(mocks.update).toHaveBeenCalledTimes(1);
    await act(async () => { resolve({error: null}); });
    expect(mocks.update.mock.calls).toEqual([[{interface_mode:"yumi-cosmic"},"id","reader"],[{interface_mode:"standard"},"id","reader"]]);
  });
  it("keeps local mode usable after a rejected profile write", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {}); mocks.update.mockRejectedValueOnce(new Error("offline"));
    fixture(false); fireEvent.click(portal()); advance(900); await act(async () => {});
    expect(screen.getByTestId("mode")).toHaveTextContent("yumi-cosmic");
    fireEvent.click(portal()); advance(650); await act(async () => {}); expect(mocks.update).toHaveBeenCalledTimes(2);
  });
  it.each([[390,844],[844,390],[1440,900]])("covers every corner of a %s by %s screen", (width,height) => {
    const origin = {x:width-94,y:40}; const radius = eclipseRadius(origin,width,height);
    for(const x of [0,width]) for(const y of [0,height]) expect(Math.hypot(x-origin.x,y-origin.y)).toBeLessThan(radius);
  });
});
