import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ProgressHud from "@/components/cosmic/ProgressHud";
import english from "@/lib/i18n/en";
import type { VocabularyItem } from "@/lib/types/app";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  fetchVocabulary: vi.fn(),
}));

vi.mock("@/lib/vocabulary/repository", () => mocks);

vi.mock("@/hooks/preferences/useInterfaceLanguage", () => ({
  default: () => "english",
}));

vi.mock("@/hooks/preferences/useDailyGoalWords", () => ({
  default: () => 8,
}));

const copy = english.cosmic.hud;
const today = "2026-09-15T12:00:00.000Z";
const yesterday = "2026-09-14T12:00:00.000Z";

function word(overrides: Partial<VocabularyItem>): VocabularyItem {
  return {
    id: "word",
    user_id: "reader",
    word: "bonjour",
    translation: "hello",
    language: "fr",
    word_language: "fr",
    translation_language: "en",
    texts: { fr: "bonjour", en: "hello" },
    examples: {},
    category: "other",
    favorite: false,
    part_of_speech: null,
    example_sentence: null,
    translated_example: null,
    image_url: null,
    confidence: null,
    status: "new",
    created_at: today,
    updated_at: today,
    ...overrides,
  };
}

function panel() {
  return screen.getByRole("heading", { name: copy.title }).closest("section");
}

async function renderAndFind(text: string) {
  render(<ProgressHud />);
  return screen.findByText(text);
}

