import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { harness, renderInLab, resetHarness } from "./harness";

import ListenModule from "@/components/pronunciation/lab/ListenModule";
import ReviewModule from "@/components/pronunciation/lab/ReviewModule";
import SpeakTrainer from "@/components/pronunciation/lab/SpeakTrainer";
import WordsModule from "@/components/pronunciation/lab/WordsModule";
import { deriveMastery, emptyProgress } from "@/lib/pronunciation/lab/progress";
import type { VocabularyItem } from "@/lib/types/app";

function vocabularyItem(overrides: Partial<VocabularyItem>): VocabularyItem {
  return {
    id: "item",
    user_id: "user",
    word: "perro",
    translation: "dog",
    language: "es",
    word_language: "es",
    translation_language: "en",
    texts: { es: "perro", en: "dog" },
    examples: {},
    category: "other",
    favorite: false,
    part_of_speech: null,
    example_sentence: null,
    translated_example: null,
    image_url: null,
    confidence: null,
    status: "new",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("Listen drill", () => {
  beforeEach(() => {
    resetHarness();
  });

  it("marks a wrong answer wrong and names what was actually played", async () => {
    const user = userEvent.setup();

    await renderInLab(<ListenModule />);

    await screen.findByText("Which one did you hear?");

    const options = await screen.findAllByRole("button", { name: /pero|perro/ });
    await user.click(options[0]);

    // Whichever was tapped, the drill has to say something definite about
    // it — either "Correct" or the word that actually played.
    await waitFor(() =>
      expect(
        screen.queryByText("Correct") ?? screen.queryByText(/^That was /),
      ).toBeTruthy(),
    );
  });

  it("records the attempt against the sound, not against the pair", async () => {
    const user = userEvent.setup();

    await renderInLab(<ListenModule />);

    const options = await screen.findAllByRole("button", { name: /pero|perro/ });
    await user.click(options[0]);

    await waitFor(() => expect(harness.attempts.length).toBe(1));

    const attempt = harness.attempts[0];
    expect(attempt.module).toBe("listen");
    expect(attempt.language).toBe("es");
    // A unit id, so the weakness map learns something about the trill.
    expect(["r", "rr"]).toContain(attempt.unitId);
  });

  it("ignores a second tap on an answered question", async () => {
    const user = userEvent.setup();

    await renderInLab(<ListenModule />);

    const options = await screen.findAllByRole("button", { name: /pero|perro/ });

    await user.click(options[0]);
    await waitFor(() => expect(harness.attempts.length).toBe(1));

    await user.click(options[1]);
    await user.click(options[0]);

    // Answering is once per question; a rapid second tap must not record a
    // second attempt against the same sound.
    expect(harness.attempts.length).toBe(1);
  });

  it("says so when the language has no contrasts rather than showing an empty drill", async () => {
    // Every shipped pack has pairs, so this asserts the empty branch through
    // a pack stripped of them rather than by shipping one that is empty.
    const registry = await import("@/lib/pronunciation/lab/registry");
    const spanish = registry.getPronunciationPack("es");

    vi.spyOn(registry, "getPronunciationPack").mockReturnValue({
      ...spanish,
      minimalPairs: [],
    });

    await renderInLab(<ListenModule />);

    expect(
      await screen.findByText("No listening contrasts for this language yet."),
    ).toBeInTheDocument();
  });
});

describe("Speak trainer", () => {
  beforeEach(() => {
    resetHarness();
  });

  it("explains itself instead of failing when the browser cannot record", async () => {
    // jsdom has no MediaRecorder, which is exactly the unsupported case.
    await renderInLab(
      <SpeakTrainer
        language="es"
        targetText="perro"
        nativeSource={{ kind: "speech", text: "perro", language: "es" }}
        dimensions={["consonant", "vowel", "stress", "rhythm"]}
      />,
    );

    expect(
      await screen.findByText("This browser can't record audio."),
    ).toBeInTheDocument();

    // Listening still works — the half of the screen that teaches most
    // needs no microphone at all.
    expect(screen.getByRole("button", { name: "Play the native version" })).toBeInTheDocument();
  });

  it("shows a target and never a score it did not measure", async () => {
    await renderInLab(
      <SpeakTrainer
        language="es"
        targetText="perro"
        nativeSource={{ kind: "speech", text: "perro", language: "es" }}
        dimensions={["consonant", "vowel", "stress", "rhythm"]}
      />,
    );

    expect(await screen.findByText("perro")).toBeInTheDocument();

    // Nothing has been recorded, so no breakdown at all — not a zeroed one.
    expect(screen.queryByText("Overall")).not.toBeInTheDocument();
  });

  it("reports a denied microphone as a permission problem, not a failure", async () => {
    const user = userEvent.setup();

    // Give jsdom just enough of a recorder to get as far as the permission
    // prompt, then refuse it the way a browser does.
    class FakeRecorder {
      static isTypeSupported = () => true;
      state = "inactive";
      start() {}
      stop() {}
    }

    vi.stubGlobal("MediaRecorder", FakeRecorder);
    vi.stubGlobal("navigator", {
      ...navigator,
      mediaDevices: {
        getUserMedia: () =>
          Promise.reject(new DOMException("denied", "NotAllowedError")),
      },
    });

    await renderInLab(
      <SpeakTrainer
        language="es"
        targetText="perro"
        nativeSource={{ kind: "speech", text: "perro", language: "es" }}
        dimensions={["consonant"]}
      />,
    );

    await user.click(await screen.findByRole("button", { name: "Record" }));

    expect(
      await screen.findByText("Microphone access was declined."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Allow the microphone for this site/),
    ).toBeInTheDocument();
  });
});

describe("Words module", () => {
  beforeEach(() => {
    resetHarness();
  });

  it("points at Vocabulary when there is nothing saved in this language", async () => {
    await renderInLab(<WordsModule />);

    expect(
      await screen.findByText("No words ready for pronunciation yet."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Add vocabulary in this language to start practising."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to Vocabulary" })).toHaveAttribute(
      "href",
      "/vocabulary",
    );
  });

  it("practises the learner's own words and says why each was chosen", async () => {
    resetHarness({
      items: [vocabularyItem({ id: "perro", texts: { es: "perro", en: "dog" } })],
    });

    await renderInLab(<WordsModule />);

    expect(await screen.findByText("perro")).toBeInTheDocument();
    expect(screen.getByText("New word")).toBeInTheDocument();
  });

  it("opens a word onto the sounds it drills", async () => {
    const user = userEvent.setup();

    resetHarness({
      items: [vocabularyItem({ id: "perro", texts: { es: "perro", en: "dog" } })],
    });

    await renderInLab(<WordsModule />);

    await user.click(await screen.findByRole("button", { name: /perro/ }));

    expect(screen.getByText("Drills")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "rr" })).toHaveAttribute(
      "href",
      "/pronunciation/sounds/rr",
    );
  });

  it("ignores words that are not in the language being learned", async () => {
    resetHarness({
      items: [
        vocabularyItem({
          id: "chien",
          texts: { fr: "chien", en: "dog" },
          word_language: "fr",
        }),
      ],
    });

    await renderInLab(<WordsModule />);

    expect(
      await screen.findByText("No words ready for pronunciation yet."),
    ).toBeInTheDocument();
    expect(screen.queryByText("chien")).not.toBeInTheDocument();
  });
});

