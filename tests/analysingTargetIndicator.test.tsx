import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import AnalysingTargetIndicator from "@/components/camera/AnalysingTargetIndicator";

/* =========================================================
   When the pill is allowed to appear, and how long it stays

   Recognition takes three to seven seconds, so the pill is usually welcome.
   But it can also come back in a few milliseconds — the same object
   photographed twice, answered from the client cache — and a loader that
   appears for one frame is worse than no loader at all.

   So there are two rules, and both are the kind that look like extra
   complexity until the one time they are missing: wait before showing, and
   once shown, stay.
   ========================================================= */

const LABEL = "Analysing target";

function pill() {
  return screen.queryByRole("status");
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

/**
 * Advances time inside act, so React processes the timer's setState.
 *
 * Each call covers one hop of the state machine. A timer scheduled *by* the
 * effect that a previous timer triggered is only registered once React has
 * re-rendered, which happens when act flushes — after this window has
 * closed. So "wait out the floor, then wait out the exit" is two calls, not
 * one long one, and that is a property of the test rather than of the
 * component.
 */
async function advance(ms: number) {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
}

describe("a recognition that finishes almost immediately", () => {
  it("never shows the pill at all", async () => {
    // A cache hit. Flashing a loader here reads as a glitch, not as speed.
    const { rerender } = render(
      <AnalysingTargetIndicator active label={LABEL} />,
    );

    await advance(120);
    rerender(<AnalysingTargetIndicator active={false} label={LABEL} />);
    await advance(2000);

    expect(pill()).not.toBeInTheDocument();
  });
});

describe("a recognition that takes real time", () => {
  it("waits before showing anything", async () => {
    render(<AnalysingTargetIndicator active label={LABEL} />);

    await advance(240);
    expect(pill()).not.toBeInTheDocument();

    await advance(20);
    expect(pill()).toBeInTheDocument();
  });

  it("shows the label without writing the dots into it", async () => {
    /*
     * The dots are three elements the stylesheet cycles. A "…" in the
     * string would render beside them and make the pill jump.
     */
    render(<AnalysingTargetIndicator active label={LABEL} />);
    await advance(300);

    expect(pill()).toHaveTextContent("Analysing target...");
    expect(LABEL).not.toContain("…");
  });

  it("stays put for a moment even if the answer lands right after", async () => {
    // Otherwise the pill flashes in and straight back out.
    const { rerender } = render(
      <AnalysingTargetIndicator active label={LABEL} />,
    );

    await advance(300);
    expect(pill()).toBeInTheDocument();

    rerender(<AnalysingTargetIndicator active={false} label={LABEL} />);

    await advance(200);
    expect(pill()).toBeInTheDocument();
  });

  it("leaves once it has been up long enough", async () => {
    const { rerender } = render(
      <AnalysingTargetIndicator active label={LABEL} />,
    );

    await advance(300);
    rerender(<AnalysingTargetIndicator active={false} label={LABEL} />);

    // The rest of the floor, and then the exit animation.
    await advance(500);
    expect(pill()).toBeInTheDocument();

    await advance(200);
    expect(pill()).not.toBeInTheDocument();
  });

  it("does not linger after a long analysis", async () => {
    // The floor is a minimum, not a delay added to every read.
    const { rerender } = render(
      <AnalysingTargetIndicator active label={LABEL} />,
    );

    await advance(4000);
    rerender(<AnalysingTargetIndicator active={false} label={LABEL} />);

    // The floor is long spent, so it goes straight to leaving — a total of
    // barely more than the exit animation, not another half second.
    await advance(10);
    await advance(200);

    expect(pill()).not.toBeInTheDocument();
  });
});

describe("what it tells assistive technology", () => {
  it("announces politely, and only the words", async () => {
    render(<AnalysingTargetIndicator active label={LABEL} />);
    await advance(300);

    const status = pill();

    expect(status).toHaveAttribute("aria-live", "polite");

    // The cycling dots are decoration; a live region that re-announced
    // three times a second would be unusable.
    const dots = status?.querySelectorAll('[aria-hidden="true"]');
    expect((dots?.length ?? 0)).toBeGreaterThan(0);
  });
});
