import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LearningProgressPanelDisplay } from "@/components/settings/LearningProgressPanel";
import english from "@/lib/i18n/en";
import type { ReviewAnalytics } from "@/lib/review/analytics";

vi.mock("@/hooks/preferences/useInterfaceLanguage", () => ({
  default: () => "english",
}));

const copy = english.home.progress;
const history: ReviewAnalytics = {
  due: 6,
  reviewed: 114,
  accuracy: 88,
  retention: 37,
  mastered: 4,
  weak: 9,
};

/*
 * The tile a label belongs to: a direct child of the grid, whatever the
 * label itself is wrapped in. The label sits inside a <dt> alongside the
 * tile's index, so walking one parent up lands on the <dt>, not the tile.
 */
function metric(label: string) {
  return screen.getByText(label).closest<HTMLElement>("dl > div")!;
}

function value(label: string) {
  return metric(label).querySelector("dd")!;
}

/*
 * The panel itself. It takes its accessible name from the settings group
 * heading above it on the page, so it carries a class rather than a second
 * aria-label that would say the same thing twice.
 */
function panel(container: HTMLElement) {
  return container.querySelector<HTMLElement>(".settings-progress")!;
}

function scales(container: HTMLElement) {
  return container.querySelectorAll<HTMLElement>('[style*="--reading"]');
}

describe("standard settings learning progress", () => {
  it("keeps counts but hides undefined rates before the first review", () => {
    const { container } = render(
      <LearningProgressPanelDisplay
        readings={{ ...history, reviewed: 0, accuracy: 0, retention: 100, mastered: 0, weak: 0 }}
      />,
    );

    expect(value(copy.accuracy)).toHaveTextContent(/^—$/);
    expect(value(copy.retention)).toHaveTextContent(/^—$/);
    expect(value(copy.mastered)).toHaveTextContent(/^0$/);
    expect(value(copy.practice)).toHaveTextContent(/^0$/);
    expect(screen.getByText(copy.totalReviews.replace("{count}", "0"))).toBeInTheDocument();
    expect(screen.getByText(english.cosmic.hud.noReadings)).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(panel(container)).toHaveAttribute("aria-busy", "false");
    expect(scales(container)).toHaveLength(0);
  });

  it.each([
    { state: "loading", loading: true, loadError: false },
    { state: "failed to load", loading: false, loadError: true },
  ])("does not publish stale values or review totals while $state", ({ loading, loadError }) => {
    const { container } = render(
      <LearningProgressPanelDisplay readings={history} loading={loading} loadError={loadError} />,
    );

    for (const label of [copy.accuracy, copy.retention, copy.mastered, copy.practice]) {
      expect(value(label)).toHaveTextContent(/^—$/);
    }

    expect(screen.queryByText(copy.totalReviews.replace("{count}", String(history.reviewed)))).not.toBeInTheDocument();
    expect(screen.queryByText(english.cosmic.hud.noReadings)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: copy.continueReview })).not.toBeInTheDocument();
    expect(panel(container)).toHaveAttribute("aria-busy", String(loading));
    expect(scales(container)).toHaveLength(0);

    if (loadError) {
      expect(screen.getByRole("alert")).toHaveTextContent(english.common.error);
    } else {
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    }
  });

  it("shows actual zero results after reviews instead of treating them as missing data", () => {
    const { container } = render(
      <LearningProgressPanelDisplay readings={{ ...history, accuracy: 0, retention: 0, mastered: 0, weak: 0 }} />,
    );

    expect(value(copy.accuracy)).toHaveTextContent(/^0%$/);
    expect(value(copy.retention)).toHaveTextContent(/^0%$/);
    expect(value(copy.mastered)).toHaveTextContent(/^0$/);
    expect(value(copy.practice)).toHaveTextContent(/^0$/);
    expect(screen.queryByText("—")).not.toBeInTheDocument();
    expect(screen.queryByText(english.cosmic.hud.noReadings)).not.toBeInTheDocument();
    expect(Array.from(scales(container), (scale) => scale.style.getPropertyValue("--reading"))).toEqual(["0", "0"]);
  });

  it("preserves supplied statistics and gives only percentages a proportional scale", () => {
    const { container } = render(<LearningProgressPanelDisplay readings={history} />);

    expect(value(copy.accuracy)).toHaveTextContent(/^88%$/);
    expect(value(copy.retention)).toHaveTextContent(/^37%$/);
    expect(value(copy.mastered)).toHaveTextContent(/^4$/);
    expect(value(copy.practice)).toHaveTextContent(/^9$/);
    expect(screen.getByText(copy.totalReviews.replace("{count}", "114"))).toBeInTheDocument();
    expect(Array.from(scales(container), (scale) => scale.style.getPropertyValue("--reading"))).toEqual(["88", "37"]);
    expect(scales(metric(copy.mastered))).toHaveLength(0);
    expect(scales(metric(copy.practice))).toHaveLength(0);
    expect(screen.getByRole("link", { name: copy.continueReview })).toHaveAttribute("href", "/review");
  });

  it("reveals the latest readings and review action when loading finishes", () => {
    const { container, rerender } = render(<LearningProgressPanelDisplay readings={history} loading />);

    expect(value(copy.accuracy)).toHaveTextContent(/^—$/);

    rerender(<LearningProgressPanelDisplay readings={{ ...history, accuracy: 75, reviewed: 120 }} />);

    expect(panel(container)).toHaveAttribute("aria-busy", "false");
    expect(value(copy.accuracy)).toHaveTextContent(/^75%$/);
    expect(screen.getByText(copy.totalReviews.replace("{count}", "120"))).toBeInTheDocument();
    expect(screen.getByRole("link", { name: copy.continueReview })).toBeInTheDocument();
  });
});