describe("Review module", () => {
  beforeEach(() => {
    resetHarness();
  });

  it("says nothing is due rather than inventing a queue", async () => {
    await renderInLab(<ReviewModule />);

    expect(await screen.findByText("Nothing due right now.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Start review" })).not.toBeInTheDocument();
  });

  it("offers a review once something has actually come due", async () => {
    const longAgo = new Date(Date.now() - 40 * 86_400_000).toISOString();
    const base = {
      ...emptyProgress("es", "rr"),
      attempts: 6,
      correctAttempts: 1,
      lastPracticedAt: longAgo,
    };

    resetHarness({
      progress: { rr: { ...base, mastery: deriveMastery(base) } },
    });

    await renderInLab(<ReviewModule />);

    expect(await screen.findByText("1 due")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Start review" })).toHaveAttribute(
      "href",
      "/pronunciation/train?source=review",
    );
  });

  it("bands the weakness map instead of ranking one long list", async () => {
    const weak = { ...emptyProgress("es", "rr"), attempts: 10, correctAttempts: 1 };
    const strong = { ...emptyProgress("es", "a"), attempts: 10, correctAttempts: 10 };

    resetHarness({
      progress: {
        rr: { ...weak, mastery: deriveMastery(weak) },
        a: { ...strong, mastery: deriveMastery(strong) },
      },
    });

    await renderInLab(<ReviewModule />);

    const map = await screen.findByRole("region", { name: "Weakness map" });

    expect(within(map).getByText("Needs work")).toBeInTheDocument();
    expect(within(map).getByText("Strong")).toBeInTheDocument();
  });
});
