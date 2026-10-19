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
const { announceWordSaved } = await import("@/lib/pet/wordSaved");

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

describe("over the search sheet (Chi, 2026-10-18)", () => {
  /* The dial's Search key opens the search as a sheet over the whole screen,
     card and all; the light used to sit under it, so Save was never lit. */

  function place(node: HTMLElement, box: DOMRect) {
    node.getBoundingClientRect = () => box;
    return node;
  }

  /** Home's own search field, and the sheet over it with its field and Save. */
  function screenWithSheet({ answer = false, typed = "" } = {}) {
    const homeField = place(document.createElement("div"), rect(20, 400, 335, 56));
    homeField.setAttribute("data-coach-target", "search-field");
    document.body.appendChild(homeField);

    const sheet = document.createElement("section");
    sheet.setAttribute("aria-modal", "true");
    const field = place(document.createElement("div"), rect(16, 40, 300, 48));
    field.setAttribute("data-coach-target", "sheet-search");
    const input = document.createElement("input");
    input.value = typed;
    field.appendChild(input);
    sheet.appendChild(field);
    if (answer) {
      const save = place(document.createElement("button"), rect(24, 560, 327, 48));
      save.setAttribute("data-coach-target", "save-word");
      sheet.appendChild(save);
    }
    document.body.appendChild(sheet);
    return input;
  }

  function coachOver(sheetOpen: boolean, onCloseSearch = vi.fn()) {
    render(
      <TutorialCoach
        pathname="/home"
        interfaceMode="standard"
        searchOpen={sheetOpen}
        onSetMode={vi.fn()}
        onNavigate={vi.fn()}
        onCloseSearch={onCloseSearch}
      />,
    );
    return onCloseSearch;
  }

  const light = () => document.querySelector<HTMLElement>("[data-coach-light]");

  it("lights the sheet's field on the look-up step, from over the sheet", async () => {
    screenWithSheet();
    setCoachStep(stepOf("ask"));
    coachOver(true);

    await waitFor(() => expect(light()).toHaveAttribute("data-shown", "true"));
    expect(light()).toHaveAttribute("data-raised", "true");
    /* The sheet's field, not Home's field under the sheet. */
    expect(light()?.style.transform).toBe("translate3d(13px, 37px, 0)");
  });

  it("goes out on the field once the reader starts typing", async () => {
    const input = screenWithSheet();
    setCoachStep(stepOf("ask"));
    coachOver(true);
    await waitFor(() => expect(light()).toHaveAttribute("data-shown", "true"));

    input.value = "lamp";

    await waitFor(() => expect(light()).toHaveAttribute("data-shown", "false"));
  });

  it("lights Save in the sheet, with a tag saying what the card would", async () => {
    screenWithSheet({ answer: true });
    setCoachStep(stepOf("keep"));
    coachOver(true);

    await waitFor(() => expect(light()).toHaveAttribute("data-shown", "true"));
    expect(light()?.style.transform).toBe("translate3d(21px, 557px, 0)");
    expect(light()).toHaveTextContent("Save it · +1 energy cookie");

    await act(async () => {
      announceWordSaved({ term: "lujo", duplicate: false });
    });

    expect(light()).toHaveAttribute("data-done", "true");
    expect(light()).toHaveTextContent("Good.");
  });

  it("puts the sheet away after the beat, and goes on to feeding on Home", async () => {
    screenWithSheet({ answer: true });
    setCoachStep(stepOf("keep"));
    vi.useFakeTimers();
    const onCloseSearch = coachOver(true);

    await act(async () => {
      announceWordSaved({ term: "lujo", duplicate: false });
    });
    expect(onCloseSearch).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1_000);
    });
    vi.useRealTimers();

    expect(onCloseSearch).toHaveBeenCalledOnce();
    expect(screen.getByText(/drag a cookie onto me/)).toBeInTheDocument();
  });

  it("leaves the sheet open after the look-up, where the word is to be kept", async () => {
    screenWithSheet();
    setCoachStep(stepOf("ask"));
    vi.useFakeTimers();
    const onCloseSearch = coachOver(true);

    await act(async () => {
      announceHomeMoment("word-answered");
    });
    await act(async () => {
      vi.advanceTimersByTime(1_000);
    });
    vi.useRealTimers();

    expect(onCloseSearch).not.toHaveBeenCalled();
    expect(screen.getByText(/you get two things/)).toBeInTheDocument();
  });

  it("lights Home's search on the save step when there is nothing up to save", async () => {
    screenWithSheet();
    document.querySelector('[aria-modal="true"]')?.remove();
    setCoachStep(stepOf("keep"));
    coachOver(false);

    await waitFor(() => expect(light()).toHaveAttribute("data-shown", "true"));
    expect(light()).not.toHaveAttribute("data-raised");
    expect(light()?.style.transform).toBe("translate3d(17px, 397px, 0)");
    /* The card can be seen, so the light carries no tag. */
    expect(light()).toHaveTextContent("");
  });
});

