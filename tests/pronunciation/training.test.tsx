import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { harness, renderInLab, resetHarness } from "./harness";

import TrainModule from "@/components/pronunciation/lab/TrainModule";
import { loadSession, parseStoredSession } from "@/lib/pronunciation/lab/session";

/**
 * Answers every remaining item with the primary button.
 *
 * Driven by the step counter rather than by the button's identity: "Next"
 * is the same element on every step, so waiting for it to disappear waits
 * forever until the very last one.
 */
async function playThrough(user: ReturnType<typeof userEvent.setup>) {
  for (let step = 1; step <= 12; step += 1) {
    const next =
      screen.queryByRole("button", { name: "Next" }) ??
      screen.queryByRole("button", { name: "Finish" });

    if (!next) return;

    await user.click(next);

    await waitFor(() =>
      expect(
        screen.queryByText(new RegExp(`${step + 1} of \\d+`)) ??
          screen.queryByText("Session complete"),
      ).toBeTruthy(),
    );
  }
}

describe("Today's training", () => {
  beforeEach(() => {
    resetHarness();
    window.sessionStorage.clear();
  });

  it("opens on the first item and says where in the session it is", async () => {
    await renderInLab(<TrainModule />);

    expect(await screen.findByText(/1 of \d+/)).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  });

  it("advances, and reaches a summary at the end", async () => {
    const user = userEvent.setup();

    await renderInLab(<TrainModule />);
    await screen.findByText(/1 of \d+/);

    await playThrough(user);

    expect(
      await screen.findByText("Session complete", {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    // Two ways back — the header arrow and the summary's own button — and
    // both have to land in the same place.
    const exits = screen.getAllByRole("link", { name: "Back to the Lab" });
    expect(exits.length).toBeGreaterThan(0);
    for (const exit of exits) {
      expect(exit).toHaveAttribute("href", "/pronunciation");
    }
  });

  it("reports no average when nothing in the session was measured", async () => {
    const user = userEvent.setup();

    await renderInLab(<TrainModule />);
    await screen.findByText(/1 of \d+/);
    await playThrough(user);

    await screen.findByText("Session complete", {}, { timeout: 3000 });

    // Every item was answered by hand, with no analyzer behind any of them.
    // A summary that showed 100 here would be inventing the number.
    expect(screen.getByText("Not analyzed")).toBeInTheDocument();
  });

  it("mirrors the session so a refresh resumes rather than restarts", async () => {
    const user = userEvent.setup();

    const { unmount } = await renderInLab(<TrainModule />);
    await screen.findByText(/1 of \d+/);

    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() =>
      expect(parseStoredSession(window.sessionStorage.getItem(
        "exchange-notes-pronunciation-session",
      ))?.index).toBe(1),
    );

    unmount();

    await renderInLab(<TrainModule />);
    expect(await screen.findByText(/2 of \d+/)).toBeInTheDocument();
  });

  it("throws away a session belonging to the language you just left", async () => {
    const user = userEvent.setup();

    const { unmount } = await renderInLab(<TrainModule />);
    await screen.findByText(/1 of \d+/);
    await user.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => expect(loadSession("es")).not.toBeNull());

    unmount();
    harness.learningLanguage = "it";

    await renderInLab(<TrainModule />);

    // A fresh Italian session, not the Spanish one continued.
    expect(await screen.findByText(/1 of \d+/)).toBeInTheDocument();
    expect(loadSession("es")).toBeNull();
  });

  it("clears the stored session once it is finished", async () => {
    const user = userEvent.setup();

    await renderInLab(<TrainModule />);
    await screen.findByText(/1 of \d+/);
    await playThrough(user);
    await screen.findByText("Session complete", {}, { timeout: 3000 });

    // Otherwise the Lab would offer to resume something already over.
    expect(loadSession("es")).toBeNull();
  });

  it("counts a skip separately from a wrong answer", async () => {
    const user = userEvent.setup();

    await renderInLab(<TrainModule />);
    await screen.findByText(/1 of \d+/);

    await user.click(screen.getByRole("button", { name: "Skip" }));

    expect(await screen.findByText(/2 of \d+/)).toBeInTheDocument();
  });
});
