import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

/* =========================================================
   Which words are waiting (Chi, 2026-11-13)

   A first reader was told one card was ready for review and could not tell
   which. The slab names the first few due words, and how many more.
   ========================================================= */

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("@/contexts/InterfaceModeContext", () => ({ useInterfaceMode: () => ({ isCosmic: false }) }));
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

const words = vi.hoisted(() => ({ due: [] as unknown[] }));

vi.mock("@/lib/review/getTodaysReview", () => ({
  getTodaysReview: vi.fn(async () => words.due),
  getAllReviewWords: vi.fn(async () => words.due),
  getReviewWords: vi.fn(async () => ({ due: words.due, all: words.due })),
}));
vi.mock("@/lib/review/saveReviewResult", () => ({
  saveReviewResult: vi.fn(),
  beginReviewRound: vi.fn(),
}));

import ReviewPage from "@/app/(protected)/review/page";

function word(id: string, term: string) {
  return { id, term, termLanguage: "fr", translation: term, translationLanguage: "en" };
}

describe("the review slab", () => {
  it("names the one word that is ready, with a singular label", async () => {
    words.due = [word("1", "bonjour")];

    render(<ReviewPage />);

    const list = await screen.findByRole("list", { name: "Words due today" });
    expect(within(list).getAllByRole("listitem").map((item) => item.textContent)).toEqual(["bonjour"]);
    expect(screen.getByText("Card ready")).toBeInTheDocument();
  });

  it("names the first six and counts the rest", async () => {
    words.due = ["un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit"].map((term, index) =>
      word(String(index), term),
    );

    render(<ReviewPage />);

    const list = await screen.findByRole("list", { name: "Words due today" });
    const items = within(list).getAllByRole("listitem").map((item) => item.textContent);
    expect(items).toEqual(["un", "deux", "trois", "quatre", "cinq", "six", "+2 more"]);
    expect(screen.getByText("Cards ready")).toBeInTheDocument();
  });
});
