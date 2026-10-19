import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* =========================================================
   The tour's target lock on the key

   Chi, 2026-10-18: a light round the key each step asks for, in the key's
   shape, with a tap-here ripple, and "高級科幻科技感" (after an arrow and a
   strip were set aside). These pin its shape (a few pixels out, the key's
   own corners, an ellipse for Yumi), that it stays dark under the tour's
   card, which element it lights when a step names several, and when the
   tour shows it at all.
   ========================================================= */

vi.mock("@/hooks/preferences/useInterfaceLanguage", () => ({
  default: () => "english",
}));

const { cornerRadius, findTarget, placeHalo } = await import("@/components/tutorial/CoachLight");
const { setCoachStep, COACH_FINISHED } = await import("@/lib/home/tutorialCoach");
const { default: TutorialCoach, COACH_STEPS } = await import(
  "@/components/tutorial/TutorialCoach"
);
const { announceHomeMoment } = await import("@/lib/home/homeMoments");

const stepOf = (key: string) => COACH_STEPS.findIndex((step) => step.key === key);

const rect = (left: number, top: number, width: number, height: number) =>
  new DOMRect(left, top, width, height);

beforeEach(() => {
  /* A 375 × 812 phone. */
  vi.stubGlobal("innerWidth", 375);
  vi.stubGlobal("innerHeight", 812);
});

afterEach(() => {
  vi.unstubAllGlobals();
  setCoachStep(COACH_FINISHED);
  document.body.innerHTML = "";
});

describe("the glow round the key", () => {
  it("rings the key a few pixels out, in its own shape", () => {
    const halo = placeHalo(rect(100, 400, 120, 44), 22, null);

    expect(halo).toEqual({ left: 97, top: 397, width: 126, height: 50, radius: "25px" });
  });

  it("rings an anchor with an ellipse, having no corners to follow", () => {
    expect(placeHalo(rect(116, 269, 144, 144), "ellipse", null)?.radius).toBe("50%");
  });

  it("stays dark when the key is under the tour's card", () => {
    const card = rect(16, 600, 343, 180);

    expect(placeHalo(rect(150, 640, 60, 50), 12, card)).toBeNull();
  });

  it("reads a pill, a circle and a square corner as the shapes they are", () => {
    /* A pill: 999px means half the height. */
    expect(cornerRadius("999px", 200, 44)).toBe(22);
    /* A circle: 50% of a 56px disc. */
    expect(cornerRadius("50%", 56, 56)).toBe(28);
    /* Square corners are softened rather than left sharp. */
    expect(cornerRadius("0px", 120, 60)).toBe(10);
  });
});

describe("which target it picks", () => {
  function element(attributes: Record<string, string>, box: DOMRect) {
    const node = document.createElement("button");
    for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
    node.getBoundingClientRect = () => box;
    document.body.appendChild(node);
    return node;
  }

  it("takes the first selector that has something on screen", () => {
    /* The dial's Search key is laid out but closed (zero size); the search
       field is there. */
    element({ "data-dial-key": "search" }, rect(0, 0, 0, 0));
    element({ "data-coach-target": "search-field" }, rect(20, 400, 335, 56));

    const found = findTarget(['[data-dial-key="search"]', '[data-coach-target="search-field"]']);

    expect(found?.rect.top).toBe(400);
  });

  it("skips anything off the screen", () => {
    element({ "data-floating-cookie": "a" }, rect(20, 900, 40, 40));
    element({ "data-floating-cookie": "b" }, rect(20, 600, 40, 40));

    expect(findTarget(["[data-floating-cookie]"])?.rect.top).toBe(600);
  });
});

describe("when the tour shows it", () => {
  function coach(pathname = "/home") {
    return render(
      <TutorialCoach
        pathname={pathname}
        interfaceMode="standard"
        onSetMode={vi.fn()}
        onNavigate={vi.fn()}
      />,
    );
  }

  const light = () => document.querySelector("[data-coach-light]");

  it("is up on a step that asks for a press", async () => {
    setCoachStep(stepOf("meet"));
    coach();

    /* Fetched on first use, so it arrives a moment after the card. */
    await waitFor(() => expect(light()).not.toBeNull());
  });

  it("is not up on a step that only shows", () => {
    setCoachStep(stepOf("library"));
    coach("/vocabulary");

    expect(screen.getByText(/Vocabulary: every word you keep/)).toBeInTheDocument();
    expect(light()).toBeNull();
  });

  it("confirms during the beat after the step is done, then moves on", async () => {
    setCoachStep(stepOf("meet"));
    coach();
    await waitFor(() => expect(light()).not.toBeNull());
    expect(light()).not.toHaveAttribute("data-done");

    vi.useFakeTimers();
    await act(async () => {
      announceHomeMoment("dial-turned");
    });

    /* The "Good." beat: it flashes and lets go, rather than vanishing. */
    expect(screen.getByText("Good.")).toBeInTheDocument();
    expect(light()).toHaveAttribute("data-done", "true");

    await act(async () => {
      vi.advanceTimersByTime(1_000);
    });
    vi.useRealTimers();

    /* The next step locks on to its own key, afresh. */
    expect(light()).not.toHaveAttribute("data-done");
  });

  it("is not up on the wrong screen, where the card's own button is the way on", () => {
    setCoachStep(stepOf("tryOn"));
    coach("/home");

    expect(screen.getByRole("link", { name: "Open the shop" })).toBeInTheDocument();
    expect(light()).toBeNull();
  });

  it("names a target for every step that asks the reader to press or drag", () => {
    const pointing = COACH_STEPS.filter((step) => step.point).map((step) => step.key);

    expect(pointing).toEqual([
      "meet",
      "ask",
      "keep",
      "feed",
      "cookies",
      "tryOn",
      "modeSwitch",
      "deck",
    ]);
  });
});
