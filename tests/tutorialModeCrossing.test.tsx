import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* =========================================================
   A switch the tour makes, made the way the switch makes it

   Chi, 2026-10-09: "統一新過場". On Home the tour's own switches — "Switch
   to …" when a step needs the other look, and the last step's choice — are
   the same veil the home switch draws, not Settings' six-node sequence.
   Anywhere else they are still Settings' sequence, which is what a switch
   made there has always looked like.
   ========================================================= */

const nav = vi.hoisted(() => ({ pathname: "/home", push: vi.fn() }));
vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({ push: nav.push }),
}));
vi.mock("@/hooks/preferences/useInterfaceLanguage", () => ({ default: () => "english" }));

const { setCoachStep, COACH_FINISHED } = await import("@/lib/home/tutorialCoach");
const { InterfaceModeProvider } = await import("@/contexts/InterfaceModeContext");
const { AppTutorialCoach, COACH_STEPS } = await import("@/components/tutorial/TutorialCoach");
const { default: ModeTransitionStage } = await import("@/components/cosmic/ModeTransitionStage");

const stepOf = (key: string) => COACH_STEPS.findIndex(step => step.key === key);

function app(initialMode: "standard" | "yumi-cosmic") {
  return render(
    <InterfaceModeProvider initialMode={initialMode} preview>
      <AppTutorialCoach />
      <ModeTransitionStage />
    </InterfaceModeProvider>,
  );
}

beforeEach(() => { vi.useFakeTimers(); nav.push.mockClear(); });
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  setCoachStep(COACH_FINISHED);
  document.documentElement.removeAttribute("data-interface-mode");
});

describe("the tour's own switches", () => {
  it("cross with the home veil when the choice is made on Home", () => {
    nav.pathname = "/home";
    setCoachStep(stepOf("choose"));
    app("standard");

    fireEvent.click(screen.getByRole("button", { name: "Start in Yumi Cosmic Mode" }));

    const veil = document.querySelector("[data-home-mode-transition]");
    expect(veil).toHaveAttribute("data-target", "yumi-cosmic");
  });

  it("cross with the home veil when a Home step asks for the other look", () => {
    nav.pathname = "/home";
    setCoachStep(stepOf("deck")); // a Cosmic step, reached in Standard
    app("standard");

    fireEvent.click(screen.getByRole("button", { name: "Switch to Yumi Cosmic Mode" }));

    expect(document.querySelector("[data-home-mode-transition]")).toHaveAttribute("data-target", "yumi-cosmic");
  });

  it("keep Settings' sequence away from Home", () => {
    nav.pathname = "/vocabulary";
    setCoachStep(stepOf("library")); // a Standard step, reached in Cosmic
    app("yumi-cosmic");

    fireEvent.click(screen.getByRole("button", { name: "Switch to Standard Mode" }));

    expect(document.querySelector("[data-home-mode-transition]")).toBeNull();
    act(() => { vi.advanceTimersByTime(2000); });
    expect(document.documentElement).toHaveAttribute("data-interface-mode", "standard");
  });
});
