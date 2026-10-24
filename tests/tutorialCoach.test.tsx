import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* =========================================================
   A tour that waits for the reader — in four chapters

   The old one advanced when a button was pressed, which meant it could be
   finished without touching the app — and the page it spent describing the
   navigation described a dock that no longer exists.

   These are about the properties that make this one different: a step is
   satisfied by the thing actually happening; it follows the reader across
   the main screens; it teaches Standard first, has the reader make the
   switch to Cosmic themselves, and ends by asking which look to keep.
   ========================================================= */

vi.mock("@/hooks/preferences/useInterfaceLanguage", () => ({
  default: () => "english",
}));

const { announceHomeMoment } = await import("@/lib/home/homeMoments");
const { announceWordSaved } = await import("@/lib/pet/wordSaved");
const {
  COACH_EDITION,
  COACH_FINISHED,
  armCoach,
  getCoachStep,
  getCoachTrack,
  resetCoachCacheForTests,
  setCoachStep,
} = await import("@/lib/home/tutorialCoach");
const { default: TutorialCoach, COACH_STEPS, REFRESH_STEPS } = await import(
  "@/components/tutorial/TutorialCoach"
);

/* By name, so a step added to the tour does not silently retarget these. */
const stepOf = (key: string) => COACH_STEPS.findIndex((step) => step.key === key);

type Mode = "standard" | "yumi-cosmic";

function coach(
  pathname = "/home",
  interfaceMode: Mode = "standard",
  extra: { switching?: boolean } = {},
) {
  const onSetMode = vi.fn();
  const onNavigate = vi.fn();

  const view = render(
    <TutorialCoach
      pathname={pathname}
      interfaceMode={interfaceMode}
      switching={extra.switching}
      onSetMode={onSetMode}
      onNavigate={onNavigate}
    />,
  );

  const again = (
    nextPath: string,
    nextMode: Mode = interfaceMode,
    nextExtra: { switching?: boolean } = {},
  ) =>
    view.rerender(
      <TutorialCoach
        pathname={nextPath}
        interfaceMode={nextMode}
        switching={nextExtra.switching}
        onSetMode={onSetMode}
        onNavigate={onNavigate}
      />,
    );

  return { ...view, again, onSetMode, onNavigate };
}

beforeEach(() => {
  vi.useRealTimers();
  setCoachStep(0);
});

