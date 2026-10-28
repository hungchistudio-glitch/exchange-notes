import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/link", () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));

const { default: DailyFocusCard } = await import("@/components/dashboard/DailyFocusCard");

/* The vocabulary page's daily focus (2026-10-24): before a single review it
   said retention 100% and accuracy 0%, which reads as every answer wrong.
   Like Settings, it has no reading until there is something to read. */
describe("the daily focus card", () => {
  it("shows no rates before the first review", () => {
    render(<DailyFocusCard due={21} retention={100} accuracy={0} reviewed={0} />);
    expect(screen.getAllByText("—")).toHaveLength(2);
    expect(screen.queryByText("100%")).toBeNull();
    expect(screen.queryByText("0%")).toBeNull();
  });

  it("shows them once there are reviews", () => {
    render(<DailyFocusCard due={3} retention={82} accuracy={75} reviewed={12} />);
    expect(screen.getByText("82%")).toBeInTheDocument();
    expect(screen.getByText("75%")).toBeInTheDocument();
  });
});
