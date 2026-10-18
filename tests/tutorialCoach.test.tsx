import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* =========================================================
   A tour that waits for the reader — in three chapters

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

    expect(screen.getByText("Chapter 1 · Home · 1/6")).toBeInTheDocument();
  });

  it("waits for the ring to actually open before moving on", async () => {
    coach();

    expect(screen.getByText(/a dial opens around me/)).toBeInTheDocument();

    /* The wrong event must do nothing: a reader who looked a word up without
       ever opening the ring has not done step one. */
    await act(async () => {
      announceHomeMoment("word-answered");
    });

    expect(screen.getByText(/a dial opens around me/)).toBeInTheDocument();

    await act(async () => {
      announceHomeMoment("ring-opened");
    });

    expect(screen.getByText("Good.")).toBeInTheDocument();
  });

  it("offers no way to press past a step that is waiting", () => {
    coach();

    /* Skip is always there — a tour nobody can leave is worse than one
       nobody finishes — but "Next" is not, because an instruction you can
       dismiss is a sentence rather than a step. */
    expect(screen.getByRole("button", { name: "Skip" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next" })).toBeNull();
  });

  it("does not count a word the reader already had as keeping one", async () => {
    setCoachStep(stepOf("keep"));

    coach();

    expect(screen.getByText(/it earns you two things/)).toBeInTheDocument();

    await act(async () => {
      announceWordSaved({ term: "lamp", duplicate: true });
    });

    expect(screen.getByText(/it earns you two things/)).toBeInTheDocument();

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

    expect(screen.getByText(/it earns you two things/)).toBeInTheDocument();
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
      ["/vocabulary", /This is your Vocabulary/, "1/7"],
      ["/review", /Pass every card in a round and you earn three energy cookies/, "2/7"],
      ["/pronunciation", /This is the Pronunciation Lab/, "3/7"],
      ["/messages", /These are your Messages/, "4/7"],
      ["/notes", /These are your Notes/, "5/7"],
      ["/discover", /This is Discover/, "6/7"],
      ["/profile", /This is Settings/, "7/7"],
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
  it("shows where cookies come from at the shop key, then waits for a try-on in the shop", async () => {
    setCoachStep(stepOf("cookies"));

    const { again, container } = coach("/home");
    expect(screen.getByText("Chapter 3 · Yumi’s shop · 1/4")).toBeInTheDocument();
    /* The card names the step, which is what makes the shop key show itself
       and breathe (HomeShopKey.module.css) while the card is up. */
    expect(container.querySelector("[data-coach-card]")).toHaveAttribute("data-coach-step", "cookies");
    await act(async () => {
      screen.getByRole("button", { name: "Next" }).click();
    });

    /* Not in the shop yet: a door, and nothing else to press. */
    again("/home");
    expect(screen.getByRole("link", { name: "Open the shop" })).toHaveAttribute("href", "/shop");

    /* In the shop, the wallet first: it waits for the balance to be opened. */
    again("/shop");
    expect(screen.getByText(/The cookie count at the top is your energy supply/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next" })).toBeNull();

    vi.useFakeTimers();
    act(() => announceHomeMoment("shop-tried"));
    expect(screen.queryByText("Good.")).toBeNull();
    act(() => announceHomeMoment("shop-wallet-opened"));
    expect(screen.getByText("Good.")).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(1_000);
    });
    vi.useRealTimers();

    expect(screen.getByText(/Tap any piece and I’ll try it on for free/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next" })).toBeNull();

    vi.useFakeTimers();
    act(() => announceHomeMoment("shop-tried"));
    expect(screen.getByText("Good.")).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(1_000);
    });
    vi.useRealTimers();

    expect(getCoachStep()).toBe(stepOf("buy"));
    expect(screen.getByText(/Cookies are only spent once you confirm/)).toBeInTheDocument();
    await act(async () => {
      screen.getByRole("button", { name: "Next" }).click();
    });
    expect(getCoachStep()).toBe(stepOf("modeSwitch"));
  });
});

describe("chapter four: the other look", () => {
  it("teaches the switch on Home, and waits for it and for the crossing to finish", async () => {
    setCoachStep(stepOf("modeSwitch"));

    const { again, container } = coach("/home");

    expect(screen.getByText("Chapter 4 · The other look · 1/6")).toBeInTheDocument();
    expect(screen.getByText(/Tap the switch at the top right, beside the star/)).toBeInTheDocument();
    /* The card names the step, which is what lets the switch show itself
       (HomeModePortal.module.css) while every other step keeps it hidden. */
    expect(container.querySelector("[data-coach-card]")).toHaveAttribute("data-coach-step", "modeSwitch");
    /* The only way on is the switch itself. */
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

  it("names the deck's systems exactly as the deck does", () => {
    setCoachStep(stepOf("deck"));

    coach("/home", "yumi-cosmic");

    expect(
      screen.getByText(/Lexicon Core, Mission Control, Menu Translator, Comms, Earth Signal and Memory Deck/),
    ).toBeInTheDocument();
  });

  it("ends by asking which look to keep, and goes there", () => {
    setCoachStep(stepOf("choose"));

    const { onSetMode } = coach("/home", "yumi-cosmic");

    expect(screen.queryByRole("button", { name: "Skip" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Start in Standard Mode" }));

    expect(onSetMode).toHaveBeenCalledWith("standard");
    expect(getCoachStep()).toBe(COACH_FINISHED);
  });
});

describe("the dial, and what a kept word earns (2026-10-18)", () => {
  it("waits for the dial to be turned, not merely opened", async () => {
    setCoachStep(stepOf("dial"));

    coach();

    expect(screen.getByText(/Turn the dial/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next" })).toBeNull();

    await act(async () => {
      announceHomeMoment("ring-opened");
    });
    expect(screen.queryByText("Good.")).toBeNull();

    await act(async () => {
      announceHomeMoment("dial-turned");
    });
    expect(screen.getByText("Good.")).toBeInTheDocument();
  });

  it("says, straight after the save, that one word earns two different cookies", async () => {
    setCoachStep(stepOf("keep"));

    coach();

    vi.useFakeTimers();
    await act(async () => {
      announceWordSaved({ term: "biblioteca", duplicate: false });
    });
    await act(async () => {
      vi.advanceTimersByTime(1_000);
    });
    vi.useRealTimers();

    expect(getCoachStep()).toBe(stepOf("earned"));
    expect(screen.getByText(/One word, two uses/)).toBeInTheDocument();
    expect(screen.getByText(/Feeding me never spends your energy cookies/)).toBeInTheDocument();

    /* Only telling: it is read, and then the reader moves on to feeding. */
    await act(async () => {
      screen.getByRole("button", { name: "Next" }).click();
    });
    expect(getCoachStep()).toBe(stepOf("feed"));
    expect(screen.getByText(/doesn’t cost a single energy cookie/)).toBeInTheDocument();
  });

  it("names the step on the card, so the shop key can stay in view under it", () => {
    setCoachStep(stepOf("earned"));

    const { container } = coach();

    expect(container.querySelector("[data-coach-card]")).toHaveAttribute("data-coach-step", "earned");
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
      "dial",
      "earned",
      "pronunciation",
      "cookies",
      "wallet",
    ]);
  });

  it("shows them, labelled as new, and then is done for good", async () => {
    finishedLastEdition();

    const { again, container } = coach("/home");

    expect(getCoachTrack()).toBe("refresh");
    expect(screen.getByText("What’s new · 1/5")).toBeInTheDocument();

    vi.useFakeTimers();
    await act(async () => {
      announceHomeMoment("dial-turned");
    });
    await act(async () => {
      vi.advanceTimersByTime(1_000);
    });
    vi.useRealTimers();

    expect(screen.getByText("What’s new · 2/5")).toBeInTheDocument();
    expect(screen.getByText(/One word, two uses/)).toBeInTheDocument();
    await act(async () => {
      screen.getByRole("button", { name: "Next" }).click();
    });

    /* The lab is somewhere else: a door, then the step on arrival. */
    expect(screen.getByRole("link", { name: "Open the Pronunciation Lab" })).toHaveAttribute(
      "href",
      "/pronunciation",
    );
    again("/pronunciation");
    expect(screen.getByText("What’s new · 3/5")).toBeInTheDocument();
    await act(async () => {
      screen.getByRole("button", { name: "Next" }).click();
    });

    again("/home");
    expect(screen.getByText(/Energy cookies are my shop’s money/)).toBeInTheDocument();
    await act(async () => {
      screen.getByRole("button", { name: "Next" }).click();
    });

    again("/shop");
    expect(screen.getByText("What’s new · 5/5")).toBeInTheDocument();
    vi.useFakeTimers();
    await act(async () => {
      announceHomeMoment("shop-wallet-opened");
    });
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
      screen.getByRole("button", { name: "Skip" }).click();
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
    expect(screen.getByText("Chapter 1 · Home · 1/6")).toBeInTheDocument();
  });
});
