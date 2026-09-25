import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
const { COACH_FINISHED, getCoachStep, setCoachStep } = await import(
  "@/lib/home/tutorialCoach"
);
const { default: TutorialCoach } = await import(
  "@/components/tutorial/TutorialCoach"
);

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

  it("waits for the ring to actually open before moving on", async () => {
    coach();

    expect(screen.getByText(/Pull my eye/)).toBeInTheDocument();

    /* The wrong event must do nothing: a reader who looked a word up without
       ever opening the ring has not done step one. */
    await act(async () => {
      announceHomeMoment("word-answered");
    });

    expect(screen.getByText(/Pull my eye/)).toBeInTheDocument();

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
    setCoachStep(2); // keep

    coach();

    expect(screen.getByText(/Every word you keep/)).toBeInTheDocument();

    await act(async () => {
      announceWordSaved({ term: "lamp", duplicate: true });
    });

    expect(screen.getByText(/Every word you keep/)).toBeInTheDocument();

    await act(async () => {
      announceWordSaved({ term: "biblioteca", duplicate: false });
    });

    expect(screen.getByText("Good.")).toBeInTheDocument();
  });

  it("does not leave the reader stuck on keep when there was nothing to keep", async () => {
    setCoachStep(1); // ask

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

    expect(screen.getByText(/Every word you keep/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next" })).toBeNull();
  });

  it("starts in Standard Mode, and offers the switch to a reader in Cosmic", () => {
    const { onSetMode } = coach("/home", "yumi-cosmic");

    expect(screen.getByText(/This part of the tour happens in Standard Mode/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Switch to Standard Mode" }));

    expect(onSetMode).toHaveBeenCalledWith("standard");
  });
});

describe("chapter two: around the app", () => {
  it("offers a door to a page step's screen, and does not advance for following it", () => {
    setCoachStep(5); // share, which happens on Messages

    coach("/home");

    expect(screen.getByRole("link", { name: "Open Messages" })).toHaveAttribute(
      "href",
      "/messages",
    );
    expect(screen.queryByRole("button", { name: "Next" })).toBeNull();
  });

  it("walks every main screen in order", async () => {
    setCoachStep(4); // library

    const { again } = coach("/vocabulary");

    for (const [pathname, text, position] of [
      ["/vocabulary", /This is your Vocabulary/, "1/5"],
      ["/messages", /These are your Messages/, "2/5"],
      ["/notes", /These are your Notes/, "3/5"],
      ["/discover", /This is Discover/, "4/5"],
      ["/profile", /This is Settings/, "5/5"],
    ] as const) {
      again(pathname);
      expect(screen.getByText(text)).toBeInTheDocument();
      expect(screen.getByText(`Chapter 2 · Around the app · ${position}`)).toBeInTheDocument();
      await act(async () => {
        screen.getByRole("button", { name: "Next" }).click();
      });
    }

    expect(screen.getByText(/Exchange Notes has two looks/)).toBeInTheDocument();
  });

  it("steps aside on screens that are not one of the six", () => {
    setCoachStep(5);

    const { container } = coach("/messages/some-conversation");

    expect(container).toBeEmptyDOMElement();
  });
});

describe("chapter three: the other look", () => {
  it("waits for the reader to switch, and for the deck to finish waking", async () => {
    setCoachStep(9); // modeSwitch

    const { again } = coach("/profile");

    expect(screen.getByText("Chapter 3 · The other look · 1/6")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Show me Interface mode" }),
    ).toBeInTheDocument();

    /* Mid-animation: nothing drawn over the deck waking up. */
    again("/profile", "yumi-cosmic", { switching: true });
    expect(screen.queryByRole("status")).toBeNull();

    vi.useFakeTimers();
    again("/profile", "yumi-cosmic");
    expect(screen.getByText("Good.")).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(1_000);
    });
    vi.useRealTimers();

    expect(getCoachStep()).toBe(10); // deck
  });

  it("takes the reader to the deck by itself after the switch", () => {
    setCoachStep(10); // deck

    const { onNavigate } = coach("/profile", "yumi-cosmic");

    expect(onNavigate).toHaveBeenCalledWith("/home");
  });

  it("names the deck's systems exactly as the deck does", () => {
    setCoachStep(10);

    coach("/home", "yumi-cosmic");

    expect(
      screen.getByText(/Lexicon Core, Mission Control, Menu Translator, Comms, Earth Signal and Memory Deck/),
    ).toBeInTheDocument();
  });

  it("ends by asking which look to keep, and goes there", () => {
    setCoachStep(14); // choose

    const { onSetMode } = coach("/home", "yumi-cosmic");

    expect(screen.queryByRole("button", { name: "Skip" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Start in Standard Mode" }));

    expect(onSetMode).toHaveBeenCalledWith("standard");
    expect(getCoachStep()).toBe(COACH_FINISHED);
  });
});
