import { describe, expect, it } from "vitest";

import {
  createUnavailableAnalyzer,
  normalizeForComparison,
  textSimilarity,
  verdictForSimilarity,
} from "@/lib/pronunciation/lab/analyzer";

describe("normalizeForComparison", () => {
  it("drops punctuation, case and accents", () => {
    // A recogniser transcribes "café" as "cafe" about as often as not.
    // That is a transcription difference, not a pronunciation error.
    expect(normalizeForComparison("¿Café?")).toBe("cafe");
    expect(normalizeForComparison("Très!")).toBe("tres");
  });

  it("leaves Chinese characters alone", () => {
    expect(normalizeForComparison("你好，世界")).toBe("你好世界");
  });
});

describe("textSimilarity", () => {
  it("is 1 for the same word said the same way", () => {
    expect(textSimilarity("perro", "perro")).toBe(1);
    expect(textSimilarity("PERRO", "perro")).toBe(1);
  });

  it("is 0 when nothing was heard", () => {
    expect(textSimilarity("", "perro")).toBe(0);
  });

  it("scores a near miss above an unrelated word", () => {
    const nearMiss = textSimilarity("pero", "perro");
    const unrelated = textSimilarity("gato", "perro");

    expect(nearMiss).toBeGreaterThan(unrelated);
    expect(nearMiss).toBeLessThan(1);
  });

  it("distinguishes minimal pairs rather than treating them as equal", () => {
    // A whole-word match would score "perro" against "pero" the same as
    // against "gato", which is the entire distinction the Lab teaches.
    expect(textSimilarity("pero", "perro")).toBeGreaterThan(0.5);
    expect(textSimilarity("gato", "perro")).toBeLessThan(0.5);
  });
});

describe("verdictForSimilarity", () => {
  it("has three real outcomes rather than pass/fail", () => {
    expect(verdictForSimilarity(1)).toBe("correct");
    expect(verdictForSimilarity(0.75)).toBe("almost");
    expect(verdictForSimilarity(0.2)).toBe("incorrect");
  });
});

describe("createUnavailableAnalyzer", () => {
  it("reports nothing rather than guessing", async () => {
    const analyzer = createUnavailableAnalyzer();

    expect(analyzer.isAvailable()).toBe(false);

    const result = await analyzer.analyze({
      language: "es",
      targetText: "perro",
      dimensions: ["sound", "consonant", "stress", "rhythm"],
    });

    // The rule the whole scoring design turns on: a number nothing measured
    // is absent, never a plausible-looking substitute.
    expect(result.overall).toBeNull();
    expect(result.verdict).toBe("unknown");
    expect(result.failure).toBe("not-supported");

    for (const dimension of ["sound", "consonant", "stress", "rhythm"] as const) {
      expect(result.dimensions[dimension]).toEqual({
        measured: false,
        reason: "unsupported",
      });
    }
  });

  it("declares where the audio would be processed", () => {
    expect(createUnavailableAnalyzer().processing).toBe("on-device");
  });
});

describe("the analyzer contract", () => {
  it("never returns a score for a dimension it did not measure", async () => {
    const result = await createUnavailableAnalyzer().analyze({
      language: "fr",
      targetText: "tu",
      dimensions: ["vowel", "nasal", "liaison", "rhythm"],
    });

    for (const entry of Object.values(result.dimensions)) {
      if (entry.measured) {
        expect(typeof entry.score).toBe("number");
      } else {
        expect(entry).not.toHaveProperty("score");
      }
    }
  });
});
