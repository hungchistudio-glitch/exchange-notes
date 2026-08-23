import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCallback, useState } from "react";

import { useVocabularyLanguageFill } from "@/hooks/useVocabularyLanguageFill";
import type { LanguageCode } from "@/lib/languages";
import type { VocabularyItem } from "@/lib/types/app";

/*
 * The background fill is the thing that makes switching learning language
 * mean something for words you already saved. It ran one batch per effect
 * pass and gave a language up for the whole session on the first failure,
 * which is why a 326-word library sat at forty translated words.
 */

const LIBRARY_SIZE = 100;
const BATCH = 20;

function makeItems(translated: number, language: LanguageCode): VocabularyItem[] {
  return Array.from({ length: LIBRARY_SIZE }, (_, index) => ({
    id: `w${index}`,
    user_id: "u",
    word: "word",
    translation: "字",
    language: "en",
    word_language: "en",
    translation_language: "zh-TW",
    texts:
      index < translated
        ? { en: "word", "zh-TW": "字", [language]: "parola" }
        : { en: "word", "zh-TW": "字" },
    examples: {},
    category: "other",
    favorite: false,
    part_of_speech: null,
    example_sentence: null,
    translated_example: null,
    image_url: null,
    confidence: null,
    status: "new",
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  })) as VocabularyItem[];
}

/** Mirrors VocabularyContext: items in state, a stable quiet refresh. */
function Harness({ language = "it" as LanguageCode }) {
  const [translated, setTranslated] = useState(0);

  const refresh = useCallback(() => {
    setTranslated((current) => Math.min(current + BATCH, LIBRARY_SIZE));
  }, []);

  const { filling } = useVocabularyLanguageFill({
    items: makeItems(translated, language),
    learningLanguage: language,
    loading: false,
    onFilled: refresh,
  });

  return <span data-testid="filling">{filling ? "yes" : "no"}</span>;
}

/**
 * Lets the internal loop run as many turns as it needs.
 *
 * Timers are advanced as well as microtasks flushed, because a retry waits
 * before its next attempt — a settle that only drains promises would report
 * that the loop had given up when it was merely waiting.
 */
async function settle(turns = 80) {
  for (let turn = 0; turn < turns; turn += 1) {
    await act(async () => {
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(500);
    });
  }
}

function serveBatches(failOn: number[] = []) {
  let served = 0;
  const counter = { get served() { return served; } };

  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      served += 1;

      if (failOn.includes(served)) {
        return { ok: false, status: 500, json: async () => ({}) };
      }

      const done = served * BATCH >= LIBRARY_SIZE;

      return {
        ok: true,
        json: async () => ({
          filled: BATCH,
          remaining: Math.max(LIBRARY_SIZE - served * BATCH, 0),
          done,
        }),
      };
    }),
  );

  return counter;
}

describe("vocabulary language fill", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("walks the whole library over rather than stopping after one batch", async () => {
    const counter = serveBatches();

    render(<Harness />);
    await settle();

    expect(counter.served).toBeGreaterThanOrEqual(LIBRARY_SIZE / BATCH);
  });

  it("survives a transient failure instead of giving up on the language", async () => {
    // The regression: one busy minute from the model used to strand the
    // library for the rest of the session, with no retry and no button
    // anywhere to ask again.
    const counter = serveBatches([2]);

    render(<Harness />);
    await settle(200);

    expect(counter.served).toBeGreaterThan(3);
  });

  it("gives up only after the failures stop looking transient", async () => {
    const counter = serveBatches([1, 2, 3, 4, 5, 6, 7, 8]);

    render(<Harness />);
    await settle(200);

    // Three consecutive failures is a wall, not a hiccup.
    expect(counter.served).toBeLessThanOrEqual(3);
  });

  it("does not ask at all when the library is already in the language", async () => {
    const counter = serveBatches();

    function Complete() {
      useVocabularyLanguageFill({
        items: makeItems(LIBRARY_SIZE, "it"),
        learningLanguage: "it",
        loading: false,
        onFilled: () => {},
      });
      return null;
    }

    render(<Complete />);
    await settle(20);

    expect(counter.served).toBe(0);
  });

  it("stops reporting that it is filling once the run ends", async () => {
    serveBatches();

    const { getByTestId } = render(<Harness />);
    await settle();

    // The old version left this stuck on whenever a run was interrupted,
    // which is a spinner that never stops.
    expect(getByTestId("filling").textContent).toBe("no");
  });
});
