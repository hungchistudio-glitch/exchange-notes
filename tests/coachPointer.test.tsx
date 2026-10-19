import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* =========================================================
   The tour's LED arrow

   Chi, 2026-10-18: an arrow at the key each step asks for, an LED marquee
   that shows in either look. These pin where it may stand (on screen, off
   the tour's own card, above or below before beside), which element it
   picks when a step names several, and when the tour shows it at all.
   ========================================================= */

vi.mock("@/hooks/preferences/useInterfaceLanguage", () => ({
  default: () => "english",
}));

const { findTarget, placeArrow } = await import("@/components/tutorial/CoachPointer");
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

describe("where the arrow stands", () => {
  it("stands above a target with room above, pointing down at it", () => {
    const place = placeArrow(rect(150, 500, 60, 40), null);

    expect(place?.side).toBe("above");
    /* Centred on the target, its tip just clear of the target's top. */
    expect(place?.x).toBe(180);
    expect(place!.y + 32).toBeLessThanOrEqual(500);
  });

  it("stands below a target near the top of the screen", () => {
    /* The shop key in the top corner. */
    const place = placeArrow(rect(300, 20, 40, 40), null);

    expect(place?.side).toBe("below");
  });

  it("never stands on the tour's card", () => {
    /* The card across the top; a target just under it. Above would land on
       the card, so it goes below. */
    const card = rect(16, 10, 343, 160);
    const place = placeArrow(rect(150, 240, 60, 40), card);

    expect(place?.side).toBe("below");
  });

  it("goes beside the target when neither above nor below fits", () => {
    /* A tall target: no room above or below on this screen. */
    const place = placeArrow(rect(140, 30, 60, 760), null);

    expect(place?.side === "left" || place?.side === "right").toBe(true);
  });

  it("takes a side that covers nothing over its first choice that covers a neighbour", () => {
    /* Above is first (more room), but it would lie across another key. */
    const covers = (box: { top: number }) => (box.top < 500 ? 2 : 0);
    const place = placeArrow(rect(150, 500, 60, 40), null, [], covers);

    expect(place?.side).toBe("below");
  });

  it("keeps its first choice when every side covers the same", () => {
    const place = placeArrow(rect(150, 500, 60, 40), null, [], () => 1);

    expect(place?.side).toBe("above");
  });

  it("gives up rather than leave the screen", () => {
    expect(placeArrow(rect(0, 0, 375, 812), null)).toBeNull();
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

    expect(found?.top).toBe(400);
  });

  it("skips anything off the screen", () => {
    element({ "data-floating-cookie": "a" }, rect(20, 900, 40, 40));
    element({ "data-floating-cookie": "b" }, rect(20, 600, 40, 40));

    expect(findTarget(["[data-floating-cookie]"])?.top).toBe(600);
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

  const arrow = () => document.querySelector("[data-coach-pointer] svg");

  it("is up on a step that asks for a press", async () => {
    setCoachStep(stepOf("meet"));
    coach();

    /* Fetched on first use, so it arrives a moment after the card. */
    await waitFor(() => expect(arrow()).not.toBeNull());
  });

  it("is not up on a step that only shows", () => {
    setCoachStep(stepOf("library"));
    coach("/vocabulary");

    expect(screen.getByText(/This is your Vocabulary/)).toBeInTheDocument();
    expect(arrow()).toBeNull();
  });

  it("goes during the beat after the step is done", async () => {
    setCoachStep(stepOf("meet"));
    coach();
    await waitFor(() => expect(arrow()).not.toBeNull());

    await act(async () => {
      announceHomeMoment("ring-opened");
    });

    expect(screen.getByText("Good.")).toBeInTheDocument();
    expect(arrow()).toBeNull();
  });

  it("is not up on the wrong screen, where the card's own button is the way on", () => {
    setCoachStep(stepOf("wallet"));
    coach("/home");

    expect(screen.getByRole("link", { name: "Open the shop" })).toBeInTheDocument();
    expect(arrow()).toBeNull();
  });

  it("names a target for every step that asks the reader to press or drag", () => {
    const pointing = COACH_STEPS.filter((step) => step.point).map((step) => step.key);

    expect(pointing).toEqual([
      "meet",
      "dial",
      "ask",
      "keep",
      "feed",
      "cookies",
      "wallet",
      "tryOn",
      "buy",
      "modeSwitch",
      "omni",
      "scanner",
      "dock",
    ]);
  });
});
