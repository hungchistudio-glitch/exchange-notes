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

    const { container } = render(<TutorialCoach />);

    expect(container).toBeEmptyDOMElement();
  });

  it("waits for the ring to actually open before moving on", async () => {
    render(<TutorialCoach />);

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
    render(<TutorialCoach />);

    /* Skip is always there — a tour nobody can leave is worse than one
       nobody finishes — but "Next" is not, because an instruction you can
       dismiss is a sentence rather than a step. */
    expect(screen.getByRole("button", { name: "Skip" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next" })).toBeNull();
  });

  it("does not count a word the reader already had as keeping one", async () => {
    setCoachStep(2); // keep

    render(<TutorialCoach />);

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

  it("lets the last two steps be pressed past, because they are invitations", () => {
    setCoachStep(4); // share

    render(<TutorialCoach />);

    expect(screen.getByRole("link", { name: "Open Messages" })).toHaveAttribute(
      "href",
      "/messages",
    );
    expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();
  });
});
