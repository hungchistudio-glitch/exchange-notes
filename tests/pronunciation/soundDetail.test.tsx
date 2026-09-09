import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { harness, renderInLab, resetHarness } from "./harness";

import SoundDetail from "@/components/pronunciation/lab/SoundDetail";
import * as speech from "@/lib/speech";

describe("Sound detail", () => {
  beforeEach(() => {
    resetHarness();
  });

  it("teaches the sound it was asked for", async () => {
    await renderInLab(<SoundDetail unitId="rr" />);

    expect(await screen.findByRole("heading", { name: "rr" })).toBeInTheDocument();
    expect(screen.getByText("Double R (trill)")).toBeInTheDocument();
    expect(screen.getAllByText("perro").length).toBeGreaterThan(0);
  });

  it("says so plainly when the sound is not in this language's pack", async () => {
    await renderInLab(<SoundDetail unitId="not-a-sound" />);

    expect(
      await screen.findByText("That sound isn't in this language's pack."),
    ).toBeInTheDocument();
  });

  it("does not carry a sound across a language switch", async () => {
    // "rr" exists in Spanish and not in French. Following a stale link after
    // switching has to land on an honest message, not on a blank screen.
    harness.learningLanguage = "fr";

    await renderInLab(<SoundDetail unitId="rr" />);

    expect(
      await screen.findByText("That sound isn't in this language's pack."),
    ).toBeInTheDocument();
  });

  it("renders only the articulation fields the pack actually has", async () => {
    await renderInLab(<SoundDetail unitId="rr" />);

    // The Spanish trill declares tongue, airflow and voicing, and says
    // nothing about resonance — so there must be no empty "Resonance" row.
    const articulation = await screen.findByRole("region", {
      name: "Articulation",
    });

    expect(within(articulation).getByText("Tongue")).toBeInTheDocument();
    expect(within(articulation).getByText("Airflow")).toBeInTheDocument();
    expect(within(articulation).queryByText("Resonance")).not.toBeInTheDocument();
  });

  it("offers native and slow playback", async () => {
    const user = userEvent.setup();
    const speak = vi.spyOn(speech, "speak");

    await renderInLab(<SoundDetail unitId="rr" />);

    const audio = await screen.findByRole("region", { name: "Replay" });

    await user.click(within(audio).getByRole("button", { name: "Native speed" }));
    await waitFor(() => expect(speak).toHaveBeenCalled());

    const nativeRate = speak.mock.calls[0][3];

    speak.mockClear();
    await user.click(within(audio).getByRole("button", { name: "Slow" }));
    await waitFor(() => expect(speak).toHaveBeenCalled());

    const slowRate = speak.mock.calls[0][3];

    expect(slowRate).toBeLessThan(nativeRate ?? 1);
  });

  it("survives being tapped faster than audio can play", async () => {
    const user = userEvent.setup();
    const cancel = vi.fn();

    // A second tap has to cancel the first, not layer on top of it.
    vi.stubGlobal("speechSynthesis", {
      speak: () => {},
      cancel,
      getVoices: () => [],
      addEventListener: () => {},
      removeEventListener: () => {},
      speaking: false,
      pending: false,
    });

    await renderInLab(<SoundDetail unitId="rr" />);

    const button = await screen.findByRole("button", { name: "Native speed" });

    for (let i = 0; i < 6; i += 1) {
      await user.click(button);
    }

    expect(cancel).toHaveBeenCalled();
    // Nothing threw, and the screen is still there.
    expect(screen.getByRole("heading", { name: "rr" })).toBeInTheDocument();
  });

  it("shows the contrast this sound is confused with", async () => {
    const user = userEvent.setup();

    await renderInLab(<SoundDetail unitId="r" />);

    const trap = await screen.findByRole("button", { name: /Common pronunciation trap/ });
    await user.click(trap);

    expect(
      screen.getByText(/A single r between vowels is a tap/),
    ).toBeInTheDocument();
  });

  it("links the sound to the pairs it appears in", async () => {
    await renderInLab(<SoundDetail unitId="rr" />);

    expect(await screen.findByText("Easy to confuse")).toBeInTheDocument();
    expect(screen.getAllByText("pero").length).toBeGreaterThan(0);
  });

  it("teaches Chinese through zhuyin, not through a Latin transcription", async () => {
    resetHarness({ learningLanguage: "zh-TW" });

    await renderInLab(<SoundDetail unitId="zhuyin-f" />);

    expect(await screen.findByRole("heading", { name: "ㄈ" })).toBeInTheDocument();
    expect(screen.getAllByText("飛機").length).toBeGreaterThan(0);
  });
});
