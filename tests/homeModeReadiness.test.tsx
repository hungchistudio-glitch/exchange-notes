import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CosmicHomeYumi from "@/components/cosmic/CosmicHomeYumi";
import ModeTransitionStage from "@/components/cosmic/ModeTransitionStage";
import HomeModePortal from "@/components/home/HomeModePortal";
import FloatingCookieField from "@/components/home/yumi/FloatingCookieField";
import HomeGatherStar from "@/components/home/yumi/HomeGatherStar";
import YumiRingOverlay from "@/components/home/yumi/YumiRingOverlay";
import { reviewWords } from "@/components/home/yumi/reviewWords";
import { InterfaceModeProvider, useInterfaceMode } from "@/contexts/InterfaceModeContext";
import { buildAvailableCookies } from "@/lib/pet/moodEngine";
import { setCoachStep, COACH_FINISHED } from "@/lib/home/tutorialCoach";
import { disposeParkedYumiScene } from "@/lib/yumi3d/sceneCache";
import english from "@/lib/i18n/en";

/*
 * The real crossing, both ways, with the real homes' parts: Yumi's ring and
 * the floating cookies on one side, the deck's Yumi on the other, one scene
 * handed between them. What is checked is the order of things under the veil
 * — the veil lifts only once everything the reader will see has drawn, and
 * nothing drawn underneath it is still easing when it does.
 */

