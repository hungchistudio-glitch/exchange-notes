import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

/* =========================================================
   The review page goes back to the door it was opened from
   (Chi, 2026-11-20: 從哪進來就回哪)

   Settings' "Continue review" opens it with ?from=settings; its back key
   then says "Back to Settings" and goes there, and its link to the week's
   card carries the door on so that card can send the reader back here.
   ========================================================= */

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));
const query = vi.hoisted(() => ({ value: "" }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(query.value) }));
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
vi.mock("@/lib/speech", async (original) => ({
  ...(await original<typeof import("@/lib/speech")>()), speak: vi.fn() }));

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

const backKey = () => screen.getByRole("link", { name: /^Back to/ });

describe("the review page's way back", () => {
  it("goes back to Settings when opened from Settings", async () => {
    query.value = "from=settings";
    words.due = [word("1", "bonjour")];
    render(<ReviewPage />);
    await screen.findByRole("list", { name: "Words due today" });

    expect(backKey()).toHaveAttribute("href", "/profile");
    expect(backKey()).toHaveAccessibleName("Back to Settings");
    for (const link of screen.getAllByRole("link").filter((a) => a.getAttribute("href")?.startsWith("/recap"))) {
      expect(link.getAttribute("href")).toContain("from=review-settings");
    }
  });

  it("still goes Home, or to the vocabulary list, as before", async () => {
    words.due = [word("1", "bonjour")];

    query.value = "";
    const home = render(<ReviewPage />);
    await screen.findByRole("list", { name: "Words due today" });
    expect(backKey()).toHaveAttribute("href", "/home");
    home.unmount();

    query.value = "from=vocabulary";
    render(<ReviewPage />);
    await screen.findByRole("list", { name: "Words due today" });
    expect(backKey()).toHaveAttribute("href", "/vocabulary");
  });
});
