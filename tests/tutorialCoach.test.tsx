import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* =========================================================
   A tour that waits for the reader — in five chapters

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

    expect(screen.getByText("Chapter 1 · Home · 1/5")).toBeInTheDocument();
  });

  it("ticks the dial's three moves off as they happen, and is done when a key is tapped", async () => {
    coach();

    const line = (text: string) => screen.getByText(text).closest("li");
    const open = "Tap me to open the dial";
    const turn = "Turn the dial to another place";
    const enter = "Turn to Search and tap it to go in";

    /* The line to do now is marked, so a first reader can see where they
       are (Chi, 2026-11-13). */
    expect(line(open)).toHaveAttribute("data-state", "now");
    expect(line(turn)).toHaveAttribute("data-state", "later");

    /* The wrong events must do nothing. */
    await act(async () => {
      announceHomeMoment("word-answered");
    });
    expect(line(open)).toHaveAttribute("data-state", "now");

    await act(async () => {
      announceHomeMoment("ring-opened");
    });
    expect(line(open)).toHaveAttribute("data-state", "done");
    expect(line(turn)).toHaveAttribute("data-state", "now");

    await act(async () => {
      announceHomeMoment("dial-turned");
    });
    expect(line(turn)).toHaveAttribute("data-state", "done");
    expect(line(enter)).toHaveAttribute("data-state", "now");

    /* Opened and turned is not yet in: only a tapped key goes in. */
    expect(screen.queryByText("Good.")).toBeNull();

    await act(async () => {
      announceHomeMoment("dial-chosen");
    });

    expect(screen.getByText("Good.")).toBeInTheDocument();
    expect(line(enter)).toHaveAttribute("data-state", "done");
  });

  it("counts a later move as the earlier ones too", async () => {
    coach();

    await act(async () => {
      announceHomeMoment("dial-turned");
    });

    expect(screen.getByText("Tap me to open the dial").closest("li")).toHaveAttribute("data-state", "done");
    expect(screen.getByText("Turn the dial to another place").closest("li")).toHaveAttribute("data-state", "done");
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
    expect(screen.getByText(/Now look a word up for me/)).toBeInTheDocument();
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

    /* The iPhone's step is passed over in a browser, and not counted. */
    for (const [pathname, text, position] of [
      ["/vocabulary", /Each cell in Daily focus is one word due for review today/, "1/8"],
      ["/vocabulary", /Tap me here and my halo opens/, "2/8"],
      ["/review", /A perfect round earns 3 energy cookies/, "3/8"],
      ["/pronunciation", /Pronunciation Lab: watch how I shape each sound/, "4/8"],
      ["/messages", /Messages: add a friend/, "5/8"],
      ["/notes", /Notes: for what a single word can't hold/, "6/8"],
      ["/discover", /Discover: a few news stories a day/, "7/8"],
      ["/profile", /Settings: change languages/, "8/8"],
    ] as const) {
      again(pathname);
      expect(screen.getByText(text)).toBeInTheDocument();
      expect(screen.getByText(`Chapter 2 · Around the app · ${position}`)).toBeInTheDocument();
      await act(async () => {
        screen.getByRole("button", { name: "Next" }).click();
      });
    }

    // Then the shop, on Home, before the other look.
    expect(screen.getByText(/Saving a word for the first time earns 3 energy cookies/)).toBeInTheDocument();
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

    expect(getCoachStep()).toBe(stepOf("games"));
  });
});

describe("chapter four: the games (2026-11-13)", () => {
  it("lights the games key on Home and is done by going in, then shows the way back", async () => {
    setCoachStep(stepOf("games"));

    const { again, container } = coach("/home");
    expect(screen.getByText("Chapter 4 · Games · 1/1")).toBeInTheDocument();
    expect(screen.getByText(/The controller at the top opens three word games/)).toBeInTheDocument();
    expect(container.querySelector("[data-coach-card]")).toHaveAttribute("data-coach-step", "games");
    expect(screen.queryByRole("button", { name: "Next" })).toBeNull();

    vi.useFakeTimers();
    again("/games");
    expect(screen.getByText("Good.")).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(1_000);
    });
    vi.useRealTimers();

    /* In the games, the next step is on Home: a door back, not silence. */
    expect(getCoachStep()).toBe(stepOf("modeSwitch"));
    again("/games");
    expect(screen.getByRole("link", { name: "Back to Home" })).toHaveAttribute("href", "/home");
  });
});

