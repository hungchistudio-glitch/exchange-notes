import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderInLab, resetHarness } from "./harness";

import SoundDetail from "@/components/pronunciation/lab/SoundDetail";
import {
  announceSpeaking,
  announceSpeakingEnd,
  expectedDuration,
  noteEstimate,
  resetSpeakingForTests,
} from "@/lib/pronunciation/speaking";
import * as speech from "@/lib/speech";

/* =========================================================
   Yumi following what the Lab plays (Chi, 2026-10-19)

   A sound card's word now plays with Yumi going through it moment by
   moment over a trace of the word, and afterwards the reader can stop on
   any sound and step through it. These drive a real sound card with the
   browser voice faked, and pin the clock's self-correction.
   ========================================================= */

type Handlers = { onStart?: () => void; onEnd?: () => void; onError?: () => void };

describe("Yumi going through a word", () => {
  let handlers: Handlers = {};

  beforeEach(() => {
    resetHarness();
    resetSpeakingForTests();
    handlers = {};
    vi.spyOn(speech, "speak").mockImplementation((_text, _tag, callbacks) => {
      handlers = (callbacks ?? {}) as Handlers;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("goes through the card's word over its trace, then steps through a sound", async () => {
    const user = userEvent.setup();
    await renderInLab(<SoundDetail unitId="rr" />);

    /* Nothing played yet: an invitation, not a fake waveform. */
    expect(await screen.findByText("Play a word and watch how it’s made.")).toBeInTheDocument();

    const audio = screen.getByRole("region", { name: "Replay" });
    await user.click(within(audio).getByRole("button", { name: "Native speed" }));
    act(() => handlers.onStart?.());

    /* "perro" /ˈpe.ro/, moment by moment while it plays. Which moment is
       real time — a /p/ closure lasts ~70 ms — so only that there is one. */
    expect(await screen.findByRole("img", { name: "Pronunciation trace" })).toBeInTheDocument();
    expect(document.querySelector("[data-moment]")).not.toBeNull();

    act(() => handlers.onEnd?.());

    /* Afterwards, its /p/: shut at the lips, holding the air. */
    await user.click(screen.getByRole("button", { name: "/p/" }));
    expect(screen.getByText("Close and hold the air")).toBeInTheDocument();
    expect(screen.getByText("Both lips")).toBeInTheDocument();

    /* Stopping on the card's own sound: the trill, and what to watch. */
    await user.click(screen.getByRole("button", { name: "/r/" }));
    expect(screen.getByText("Let it trill")).toBeInTheDocument();
    expect(screen.getByText("Relax the tip and let the air make it flutter")).toBeInTheDocument();
    expect(screen.getByText("Tongue tip on the ridge behind the teeth")).toBeInTheDocument();

    /* And on to the next moment: the /o/. */
    await user.click(screen.getByRole("button", { name: "Next moment" }));
    expect(screen.getByText(/Vowel · Hold the sound/)).toBeInTheDocument();
  });

  it("marks the card's own sound on the trace", async () => {
    const user = userEvent.setup();
    await renderInLab(<SoundDetail unitId="rr" />);

    const audio = await screen.findByRole("region", { name: "Replay" });
    await user.click(within(audio).getByRole("button", { name: "Native speed" }));
    act(() => handlers.onStart?.());

    expect(await screen.findByText(/This card’s sound/)).toBeInTheDocument();
  });
});

describe("Yumi's clock", () => {
  beforeEach(() => {
    resetSpeakingForTests();
  });

  it("is exact for a text it has heard, and corrected for one it has not", () => {
    const casa = { text: "casa", language: "es" as const, speed: "native" as const };
    const perro = { text: "perro", language: "es" as const, speed: "native" as const };

    /* First hearing: only the estimate, at the voice's rate. */
    expect(expectedDuration(casa, 400, 1)).toBe(400);

    noteEstimate(casa, 400);
    const id = announceSpeaking({ ...casa, startedAt: 1000 });
    announceSpeakingEnd(id, { at: 1600 });

    /* Heard once: its own length, exactly. */
    expect(expectedDuration(casa, 400, 1)).toBe(600);
    /* Another word: the estimate, corrected by how this voice ran (×1.5). */
    expect(expectedDuration(perro, 500, 1)).toBe(750);
  });

  it("learns nothing from a playback that was cut off", () => {
    const casa = { text: "casa", language: "es" as const, speed: "native" as const };
    noteEstimate(casa, 400);
    const id = announceSpeaking({ ...casa, startedAt: 0 });
    announceSpeakingEnd(id, { at: 150, cut: true });

    expect(expectedDuration(casa, 400, 1)).toBe(400);
  });
});
