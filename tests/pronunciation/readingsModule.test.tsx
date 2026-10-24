import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { harness, renderInLab, resetHarness } from "./harness";

import ReadingsModule from "@/components/pronunciation/lab/ReadingsModule";
import * as speech from "@/lib/speech";

/* =========================================================
   The Lab's one-spelling-several-readings module (Chi, 2026-10-19)

   Side by side, and then by ear: a phrase plays without its text and the
   reader says which reading it was. The answer is filed as a listening
   attempt on heteronym:<word> — "listen", the database's own module, never
   "readings", which its check constraint would refuse.
   ========================================================= */

describe("Readings", () => {
  beforeEach(() => {
    resetHarness({ learningLanguage: "es" });
    vi.spyOn(speech, "speak").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows each word's readings side by side, and plays one", async () => {
    const user = userEvent.setup();
    await renderInLab(<ReadingsModule />);

    expect(await screen.findByText("One spelling, several readings")).toBeInTheDocument();
    expect(screen.getByText("publicó")).toBeInTheDocument();
    expect(screen.getByText("he/she published")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Play “ella publicó”" }));
    expect(speech.speak).toHaveBeenCalledWith("ella publicó", expect.any(String), expect.anything(), expect.any(Number));
  });

  it("asks which reading was heard, and files the answer as listening", async () => {
    const user = userEvent.setup();
    vi.spyOn(Math, "random").mockReturnValue(0);
    await renderInLab(<ReadingsModule />);

    await user.click(await screen.findByRole("button", { name: "Listen and choose" }));
    const question = await screen.findByRole("region", { name: "Listen and choose" });
    expect(within(question).getByText("Which reading did you hear?")).toBeInTheDocument();
    /* Played from the tap that opened it. */
    expect(speech.speak).toHaveBeenCalled();

    const options = within(within(question).getByRole("list")).getAllByRole("button");
    await act(async () => {
      await user.click(options[0]);
    });

    expect(harness.attempts).toHaveLength(1);
    expect(harness.attempts[0]).toMatchObject({ module: "listen", outcome: "correct" });
    expect(String(harness.attempts[0].unitId)).toMatch(/^heteronym:/);
    expect(within(question).getByText(/^Right — that was/)).toBeInTheDocument();
  });
});