describe("Cosmic progress readings", () => {
  beforeEach(() => {
    // Keep real timers for async rendering while pinning calendar-day and
    // retention calculations to the same instant.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(today));
    mocks.getCurrentUser.mockReset().mockResolvedValue({ user: { id: "reader" } });
    mocks.fetchVocabulary.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("ends loading and keeps every reading unavailable when the history fetch fails", async () => {
    mocks.fetchVocabulary.mockRejectedValue(new Error("Network unavailable"));

    render(<ProgressHud />);

    expect(panel()).toHaveAttribute("aria-busy", "true");
    expect(screen.getAllByText("—")).toHaveLength(5);

    expect(await screen.findByRole("alert")).toHaveTextContent(english.common.error);
    expect(panel()).toHaveAttribute("aria-busy", "false");
    expect(screen.getAllByText("—")).toHaveLength(5);
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
    expect(screen.queryByText("100%")).not.toBeInTheDocument();
    expect(mocks.fetchVocabulary).toHaveBeenCalledWith("reader");
  });

  /* =========================================================
     Which kind of empty the dashes mean

     A dash is the honest reading for "the accuracy of no reviews", and it is
     the same dash whether the history is still arriving, failed to arrive, or
     arrived holding nothing. Only the last of those leaves a reader looking at
     five empty gauges with no idea whether the panel is broken or simply not
     started, and it is the only one this line is for — saying "nothing
     reviewed yet" over a history that is still loading would be the same lie
     the dashes exist to avoid.
     ========================================================= */

  it("says nothing has been reviewed once an empty history has actually arrived", async () => {
    mocks.fetchVocabulary.mockResolvedValue([]);

    render(<ProgressHud />);

    // Not while it is still arriving.
    expect(screen.queryByText(copy.noReadings)).not.toBeInTheDocument();

    expect(await screen.findByText(copy.noReadings)).toBeInTheDocument();
    expect(panel()).toHaveAttribute("aria-busy", "false");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("says it for a history that holds words nobody has reviewed yet", async () => {
    mocks.fetchVocabulary.mockResolvedValue([word({ id: "fresh" })]);

    expect(await renderAndFind(copy.noReadings)).toBeInTheDocument();
  });

  it("stays quiet when the history could not be fetched at all", async () => {
    mocks.fetchVocabulary.mockRejectedValue(new Error("Network unavailable"));

    render(<ProgressHud />);

    // The alert already says what went wrong; two explanations for one set of
    // dashes is worse than one.
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText(copy.noReadings)).not.toBeInTheDocument();
  });

  it("stops saying it as soon as there is a single review behind the readings", async () => {
    mocks.fetchVocabulary.mockResolvedValue([
      word({
        id: "reviewed",
        status: "learning",
        review_count: 1,
        correct_count: 1,
        last_reviewed_at: yesterday,
        review_interval: 1,
      }),
    ]);

    render(<ProgressHud />);

    await waitFor(() => expect(panel()).toHaveAttribute("aria-busy", "false"));
    expect(screen.queryByText(copy.noReadings)).not.toBeInTheDocument();
  });

  it("shows the fetched history's actual statistics and the selected daily goal", async () => {
    // Six correct answers out of eight reviews; both reviewed words were
    // last seen one interval ago. Only two of the three words were added today.
    mocks.fetchVocabulary.mockResolvedValue([
      word({
        id: "mastered",
        status: "mastered",
        review_count: 3,
        correct_count: 2,
        last_reviewed_at: yesterday,
        review_interval: 1,
      }),
      word({
        id: "learning",
        status: "learning",
        review_count: 5,
        correct_count: 4,
        last_reviewed_at: yesterday,
        review_interval: 1,
      }),
      word({ id: "older", created_at: yesterday }),
    ]);

    render(<ProgressHud />);

    await waitFor(() => expect(panel()).toHaveAttribute("aria-busy", "false"));

    expect(screen.getByText(copy.dailyGoal).parentElement).toHaveTextContent("2/8");
    expect(screen.getByText(copy.accuracy).parentElement).toHaveTextContent("75%");
    /*
     * Both were last reviewed exactly one interval ago — on schedule, which
     * is the moment SM-2 aims at and aims at because the word is still held
     * about nine times in ten. This expected 37% before, which was the old
     * curve's 1/e and said the opposite of what the schedule meant.
     */
    expect(screen.getByText(copy.retention).parentElement).toHaveTextContent("90%");
    expect(screen.getByText(copy.mastered).parentElement).toHaveTextContent("1");
    expect(screen.getByText(copy.reviewed).parentElement).toHaveTextContent("8");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText("—")).not.toBeInTheDocument();
    expect(mocks.fetchVocabulary).toHaveBeenCalledWith("reader");
  });

  it("points a scale only where there is a maximum to read it against", async () => {
    mocks.fetchVocabulary.mockResolvedValue([
      word({
        id: "reviewed",
        review_count: 4,
        correct_count: 3,
        last_reviewed_at: yesterday,
        review_interval: 1,
      }),
    ]);

    const { container } = render(<ProgressHud />);

    await waitFor(() => expect(panel()).toHaveAttribute("aria-busy", "false"));

    /*
     * Accuracy and retention are rates out of a hundred, so their scales set
     * the reading as a custom property and carry a pointer. "Words mastered"
     * and "reviews done" are counts with no full mark, and a pointer there
     * would be drawn against a maximum nobody set — so those two cards get a
     * plain counter and no scale at all. Asserted on the inline property
     * rather than on a class name, because that is the thing that is actually
     * load-bearing: however the two counts are drawn, exactly two elements on
     * this panel may carry a reading.
     */
    const pointed = container.querySelectorAll('[style*="--progress"]');

    expect(pointed).toHaveLength(2);
  });

  it("dashes the two rates before the first review, and still counts the words", async () => {
    // Saved two words today, reviewed neither. Accuracy has no answers to
    // divide and retention has no interval to decay, so the maths falls back
    // to 0% beside 100% — a verdict on someone who has not started.
    mocks.fetchVocabulary.mockResolvedValue([
      word({ id: "first" }),
      word({ id: "second" }),
    ]);

    render(<ProgressHud />);

    await waitFor(() => expect(panel()).toHaveAttribute("aria-busy", "false"));

    expect(screen.getByText(copy.accuracy).parentElement).toHaveTextContent("—");
    expect(screen.getByText(copy.retention).parentElement).toHaveTextContent("—");
    expect(screen.queryByText("100%")).not.toBeInTheDocument();
    expect(screen.queryByText("0%")).not.toBeInTheDocument();

    // The counts either side of them are real and are still shown.
    expect(screen.getByText(copy.dailyGoal).parentElement).toHaveTextContent("2/8");
    expect(screen.getByText(copy.mastered).parentElement).toHaveTextContent("0");
    expect(screen.getByText(copy.reviewed).parentElement).toHaveTextContent("0");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
