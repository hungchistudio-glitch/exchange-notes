import { screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { harness, renderInLab, resetHarness } from "./harness";

import LabLanding from "@/components/pronunciation/lab/LabLanding";
import { deriveMastery, emptyProgress } from "@/lib/pronunciation/lab/progress";
import type { ProgressByUnit } from "@/lib/pronunciation/lab/types";

function practised(
  language: "es" | "fr" | "zh-TW",
  unitId: string,
  attempts: number,
  correct: number,
): ProgressByUnit {
  const base = {
    ...emptyProgress(language, unitId),
    attempts,
    correctAttempts: correct,
    lastPracticedAt: new Date().toISOString(),
  };

  return { [unitId]: { ...base, mastery: deriveMastery(base) } };
}

describe("Pronunciation Lab landing", () => {
  beforeEach(() => {
    resetHarness();
  });

  it("renders the Lab for the language being learned", async () => {
    await renderInLab(<LabLanding />);

    expect(
      await screen.findByRole("heading", { name: "Pronunciation Lab" }),
    ).toBeInTheDocument();

    // The pack's own name for itself, not a translated label — proof the
    // screen is reading the pack rather than a hardcoded string.
    expect(await screen.findByText("Español")).toBeInTheDocument();
  });

  it("offers all six modules", async () => {
    await renderInLab(<LabLanding />);

    const modules = await screen.findByRole("navigation", {
      name: "Pronunciation Lab",
    });

    for (const name of ["Sounds", "Listen", "Speak", "Words", "Rhythm", "Review"]) {
      expect(
        within(modules).getByRole("link", { name: new RegExp(name) }),
      ).toBeInTheDocument();
    }
  });

  it("says there is not enough practice rather than showing zero", async () => {
    await renderInLab(<LabLanding />);

    // "0% mastered" and "you have not started" look the same in a progress
    // bar and mean entirely different things.
    expect(await screen.findByText("Not enough practice yet")).toBeInTheDocument();
    expect(screen.queryByText("0%")).not.toBeInTheDocument();
  });

  it("shows real numbers once there is practice behind them", async () => {
    resetHarness({ progress: practised("es", "rr", 6, 6) });

    await renderInLab(<LabLanding />);

    const progress = await screen.findByRole("region", {
      name: "Where you stand",
    });

    // The tiles report per-dimension, so listening and rhythm keep saying
    // "not enough practice yet" while sounds has a real number — which is
    // the honest answer for someone who has only practised sounds.
    await waitFor(() =>
      expect(within(progress).getByText(/1 of \d+ mastered/)).toBeInTheDocument(),
    );

    expect(within(progress).getAllByText("Not enough practice yet").length).toBe(3);
  });

  it("switches the whole pack when the learning language changes", async () => {
    const { unmount } = await renderInLab(<LabLanding />);

    expect(await screen.findByText("Español")).toBeInTheDocument();
    expect(screen.getByText("R and RR")).toBeInTheDocument();

    unmount();

    harness.learningLanguage = "fr";
    await renderInLab(<LabLanding />);

    expect(await screen.findByText("Français")).toBeInTheDocument();
    expect(screen.getByText("Nasal vowels")).toBeInTheDocument();
    // Nothing Spanish may survive the switch.
    expect(screen.queryByText("R and RR")).not.toBeInTheDocument();
  });

  it("shows Chinese its own groups, tones included", async () => {
    resetHarness({ learningLanguage: "zh-TW" });

    await renderInLab(<LabLanding />);

    expect(await screen.findByText("繁體中文")).toBeInTheDocument();
    expect(screen.getByText("Initials")).toBeInTheDocument();
    expect(screen.getByText("Tones")).toBeInTheDocument();
  });

  it("keeps the sounds usable when progress cannot be loaded", async () => {
    resetHarness({ progressFails: true });

    await renderInLab(<LabLanding />);

    expect(
      await screen.findByText("Couldn't load your progress"),
    ).toBeInTheDocument();

    // The failure is scoped to the history. The material itself is local and
    // still there.
    const modules = screen.getByRole("navigation", { name: "Pronunciation Lab" });
    expect(
      within(modules).getByRole("link", { name: /Sounds/ }),
    ).toBeInTheDocument();
  });

  it("plans a session and links to it", async () => {
    await renderInLab(<LabLanding />);

    expect(await screen.findByText("Today's training")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Start" })).toHaveAttribute(
      "href",
      "/pronunciation/train",
    );
  });

  it("waits for evidence before naming a weakness", async () => {
    await renderInLab(<LabLanding />);

    expect(
      await screen.findByText("Practise a few sounds and this fills in."),
    ).toBeInTheDocument();
  });

  it("names a weakness once there is a history behind it", async () => {
    resetHarness({ progress: practised("es", "rr", 8, 1) });

    await renderInLab(<LabLanding />);

    await waitFor(() =>
      expect(
        screen.queryByText("Practise a few sounds and this fills in."),
      ).not.toBeInTheDocument(),
    );

    expect(screen.getByText("8 attempts")).toBeInTheDocument();
  });
});
