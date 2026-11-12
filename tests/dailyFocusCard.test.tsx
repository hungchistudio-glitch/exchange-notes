import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({
  default: ({ children, href, onClick, className }: { children: React.ReactNode; href: string; onClick?: React.MouseEventHandler<HTMLAnchorElement>; className?: string }) => (
    <a href={href} onClick={onClick} className={className}>{children}</a>
  ),
}));
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, prefetch: vi.fn() }) }));

const { default: DailyFocusCard, focusCells, FOCUS_MAX_CELLS } = await import("@/components/dashboard/DailyFocusCard");

afterEach(() => push.mockReset());

/* The vocabulary page's daily focus (2026-10-24): before a single review it
   said retention 100% and accuracy 0%, which reads as every answer wrong.
   Like Settings, it has no reading until there is something to read.
   Since 2026-11-12 (Chi: 任務 HUD) the rates are one quiet line that is not
   drawn at all until then, rather than two slots saying "—". */
describe("the daily focus card", () => {
  it("shows no rates before the first review", () => {
    render(<DailyFocusCard due={21} retention={100} accuracy={0} reviewed={0} />);
    expect(screen.queryByText("100%")).toBeNull();
    expect(screen.queryByText("0%")).toBeNull();
    expect(screen.queryByText("Retention", { exact: false })).toBeNull();
  });

  it("shows them once there are reviews", () => {
    render(<DailyFocusCard due={3} retention={82} accuracy={75} reviewed={12} />);
    expect(screen.getByText("82%")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
  });

  it("says the number once, as the title, and counts today's queue in the tally", () => {
    const { container } = render(
      <DailyFocusCard due={16} clearedToday={5} retention={82} accuracy={75} reviewed={12} />,
    );
    expect(screen.getByRole("heading")).toHaveTextContent("16 words are ready");
    expect(screen.queryByText("16")).toBeNull();
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "5");
    expect(bar).toHaveAttribute("aria-valuemax", "21");
    expect(bar).toHaveAccessibleName("5 of 21 reviewed today");
    expect(container.querySelectorAll('[data-lit="true"]')).toHaveLength(5);
    expect(container.querySelectorAll('[data-next="true"]')).toHaveLength(1);
  });

  it("offers nothing to do once today's queue is clear", () => {
    render(<DailyFocusCard due={0} clearedToday={8} retention={82} accuracy={75} reviewed={12} />);
    expect(screen.getByRole("heading")).toHaveTextContent("You’re all caught up");
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("opens the review it was given; with motion reduced, at once", () => {
    const matchMedia = window.matchMedia;
    window.matchMedia = ((query: string) => ({ matches: query.includes("reduce"), media: query, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;
    try {
      render(<DailyFocusCard due={2} retention={0} accuracy={0} reviewed={0} reviewHref="/review?from=vocabulary" />);
      fireEvent.click(screen.getByRole("link"));
      expect(push).toHaveBeenCalledWith("/review?from=vocabulary");
    } finally {
      window.matchMedia = matchMedia;
    }
  });
});

describe("the daily focus track", () => {
  it("is one cell a word, lit as each is cleared", () => {
    expect(focusCells(16, 5)).toEqual([...Array(5).fill(true), ...Array(16).fill(false)]);
  });

  it("shares cells out past the most one row holds, and never reads finished early", () => {
    const cells = focusCells(119, 1);
    expect(cells).toHaveLength(FOCUS_MAX_CELLS);
    expect(cells.filter(Boolean)).toHaveLength(0);
    const nearly = focusCells(1, 99);
    expect(nearly.filter(Boolean)).toHaveLength(FOCUS_MAX_CELLS - 1);
    expect(focusCells(0, 100).every(Boolean)).toBe(true);
  });

  it("is lit end to end when nothing was due today", () => {
    const cells = focusCells(0, 0);
    expect(cells.length).toBeGreaterThan(0);
    expect(cells.every(Boolean)).toBe(true);
  });
});

describe("today's cleared words", () => {
  it("counts words answered today that are no longer due, and nothing else", async () => {
    const { buildReviewAnalytics } = await import("@/lib/review/analytics");
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 12, 15, 0));
    try {
      const word = (id: string, last: Date | null, next: Date | null) =>
        ({ id, last_reviewed_at: last?.toISOString() ?? null, next_review_at: next?.toISOString() ?? null }) as never;
      const stats = buildReviewAnalytics([
        word("cleared", new Date(2026, 10, 12, 9), new Date(2026, 10, 15)),
        word("missed-again", new Date(2026, 10, 12, 10), new Date(2026, 10, 12, 14)),
        word("yesterday", new Date(2026, 10, 11, 20), new Date(2026, 10, 14)),
        word("never", null, null),
      ]);
      expect(stats.clearedToday).toBe(1);
      expect(stats.due).toBe(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