const scene = vi.hoisted(() => ({ create: vi.fn(), cosmic: vi.fn(), dispose: vi.fn() }));
vi.mock("@/lib/yumi3d/scene", () => ({ createYumiScene: scene.create }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/contexts/LexiconSearchContext", () => ({ useLexiconSearchSheet: () => ({ openSearch: vi.fn() }) }));
vi.mock("@/hooks/i18n/useTranslation", () => ({ default: () => ({ language: "english", t: english }) }));
vi.mock("@/hooks/useDisplayLanguages", () => ({ default: () => ({ learningLanguage: "it", supportLanguage: "zh-TW" }) }));
vi.mock("@/hooks/usePhonetics", () => ({ default: () => () => null }));
vi.mock("@/lib/speech", () => ({ speak: vi.fn(), stopSpeech: vi.fn() }));

let pendingFrames: FrameRequestCallback[];
// Async, so the MutationObserver the field reads the stage's mode through has
// delivered before the next frame, as it would have in a browser.
const frame = () => act(async () => { pendingFrames.splice(0).forEach(callback => callback(performance.now())); });
const settle = () => act(async () => { await vi.dynamicImportSettled(); });

function Standard() {
  const stageRef = useRef<HTMLDivElement>(null);
  return <div ref={stageRef}>
    <YumiRingOverlay stageRef={stageRef} field={() => null}>
      <div data-yumi-figure />
      <FloatingCookieField stageRef={stageRef} cookies={buildAvailableCookies(reviewWords, [])} items={reviewWords} onFeed={vi.fn()} />
    </YumiRingOverlay>
    <HomeGatherStar />
  </div>;
}

function Shell() {
  const { isCosmic } = useInterfaceMode();
  return <><HomeModePortal />{isCosmic ? <CosmicHomeYumi paused={false}><svg /></CosmicHomeYumi> : <Standard />}<ModeTransitionStage /></>;
}

const veil = () => document.querySelector<HTMLElement>("[data-home-mode-transition]");
const portal = () => document.querySelector<HTMLButtonElement>("[data-home-mode-portal]")!;
const root = () => document.querySelector<HTMLElement>("[data-yumi-ring-open]");
const field = () => document.querySelector<HTMLElement>("[data-floating-field]");
function animationEnd() {
  const name = "AnimationEvent" in window ? "animationend" : "webkitAnimationEnd";
  fireEvent(veil()!, new Event(name, { bubbles: true }));
}

beforeEach(() => {
  vi.useFakeTimers();
  pendingFrames = [];
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => pendingFrames.push(callback));
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.stubGlobal("IntersectionObserver", class { observe() {} disconnect() {} });
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  setCoachStep(COACH_FINISHED);
  scene.cosmic.mockClear();
  scene.create.mockReset().mockImplementation(canvas => {
    vi.spyOn(canvas as HTMLCanvasElement, "getContext").mockReturnValue({ isContextLost: () => false } as unknown as WebGLRenderingContext);
    return {
      frame: vi.fn(), resize: vi.fn(), dispose: scene.dispose, setFocusLevel: vi.fn(), setScreenAnchor: vi.fn(),
      resetScreenAnchor: vi.fn(), setCosmicLevel: scene.cosmic, setRotationPaused: vi.fn(), setGaze: vi.fn(),
      eyeScreenPosition: () => ({ x: 195, y: 360 }), lungeAt: vi.fn(() => false),
      pointerDown: vi.fn(), pointerMove: vi.fn(), pointerUp: vi.fn(), pointerCancel: vi.fn(),
    };
  });
});

afterEach(() => {
  cleanup();
  disposeParkedYumiScene();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.documentElement.removeAttribute("data-interface-mode");
});

describe("crossing between the homes", () => {
  it("lifts off the deck only after its Yumi is shown, lit for the deck from her first frame", async () => {
    render(<InterfaceModeProvider initialMode="standard" preview><Shell /></InterfaceModeProvider>);
    await settle(); await frame(); await frame();
    expect(root()?.className).toMatch(/live/);

    fireEvent.click(portal()); animationEnd();
    expect(veil()).toHaveAttribute("data-home-mode-transition", "waiting");
    scene.cosmic.mockClear();
    await settle(); // the deck takes the parked scene and draws her first frame
    expect(scene.create).toHaveBeenCalledOnce(); // handed over, not rebuilt
    expect(scene.cosmic.mock.calls[0]).toEqual([1, true]);
    expect(document.querySelector("[data-cosmic-yumi-live]")).toHaveAttribute("data-cosmic-yumi-live", "true");
    expect(veil()).toHaveAttribute("data-ready", "scene");
    await frame(); await frame();
    expect(veil()).toHaveAttribute("data-home-mode-transition", "revealing");
    await frame();
    expect(scene.cosmic).toHaveBeenLastCalledWith(1, false);
  });

  it("lifts off Standard only once Yumi and then her cookies are drawn, with nothing still easing in", async () => {
    render(<InterfaceModeProvider initialMode="yumi-cosmic" preview><Shell /></InterfaceModeProvider>);
    await settle(); await frame();

    fireEvent.click(portal()); animationEnd();
    expect(veil()).toHaveAttribute("data-home-mode-transition", "waiting");
    // The star is part of the home and is there before anything has drawn.
    expect(document.querySelector("[data-home-gather-star]")).not.toBeNull();
    expect(root()?.className).toMatch(/crossing/);
    expect(field()).toHaveAttribute("data-crossing", "true");

    await settle();
    scene.cosmic.mockClear();
    await frame(); // Yumi's first frame here; the cookies are still parked for "starting"
    expect(scene.cosmic.mock.calls[0]).toEqual([0, true]);
    expect(root()?.className).toMatch(/live/);
    expect(veil()).toHaveAttribute("data-ready", "scene");
    expect(veil()).toHaveAttribute("data-home-mode-transition", "waiting");

    await frame(); // the cookies stand at rest around her
    expect(veil()).toHaveAttribute("data-ready", "scene field");
    expect(veil()).toHaveAttribute("data-home-mode-transition", "waiting");
    await frame(); await frame();
    expect(veil()).toHaveAttribute("data-home-mode-transition", "revealing");

    animationEnd();
    expect(veil()).toBeNull();
    expect(root()?.className).not.toMatch(/crossing/);
    expect(field()).not.toHaveAttribute("data-crossing");
    // Back in the colour of where it is.
    expect(portal()).toHaveAttribute("data-cosmic", "false");
  });

  it("never replays the greeting's arrival ink on a home reached by switching", async () => {
    render(<InterfaceModeProvider initialMode="yumi-cosmic" preview><Shell /></InterfaceModeProvider>);
    await settle(); await frame();
    fireEvent.click(portal()); animationEnd(); await settle();
    for (let i = 0; i < 4; i++) await frame();
    animationEnd();
    expect(veil()).toBeNull();
    expect(root()?.className).toMatch(/modeArrival/);
  });
});
