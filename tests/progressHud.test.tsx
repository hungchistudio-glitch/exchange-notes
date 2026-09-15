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
    expect(screen.getByText(copy.retention).parentElement).toHaveTextContent("37%");
    expect(screen.getByText(copy.mastered).parentElement).toHaveTextContent("1");
    expect(screen.getByText(copy.reviewed).parentElement).toHaveTextContent("8");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByText("—")).not.toBeInTheDocument();
    expect(mocks.fetchVocabulary).toHaveBeenCalledWith("reader");
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
