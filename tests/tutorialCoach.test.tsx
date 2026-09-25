import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/* =========================================================
   A tour that waits for the reader

   The old one advanced when a button was pressed, which meant it could be
   finished without touching the app — and the page it spent describing the
   navigation described a dock that no longer exists.

   These are about the one property that makes this different: a step is
   satisfied by the thing actually happening, and by nothing else.
   ========================================================= */

vi.mock("@/hooks/preferences/useInterfaceLanguage", () => ({
  default: () => "english",
}));

const { announceHomeMoment } = await import("@/lib/home/homeMoments");
const { announceWordSaved } = await import("@/lib/pet/wordSaved");
const { COACH_FINISHED, setCoachStep } = await import(
  "@/lib/home/tutorialCoach"
);
const { default: TutorialCoach } = await import(
  "@/components/tutorial/TutorialCoach"
);

beforeEach(() => {
  vi.useRealTimers();
  setCoachStep(0);
});

describe("the doing tour", () => {
  it("draws nothing at all when nobody is mid-tour", () => {
    setCoachStep(COACH_FINISHED);

    const { container } = render(<TutorialCoach pathname="/home" isCosmic={false} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("waits for the ring to actually open before moving on", async () => {
    render(<TutorialCoach pathname="/home" isCosmic={false} />);

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
    render(<TutorialCoach pathname="/home" isCosmic={false} />);

    /* Skip is always there — a tour nobody can leave is worse than one
       nobody finishes — but "Next" is not, because an instruction you can
       dismiss is a sentence rather than a step. */
    expect(screen.getByRole("button", { name: "Skip" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next" })).toBeNull();
  });

  it("does not count a word the reader already had as keeping one", async () => {
    setCoachStep(2); // keep

    render(<TutorialCoach pathname="/home" isCosmic={false} />);

    expect(screen.getByText(/Every word you keep/)).toBeInTheDocument();

    await act(async () => {
      announceWordSaved({ term: "lamp", duplicate: true });
    });

    /* Saying "good" for a word that was already in the library would be the
       tour progressing itself on a thing that did not happen. */
    expect(screen.getByText(/Every word you keep/)).toBeInTheDocument();

    await act(async () => {
      announceWordSaved({ term: "biblioteca", duplicate: false });
    });

    expect(screen.getByText("Good.")).toBeInTheDocument();
  });

  /* ── Across the app ─────────────────────────────────────────────── */

  it("offers a door to a page step's screen, and does not advance for following it", () => {
    setCoachStep(5); // share, which happens on Messages

    render(<TutorialCoach pathname="/home" isCosmic={false} />);

    expect(screen.getByRole("link", { name: "Open Messages" })).toHaveAttribute(
      "href",
      "/messages",
    );
    /* Not on Messages yet: nothing to press past. */
    expect(screen.queryByRole("button", { name: "Next" })).toBeNull();
  });

  it("says the page step on its own screen, and lets it be pressed past there", () => {
    setCoachStep(5); // share

    render(<TutorialCoach pathname="/messages" isCosmic={false} />);

    expect(screen.getByText(/These are your Messages/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Open Messages" })).toBeNull();
    expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();
  });

  it("walks every main screen in order, and finishes", async () => {
    setCoachStep(4); // library

    const { rerender } = render(
      <TutorialCoach pathname="/vocabulary" isCosmic={false} />,
    );

    for (const [pathname, text] of [
      ["/vocabulary", /This is your Vocabulary/],
      ["/messages", /These are your Messages/],
      ["/notes", /These are your Notes/],
      ["/discover", /This is Discover/],
      ["/profile", /Last, Settings/],
    ] as const) {
      rerender(<TutorialCoach pathname={pathname} isCosmic={false} />);
      expect(screen.getByText(text)).toBeInTheDocument();
      await act(async () => {
        screen.getByRole("button", { name: "Next" }).click();
      });
    }

    expect(screen.getByText(/That is all of it/)).toBeInTheDocument();

    await act(async () => {
      screen.getByRole("button", { name: "Start" }).click();
    });

    expect(screen.queryByRole("status")).toBeNull();
  });

  it("steps aside on screens that are not one of the six", () => {
    setCoachStep(5); // share

    const { container } = render(
      <TutorialCoach pathname="/messages/some-conversation" isCosmic={false} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("leaves out the ring and the cookies in Cosmic Mode, which has neither", () => {
    setCoachStep(0); // meet — Standard only

    render(<TutorialCoach pathname="/home" isCosmic />);

    expect(screen.queryByText(/Pull my eye/)).toBeNull();
    expect(screen.getByText(/Look something up/)).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 8")).toBeInTheDocument();
  });

  /* ── When the dictionary does not answer ───────────────────────────── */

  it("does not leave the reader stuck on keep when there was nothing to keep", async () => {
    setCoachStep(1); // ask

    render(<TutorialCoach pathname="/home" isCosmic={false} />);

    /* A lookup that came back without a meaning still counts as asking… */
    vi.useFakeTimers();
    await act(async () => {
      announceHomeMoment("word-unavailable");
    });
    await act(async () => {
      vi.advanceTimersByTime(1_000);
    });
    vi.useRealTimers();

    /* …and the keep step says so, with a way on, instead of waiting for a
       save the disabled button can never make. */
    expect(screen.getByText(/came back without a meaning/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();

    /* A real answer afterwards puts the ordinary keep step back. */
    await act(async () => {
      announceHomeMoment("word-answered");
    });

    expect(screen.getByText(/Every word you keep/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next" })).toBeNull();
  });
});