describe("over a cookie's card (Chi, 2026-10-18)", () => {
  /* Tapping a cookie opens its card over Home, and the light stayed on the
     cookie behind the backdrop while "Feed Yumi" went unlit. */

  function placed(tag: string, attributes: Record<string, string>, box: DOMRect, parent: Element = document.body) {
    const node = document.createElement(tag);
    for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, value);
    node.getBoundingClientRect = () => box;
    parent.appendChild(node);
    return node;
  }

  const light = () => document.querySelector<HTMLElement>("[data-coach-light]");

  function feedStep() {
    placed("button", { "data-floating-cookie": "c1", "data-hint": "feed" }, rect(40, 300, 48, 48));
    setCoachStep(stepOf("feed"));
    render(
      <TutorialCoach pathname="/home" interfaceMode="standard" onSetMode={vi.fn()} onNavigate={vi.fn()} />,
    );
  }

  it("moves from the cookie to “Feed Yumi” when the card opens, with a tag", async () => {
    feedStep();
    await waitFor(() => expect(light()?.style.transform).toBe("translate3d(37px, 297px, 0)"));
    expect(light()).not.toHaveAttribute("data-raised");

    const card = placed("section", { "aria-modal": "true" }, rect(16, 360, 343, 420));
    placed("button", { "data-coach-target": "feed-yumi" }, rect(220, 700, 120, 44), card);

    await waitFor(() => expect(light()?.style.transform).toBe("translate3d(217px, 697px, 0)"));
    expect(light()).toHaveAttribute("data-raised", "true");
    expect(light()).toHaveTextContent("Feed me · no energy cookies spent");
  });

  it("slides the tag in from the screen's edge, its line still on the key", async () => {
    feedStep();
    const card = placed("section", { "aria-modal": "true" }, rect(16, 360, 343, 420));
    /* "Feed Yumi" sits at the card's right edge. */
    placed("button", { "data-coach-target": "feed-yumi" }, rect(240, 700, 100, 44), card);
    const width = vi
      .spyOn(HTMLElement.prototype, "offsetWidth", "get")
      .mockImplementation(function (this: HTMLElement) {
        return this.hasAttribute("data-coach-tag") ? 240 : 0;
      });

    await waitFor(() => expect(light()).toHaveAttribute("data-raised", "true"));
    /* Centred on the key (290), 240 wide, it would end at 410; on a 375
       screen with 8 to spare it ends at 367, so it slides 43 left. */
    await waitFor(() => expect(light()?.style.getPropertyValue("--tag-shift")).toBe("-43px"));
    width.mockRestore();
  });

  it("goes dark under a dialog with nothing of the step's in it", async () => {
    feedStep();
    await waitFor(() => expect(light()).toHaveAttribute("data-shown", "true"));

    placed("section", { "aria-modal": "true" }, rect(16, 360, 343, 420));

    /* Not glowing through the backdrop at a cookie that cannot be reached. */
    await waitFor(() => expect(light()).toHaveAttribute("data-shown", "false"));
  });
});