describe("chapter one: doing it on the home screen", () => {
  it("draws nothing at all when nobody is mid-tour", () => {
    setCoachStep(COACH_FINISHED);

    const { container } = coach();

    expect(container).toBeEmptyDOMElement();
  });

  it("says which chapter it is, and how far into it", () => {
    coach();

    expect(screen.getByText("Chapter 1 · Home · 1/4")).toBeInTheDocument();
  });

  it("waits for the dial to be turned, not merely opened", async () => {
    coach();

    expect(screen.getByText(/Tap me to open the dial, turn it/)).toBeInTheDocument();

    /* The wrong events must do nothing: a reader who looked a word up, or
       opened the dial and never turned it, has not done step one. */
    await act(async () => {
      announceHomeMoment("word-answered");
    });
    await act(async () => {
      announceHomeMoment("ring-opened");
    });

    expect(screen.queryByText("Good.")).toBeNull();

    await act(async () => {
      announceHomeMoment("dial-turned");
    });

    expect(screen.getByText("Good.")).toBeInTheDocument();
  });

  it("offers no Next on a step that is waiting, only a way past that one step", async () => {
    coach();

    /* "Next" would read as the way on and make every instruction optional.
       Skip tour is always there — a tour nobody can leave is worse than one
       nobody finishes — and so is a quieter key past the one step, for a
       step that cannot be done right now (Chi, 2026-10-18). */
    expect(screen.queryByRole("button", { name: "Next" })).toBeNull();
    expect(screen.getByRole("button", { name: "Skip tour" })).toBeInTheDocument();

    await act(async () => {
      screen.getByRole("button", { name: "Skip this step" }).click();
    });

    expect(getCoachStep()).toBe(stepOf("ask"));
    expect(screen.getByText(/Turn to Search, tap it/)).toBeInTheDocument();
  });

  it("does not count a word the reader already had as keeping one", async () => {
    setCoachStep(stepOf("keep"));

    coach();

    expect(screen.getByText(/you get two things/)).toBeInTheDocument();

    await act(async () => {
      announceWordSaved({ term: "lamp", duplicate: true });
    });

    expect(screen.getByText(/you get two things/)).toBeInTheDocument();

    await act(async () => {
      announceWordSaved({ term: "biblioteca", duplicate: false });
    });

    expect(screen.getByText("Good.")).toBeInTheDocument();
  });

  it("does not leave the reader stuck on keep when there was nothing to keep", async () => {
    setCoachStep(stepOf("ask"));

    coach();

    vi.useFakeTimers();
    await act(async () => {
      announceHomeMoment("word-unavailable");
    });
    await act(async () => {
      vi.advanceTimersByTime(1_000);
    });
    vi.useRealTimers();

    expect(screen.getByText(/came back without a meaning/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();

    await act(async () => {
      announceHomeMoment("word-answered");
    });

    expect(screen.getByText(/you get two things/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next" })).toBeNull();
  });

  it("starts in Standard Mode, and offers the switch to a reader in Cosmic", () => {
    const { onSetMode } = coach("/home", "yumi-cosmic");

    expect(screen.getByText(/This part of the tour happens in Standard Mode/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Switch to Standard Mode" }));

    expect(onSetMode).toHaveBeenCalledWith("standard");
  });
});

describe("the new home screen", () => {
  it("tells the reader how to feed a floating cookie", () => {
    setCoachStep(stepOf("feed"));

    coach();

    expect(screen.getByText(/drag a cookie onto me/)).toBeInTheDocument();
    expect(screen.getByText(/Feed Yumi/)).toBeInTheDocument();
  });

  /* The floating cookies steer round [data-yumi-protected] and sit one layer
     below the card; unmarked, they drifted under it out of reach. */
  it("marks the card as something the cookies must keep out of", () => {
    coach();

    expect(
      screen.getByRole("status").querySelector("[data-yumi-protected]"),
    ).not.toBeNull();
  });
});

describe("chapter two: around the app", () => {
  it("offers a door to a page step's screen, and does not advance for following it", () => {
    setCoachStep(stepOf("share")); // happens on Messages

    coach("/home");

    expect(screen.getByRole("link", { name: "Open Messages" })).toHaveAttribute(
      "href",
      "/messages",
    );
    expect(screen.queryByRole("button", { name: "Next" })).toBeNull();
  });

  it("walks every main screen in order", async () => {
    setCoachStep(stepOf("library"));

    const { again } = coach("/vocabulary");

    for (const [pathname, text, position] of [
      ["/vocabulary", /Vocabulary: every word you keep/, "1/7"],
      ["/review", /A perfect round earns 3 energy cookies/, "2/7"],
      ["/pronunciation", /Pronunciation Lab: watch how I shape each sound/, "3/7"],
      ["/messages", /Messages: add a friend/, "4/7"],
      ["/notes", /Notes: for what a single word can't hold/, "5/7"],
      ["/discover", /Discover: a few news stories a day/, "6/7"],
      ["/profile", /Settings: change languages/, "7/7"],
    ] as const) {
      again(pathname);
      expect(screen.getByText(text)).toBeInTheDocument();
      expect(screen.getByText(`Chapter 2 · Around the app · ${position}`)).toBeInTheDocument();
      await act(async () => {
        screen.getByRole("button", { name: "Next" }).click();
      });
    }

    // Then the shop, on Home, before the other look.
    expect(screen.getByText(/Saving a word for the first time earns an energy cookie/)).toBeInTheDocument();
  });

  it("steps aside on screens that are not one of the six", () => {
    setCoachStep(stepOf("share"));

    const { container } = coach("/messages/some-conversation");

    expect(container).toBeEmptyDOMElement();
  });
});

describe("chapter three: Yumi's shop", () => {
  it("asks the reader to go in by the shop key, then waits for a try-on in the shop", async () => {
    setCoachStep(stepOf("cookies"));

    const { again, container } = coach("/home");
    expect(screen.getByText("Chapter 3 · Yumi’s shop · 1/2")).toBeInTheDocument();
    expect(screen.getByText(/Tap the glowing bag at the top right to come in/)).toBeInTheDocument();
    /* The card names the step, which is what keeps the shop key in view
       (HomeShopKey.module.css) while the tour's glow rings it. */
    expect(container.querySelector("[data-coach-card]")).toHaveAttribute("data-coach-step", "cookies");
    /* Going in is the step: no Next, only a way past it. */
    expect(screen.queryByRole("button", { name: "Next" })).toBeNull();
    expect(screen.getByRole("button", { name: "Skip this step" })).toBeInTheDocument();

    /* In through the bag: done. */
    vi.useFakeTimers();
    again("/shop");
    expect(screen.getByText("Good.")).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(1_000);
    });
    vi.useRealTimers();
    expect(getCoachStep()).toBe(stepOf("tryOn"));

    /* In the shop: a try-on, told in the same breath how buying works,
       rather than made to spend. */
    again("/shop");
    expect(screen.getByText(/Tap any piece and I’ll try it on for free/)).toBeInTheDocument();
    expect(screen.getByText(/cookies are only spent once you confirm/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next" })).toBeNull();

    vi.useFakeTimers();
    act(() => announceHomeMoment("shop-tried"));
    expect(screen.getByText("Good.")).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(1_000);
    });
    vi.useRealTimers();

    expect(getCoachStep()).toBe(stepOf("modeSwitch"));
  });
});

describe("the shop's way in (Chi, 2026-10-19)", () => {
  it("counts a reader already in the shop as in, rather than sending them back to Home", async () => {
    setCoachStep(stepOf("cookies"));
    vi.useFakeTimers();

    coach("/shop");

    expect(screen.getByText("Good.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Back to Home" })).toBeNull();
    await act(async () => {
      vi.advanceTimersByTime(1_000);
    });
    vi.useRealTimers();

    expect(getCoachStep()).toBe(stepOf("tryOn"));
    expect(screen.getByText(/Tap any piece and I’ll try it on for free/)).toBeInTheDocument();
  });

  it("leaves a door to the shop for a reader who passes the step on Home", async () => {
    setCoachStep(stepOf("cookies"));

    coach("/home");
    await act(async () => {
      screen.getByRole("button", { name: "Skip this step" }).click();
    });

    expect(getCoachStep()).toBe(stepOf("tryOn"));
    expect(screen.getByRole("link", { name: "Open the shop" })).toHaveAttribute("href", "/shop");
  });
});

describe("chapter four: the other look", () => {
  it("teaches the switch on Home, and waits for it and for the crossing to finish", async () => {
    setCoachStep(stepOf("modeSwitch"));

    const { again, container } = coach("/home");

    expect(screen.getByText("Chapter 4 · The other look · 1/3")).toBeInTheDocument();
    expect(screen.getByText(/Tap the switch at the top right to go to Yumi Cosmic Mode/)).toBeInTheDocument();
    /* The card names the step, which is what lets the switch show itself
       (HomeModePortal.module.css) while every other step keeps it hidden. */
    expect(container.querySelector("[data-coach-card]")).toHaveAttribute("data-coach-step", "modeSwitch");
    /* The way on is the switch itself; there is no Next and no door. */
    expect(screen.queryByRole("button", { name: "Next" })).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();

    /* Mid-crossing: nothing drawn over it. */
    again("/home", "yumi-cosmic", { switching: true });
    expect(screen.queryByRole("status")).toBeNull();

    vi.useFakeTimers();
    again("/home", "yumi-cosmic");
    expect(screen.getByText("Good.")).toBeInTheDocument();
    /* Used: the switch stops being pointed at for the beat before "deck". */
    expect(container.querySelector("[data-coach-card]")).toHaveAttribute("data-coach-done", "");

    await act(async () => {
      vi.advanceTimersByTime(1_000);
    });
    vi.useRealTimers();

    expect(getCoachStep()).toBe(stepOf("deck"));
  });

  it("goes straight to the choice when the switch is passed, not to the Cosmic steps", async () => {
    setCoachStep(stepOf("modeSwitch"));

    coach("/home");

    await act(async () => {
      screen.getByRole("button", { name: "Skip this step" }).click();
    });

    /* Passing the switch means staying in Standard: the deck step would
       only ask for the switch again. */
    expect(getCoachStep()).toBe(stepOf("choose"));
    expect(screen.getByRole("button", { name: "Start in Standard Mode" })).toBeInTheDocument();
  });

  it("sends a reader who is elsewhere back to Home for the switch, not to Settings", () => {
    setCoachStep(stepOf("modeSwitch"));

    coach("/profile");

    expect(screen.getByRole("link", { name: "Back to Home" })).toHaveAttribute("href", "/home");
  });

  it("counts a switch made some other way, such as in Settings", () => {
    vi.useFakeTimers();
    setCoachStep(stepOf("modeSwitch"));

    coach("/profile", "yumi-cosmic");
    expect(screen.getByText("Good.")).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(1_000); });
    vi.useRealTimers();

    expect(getCoachStep()).toBe(stepOf("deck"));
  });

  it("takes the reader to the deck by itself after the switch", () => {
    setCoachStep(stepOf("deck"));

    const { onNavigate } = coach("/profile", "yumi-cosmic");

    expect(onNavigate).toHaveBeenCalledWith("/home");
  });

  it("names the deck's parts exactly as the deck does", () => {
    setCoachStep(stepOf("deck"));

    coach("/home", "yumi-cosmic");

    expect(
      screen.getByText(/Yumi OmniLexicon at the top, Menu Translator for menus and signs/),
    ).toBeInTheDocument();
  });

  it("ends by asking which look to keep, and goes there", () => {
    setCoachStep(stepOf("choose"));

    const { onSetMode } = coach("/home", "yumi-cosmic");

    expect(screen.queryByRole("button", { name: "Skip tour" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Start in Standard Mode" }));

    expect(onSetMode).toHaveBeenCalledWith("standard");
    expect(getCoachStep()).toBe(COACH_FINISHED);
  });
});

describe("one word, two cookies (2026-10-18)", () => {
  it("says, at the save, that one word earns two different cookies", async () => {
    setCoachStep(stepOf("keep"));

    coach();

    expect(screen.getByText(/a cookie on Home to feed me, and \+1 energy cookie for the shop/)).toBeInTheDocument();

    vi.useFakeTimers();
    await act(async () => {
      announceWordSaved({ term: "biblioteca", duplicate: false });
    });
    await act(async () => {
      vi.advanceTimersByTime(1_000);
    });
    vi.useRealTimers();

    /* Then feeding, which says it spends none of the shop's. */
    expect(getCoachStep()).toBe(stepOf("feed"));
    expect(screen.getByText(/It costs no energy cookies/)).toBeInTheDocument();
  });
});

describe("what's new, for a reader who had finished the tour", () => {
  /* The device a reader brings from the last edition: a finished tour, and
     no edition recorded, because the last edition did not record one. */
  function finishedLastEdition() {
    window.localStorage.clear();
    window.localStorage.setItem("yumi-coach-step", String(COACH_FINISHED));
    resetCoachCacheForTests();
  }

  afterEach(() => {
    window.localStorage.clear();
    resetCoachCacheForTests();
  });

  it("is only the steps this edition added, in tour order", () => {
    expect(REFRESH_STEPS.map((step) => step.key)).toEqual([
      "meet",
      "keep",
      "pronunciation",
      "cookies",
    ]);
  });

  it("shows them, labelled as new, and then is done for good", async () => {
    finishedLastEdition();

    const { again, container } = coach("/home");

    expect(getCoachTrack()).toBe("refresh");
    expect(screen.getByText("What’s new · 1/4")).toBeInTheDocument();

    vi.useFakeTimers();
    await act(async () => {
      announceHomeMoment("dial-turned");
    });
    await act(async () => {
      vi.advanceTimersByTime(1_000);
    });
    vi.useRealTimers();

    /* What a kept word earns, told rather than waited for: a returning
       reader has no answer up to keep from. */
    expect(screen.getByText("What’s new · 2/4")).toBeInTheDocument();
    expect(screen.getByText(/you get two things/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Skip this step" })).toBeNull();
    await act(async () => {
      screen.getByRole("button", { name: "Next" }).click();
    });

    /* The lab is somewhere else: a door, then the step on arrival. */
    expect(screen.getByRole("link", { name: "Open the Pronunciation Lab" })).toHaveAttribute(
      "href",
      "/pronunciation",
    );
    again("/pronunciation");
    expect(screen.getByText("What’s new · 3/4")).toBeInTheDocument();
    await act(async () => {
      screen.getByRole("button", { name: "Next" }).click();
    });

    expect(screen.getByRole("link", { name: "Back to Home" })).toHaveAttribute("href", "/home");
    again("/home");
    expect(screen.getByText("What’s new · 4/4")).toBeInTheDocument();
    expect(screen.getByText(/Energy cookies are my shop's money/)).toBeInTheDocument();

    /* The last of them is done by going in. */
    vi.useFakeTimers();
    again("/shop");
    await act(async () => {
      vi.advanceTimersByTime(1_000);
    });
    vi.useRealTimers();

    expect(container).toBeEmptyDOMElement();
    expect(getCoachStep()).toBe(COACH_FINISHED);
    expect(getCoachTrack()).toBe("full");

    /* Read fresh, as the next visit would: it does not come back. */
    resetCoachCacheForTests();
    expect(getCoachStep()).toBe(COACH_FINISHED);
    expect(getCoachTrack()).toBe("full");
  });

  it("does not come back after being skipped", async () => {
    finishedLastEdition();

    coach("/home");
    await act(async () => {
      screen.getByRole("button", { name: "Skip tour" }).click();
    });

    resetCoachCacheForTests();
    expect(getCoachStep()).toBe(COACH_FINISHED);
    expect(window.localStorage.getItem("yumi-coach-edition")).toBe(String(COACH_EDITION));
  });

  it("waits quietly in Cosmic instead of asking for a change of look", () => {
    finishedLastEdition();

    const { container } = coach("/home", "yumi-cosmic");

    expect(getCoachTrack()).toBe("refresh");
    expect(container).toBeEmptyDOMElement();
  });

  it("is not shown to a reader who never began a tour", () => {
    window.localStorage.clear();
    resetCoachCacheForTests();

    const { container } = coach("/home");

    expect(getCoachStep()).toBe(COACH_FINISHED);
    expect(getCoachTrack()).toBe("full");
    expect(container).toBeEmptyDOMElement();
  });

  it("gives a reader who starts the tour now the whole of it", () => {
    finishedLastEdition();
    expect(getCoachTrack()).toBe("refresh");

    act(() => armCoach());
    coach("/home");

    expect(getCoachTrack()).toBe("full");
    expect(screen.getByText("Chapter 1 · Home · 1/4")).toBeInTheDocument();
  });
});
