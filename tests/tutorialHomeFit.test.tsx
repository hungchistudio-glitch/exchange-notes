import { act, render } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* =========================================================
   The tour, fitted to the new home screen (Chi, 2026-10-03:
   "確定教學互動是否要更新更正")

   The home screen changed under the tour: the cookie tray became floating
   cookies (a tap opens a card; feeding is a drag or the card's button), a
   star took the top-right corner, and the search lifts Yumi to the top of
   the screen — where the tour's card stands. Chi's choices: say how to
   feed and show it with one cookie; put the search away for that step; and
   shrink the card to a strip while the reader types.
   ========================================================= */

vi.mock("@/hooks/preferences/useInterfaceLanguage", () => ({ default: () => "english" }));

import english from "@/lib/i18n/en";
import zhTW from "@/lib/i18n/zh-TW";
import { COACH_FINISHED, setCoachStep } from "@/lib/home/tutorialCoach";
import { onHomeSearchDismiss } from "@/lib/home/homeMoments";
import TutorialCoach, { COACH_STEPS } from "@/components/tutorial/TutorialCoach";

const FEED = COACH_STEPS.findIndex(step => step.key === "feed");

afterEach(() => {
  setCoachStep(COACH_FINISHED);
  vi.useRealTimers();
});

describe("the feed step", () => {
  it("says how to feed with the cookies there are now", () => {
    expect(english.tutorial.coach.steps.feed.body).toMatch(/drag a cookie onto me/i);
    expect(english.tutorial.coach.steps.feed.body).toMatch(/Feed Yumi/);
    expect(zhTW.tutorial.coach.steps.feed.body).toMatch(/拖到我身上/);
  });

  it("puts the search answer away after a beat, so the cookies are within reach", () => {
    vi.useFakeTimers();
    setCoachStep(FEED);
    const dismissed = vi.fn();
    const stop = onHomeSearchDismiss(dismissed);

    render(
      <TutorialCoach pathname="/home" interfaceMode="standard" onSetMode={vi.fn()} onNavigate={vi.fn()} />,
    );

    act(() => vi.advanceTimersByTime(1_000));
    expect(dismissed).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(300));
    expect(dismissed).toHaveBeenCalledOnce();
    stop();
  });

  it("leaves the search alone on any other step", () => {
    vi.useFakeTimers();
    setCoachStep(FEED - 1);
    const dismissed = vi.fn();
    const stop = onHomeSearchDismiss(dismissed);

    render(
      <TutorialCoach pathname="/home" interfaceMode="standard" onSetMode={vi.fn()} onNavigate={vi.fn()} />,
    );
    act(() => vi.advanceTimersByTime(5_000));

    expect(dismissed).not.toHaveBeenCalled();
    stop();
  });
});

describe("the card on the home screen", () => {
  it("is marked for the cookies to avoid and for Yumi to keep below", () => {
    setCoachStep(0);
    const { container } = render(
      <TutorialCoach pathname="/home" interfaceMode="standard" onSetMode={vi.fn()} onNavigate={vi.fn()} />,
    );
    const card = container.querySelector("[data-coach-card]");
    expect(card).not.toBeNull();
    expect(card).toHaveAttribute("data-yumi-protected");
  });
});

/* ---------- the demonstrating cookie ---------- */

vi.mock("@/hooks/i18n/useTranslation", () => ({ default: () => ({ language: "english", t: english }) }));
vi.mock("@/hooks/useDisplayLanguages", () => ({ default: () => ({ learningLanguage: "it", supportLanguage: "zh-TW" }) }));
vi.mock("@/hooks/usePhonetics", () => ({ default: () => () => null }));

const { default: FloatingCookieField } = await import("@/components/home/yumi/FloatingCookieField");
const { reviewWords } = await import("@/components/home/yumi/reviewWords");
const { buildAvailableCookies } = await import("@/lib/pet/moodEngine");

function cookies(mode = "rest") {
  const stageRef = createRef<HTMLDivElement>();
  const list = buildAvailableCookies(reviewWords, []);
  const view = render(
    <div ref={stageRef} data-yumi-mode={mode}>
      <FloatingCookieField stageRef={stageRef} cookies={list} items={reviewWords} onFeed={vi.fn()} />
    </div>,
  );
  return { ...view, list };
}

describe("the demonstrating cookie", () => {
  beforeEach(() => setCoachStep(COACH_FINISHED));

  it("is the first cookie, only on the feed step", () => {
    setCoachStep(FEED);
    const { list, unmount } = cookies();
    const hinted = document.querySelectorAll("[data-hint='feed']");
    expect(hinted).toHaveLength(1);
    expect(hinted[0]).toHaveAttribute("data-floating-cookie", list[0].id);
    unmount();
  });

  it("is not shown outside the tour", () => {
    const { unmount } = cookies();
    expect(document.querySelector("[data-hint='feed']")).toBeNull();
    unmount();
  });

  it("is not shown while the search is up", () => {
    setCoachStep(FEED);
    const { unmount } = cookies("answering");
    expect(document.querySelector("[data-hint='feed']")).toBeNull();
    unmount();
  });
});