describe("the iPhone's step (Yumi Pocket Lookup)", () => {
  type BridgeWindow = Window & { webkit?: unknown };

  afterEach(() => {
    delete (window as BridgeWindow).webkit;
  });

  it("is said inside the iPhone app, after Settings", async () => {
    (window as BridgeWindow).webkit = { messageHandlers: { yumiPocketKey: { postMessage() {} } } };
    setCoachStep(stepOf("settings"));

    coach("/profile");
    expect(screen.getByText("Chapter 2 · Around the app · 8/9")).toBeInTheDocument();
    await act(async () => {
      screen.getByRole("button", { name: "Next" }).click();
    });

    expect(getCoachStep()).toBe(stepOf("pocket"));
    expect(screen.getByText(/add the Exchange Notes widget/)).toBeInTheDocument();
    expect(screen.getByText("Chapter 2 · Around the app · 9/9")).toBeInTheDocument();
  });

  it("is passed over in a browser", async () => {
    setCoachStep(stepOf("settings"));

    coach("/profile");
    await act(async () => {
      screen.getByRole("button", { name: "Next" }).click();
    });

    expect(getCoachStep()).toBe(stepOf("cookies"));
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

    expect(screen.getByText("Chapter 5 · The other look · 1/3")).toBeInTheDocument();
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

    /* The obsidian bridge (2026-11-12): the six fold into the orbit key,
       the search sits just under Yumi, and the core at the foot opens the
       rail (2026-11-13: no scanner on the deck any more, no dock). */
    expect(
      screen.getByText(/orbit key beside me\. Yumi OmniLexicon is just below: type, speak or take a photo.*Tap the core at the very foot/),
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

    expect(screen.getByText(/a cookie on Home to feed me, and \+3 energy cookies for the shop/)).toBeInTheDocument();

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

  /* A device that finished a recorded edition. */
  function finishedEdition(edition: number) {
    window.localStorage.clear();
    window.localStorage.setItem("yumi-coach-step", String(COACH_FINISHED));
    window.localStorage.setItem("yumi-coach-edition", String(edition));
    resetCoachCacheForTests();
  }

  const next = () =>
    act(async () => {
      screen.getByRole("button", { name: "Next" }).click();
    });

  it("is only the steps this edition added, in tour order", () => {
    expect(REFRESH_STEPS.map((step) => step.key)).toEqual([
      "voice",
      "library",
      "halo",
      "pocket",
      "games",
    ]);
  });

  it("shows them, labelled as new, and then is done for good", async () => {
    finishedEdition(2);

    const { again, container } = coach("/home");

    expect(getCoachTrack()).toBe("refresh");
    expect(screen.getByText("What’s new · 1/4")).toBeInTheDocument();
    expect(screen.getByText(/tap the microphone in the search field/)).toBeInTheDocument();
    await next();

    /* The library is somewhere else: a door, then the steps on arrival. */
    expect(screen.getByRole("link", { name: "Open Vocabulary" })).toHaveAttribute("href", "/vocabulary");
    again("/vocabulary");
    expect(screen.getByText("What’s new · 2/4")).toBeInTheDocument();
    expect(screen.getByText(/Each cell in Daily focus/)).toBeInTheDocument();
    await next();
    expect(screen.getByText("What’s new · 3/4")).toBeInTheDocument();
    expect(screen.getByText(/my halo opens/)).toBeInTheDocument();
    await next();

    /* The iPhone's step is passed over in a browser; the games are on Home. */
    expect(screen.getByRole("link", { name: "Back to Home" })).toHaveAttribute("href", "/home");
    again("/home");
    expect(screen.getByText("What’s new · 4/4")).toBeInTheDocument();
    expect(screen.getByText(/three word games/)).toBeInTheDocument();

    /* The last of them is done by going in. */
    vi.useFakeTimers();
    again("/games");
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

  it("shows a reader two editions behind what both of them added", () => {
    finishedLastEdition();

    coach("/home");

    /* meet, keep, voice, library, halo, pronunciation, cookies, games. */
    expect(getCoachTrack()).toBe("refresh");
    expect(screen.getByText("What’s new · 1/8")).toBeInTheDocument();
    expect(screen.getByText(/Tap me to open the dial/)).toBeInTheDocument();
  });

  it("remembers on a later visit which edition the reader had finished", () => {
    finishedEdition(2);
    coach("/home").unmount();

    /* The next visit reads the device afresh. */
    resetCoachCacheForTests();
    coach("/home");

    expect(getCoachTrack()).toBe("refresh");
    expect(screen.getByText("What’s new · 1/4")).toBeInTheDocument();
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
    expect(screen.getByText("Chapter 1 · Home · 1/5")).toBeInTheDocument();
  });
});
