import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  saveReviewResult: vi.fn(),
  beginReviewRound: vi.fn(),
}));

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/contexts/InterfaceModeContext", () => ({
  useInterfaceMode: () => ({ isCosmic: false }),
}));

vi.mock("@/components/foundation/layout/Screen", () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/cosmic/MissionLaunchStage", () => ({ default: () => null }));
vi.mock("@/components/cosmic/MissionCompleteStage", () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
vi.mock("@/components/language/LanguageOriginBadge", () => ({
  default: ({ language }: { language: string }) => <span>{language}</span>,
}));
vi.mock("@/lib/speech", () => ({ speak: vi.fn() }));

vi.mock("@/lib/review/getTodaysReview", () => {
  const words = [
    {
      id: "first",
      term: "bonjour",
      termLanguage: "fr",
      translation: "hello",
      translationLanguage: "en",
    },
    {
      id: "second",
      term: "ciao",
      termLanguage: "it",
      translation: "hi",
      translationLanguage: "en",
    },
  ];

  return {
    getTodaysReview: vi.fn().mockResolvedValue(words),
    getAllReviewWords: vi.fn().mockResolvedValue(words),
    getReviewWords: vi.fn().mockResolvedValue({ due: words, all: words }),
  };
});

vi.mock("@/lib/review/saveReviewResult", () => ({
  saveReviewResult: mocks.saveReviewResult,
  beginReviewRound: mocks.beginReviewRound,
}));

import ReviewPage from "@/app/(protected)/review/page";

/**
 * Starts the round once the words are in. The key is on screen, disabled,
 * from the first render; a click before the words load does nothing, and on
 * a busy machine findByRole can return that early.
 */
async function startReview() {
  const start = await screen.findByRole("button", { name: /Start review/i });
  await waitFor(() => expect(start).toBeEnabled());
  fireEvent.click(start);
}

describe("review persistence failures", () => {
  beforeEach(() => {
    mocks.saveReviewResult.mockReset();
    mocks.beginReviewRound.mockReset().mockResolvedValue(undefined);
  });

  it("keeps the current card until its grade is actually saved", async () => {
    mocks.saveReviewResult
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(undefined);

    render(<ReviewPage />);

    await startReview();
    fireEvent.click(await screen.findByRole("button", { name: /Reveal answer/i }));
    fireEvent.click(screen.getByRole("button", { name: /Good Remembered/i }));

    expect(await screen.findByText("Unable to save this review.")).toBeInTheDocument();
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
    expect(screen.getByText("bonjour")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Good Remembered/i }));

    await waitFor(() => expect(screen.getByText("2 / 2")).toBeInTheDocument());
    expect(screen.queryByText("Unable to save this review.")).not.toBeInTheDocument();
    expect(screen.getByText("hi")).toBeInTheDocument();
  });

  it("grades every card against the review round it opened, for the round's cookies", async () => {
    mocks.saveReviewResult.mockResolvedValue(undefined);

    render(<ReviewPage />);

    await startReview();
    fireEvent.click(await screen.findByRole("button", { name: /Reveal answer/i }));

    expect(mocks.beginReviewRound).toHaveBeenCalledTimes(1);
    const [ids, roundId] = mocks.beginReviewRound.mock.calls[0];
    expect(ids).toEqual(["first", "second"]);
    expect(roundId).toMatch(/^[0-9a-f-]{36}$/);

    fireEvent.click(screen.getByRole("button", { name: /Good Remembered/i }));
    await waitFor(() => expect(mocks.saveReviewResult).toHaveBeenCalledWith("first", "good", roundId));
  });

  it("still reviews when the round cannot be opened, just without its cookies", async () => {
    mocks.beginReviewRound.mockRejectedValueOnce(new Error("offline"));
    mocks.saveReviewResult.mockResolvedValue(undefined);
    const quiet = vi.spyOn(console, "error").mockImplementation(() => {});

    render(<ReviewPage />);

    await startReview();
    fireEvent.click(await screen.findByRole("button", { name: /Reveal answer/i }));
    fireEvent.click(screen.getByRole("button", { name: /Good Remembered/i }));

    await waitFor(() => expect(mocks.saveReviewResult).toHaveBeenCalledWith("first", "good", undefined));
    quiet.mockRestore();
  });
});
