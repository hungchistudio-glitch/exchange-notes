import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* =========================================================
   The recognition has a budget, and the fallback has to fit inside it

   This route used to give each model attempt eight seconds and try two
   models, while the browser aborted the whole request at sixteen. Written
   out, that arithmetic says the second model could never deliver an answer
   to anybody: if the first one timed out there were zero seconds left, and
   the browser gave up at exactly the moment the fallback would have spoken.
   All it could do was hold the request open — after the reader's daily
   allowance had already been charged for it.

   A low-confidence first answer had the same shape. It is kept, the stronger
   model is tried, and six seconds plus eight put that reader past the abort
   too — so a usable answer already in hand was thrown away for one that
   arrived after nobody was listening.

   These cases are about arithmetic, so time here is a number this file
   controls rather than something to wait for. Each scripted attempt says how
   long it took and how it ended, and the assertions are on which attempts
   were made at all and what deadline each was given.
   ========================================================= */

type Attempt = {
  elapsed: number;
  outcome: "timeout" | { confidence: "high" | "low" };
};

const script: Attempt[] = [];
const made: Array<{ model: string; timeout: number }> = [];
let clock = 0;

function answer(confidence: "high" | "low") {
  return JSON.stringify({
    term: "lamp",
    translation: "檯燈",
    termLanguage: "en",
    translationLanguage: "zh-TW",
    partOfSpeech: "noun",
    termExample: "The lamp is on the desk.",
    translationExample: "檯燈在書桌上。",
    confidence,
  });
}

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    interactions = {
      create: async (
        body: { model: string },
        options: { timeout: number },
      ) => {
        made.push({ model: body.model, timeout: options.timeout });

        const step = script.shift();
        if (!step) throw new Error("An unscripted attempt was made.");

        clock += step.elapsed;

        if (step.outcome === "timeout") {
          // Deliberately not a 429: a rate limit would put the model on a
          // cooldown that outlives the test.
          throw Object.assign(new Error("Request timed out."), { status: 504 });
        }

        return { output_text: answer(step.outcome.confidence) };
      },
    };
  },
}));

const { identifyObject, ObjectIdentificationUnavailableError } = await import(
  "@/lib/ai/identifyObject"
);

const PAIR = ["en", "zh-TW"] as const;

/** A distinct image per case: the module caches answers by image bytes. */
let imageCounter = 0;
function freshImage() {
  imageCounter += 1;
  return `aaaaaaaa${imageCounter}`;
}

function identify() {
  return identifyObject(freshImage(), "image/webp", PAIR);
}

beforeEach(() => {
  clock = 0;
  script.length = 0;
  made.length = 0;
  vi.stubEnv("GEMINI_API_KEY", "test-key");
  vi.spyOn(Date, "now").mockImplementation(() => clock);
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("a photograph the first model reads confidently", () => {
  it("costs one attempt and nothing more", async () => {
    script.push({ elapsed: 4_000, outcome: { confidence: "high" } });

    await expect(identify()).resolves.toMatchObject({ term: "lamp" });
    expect(made).toHaveLength(1);
    expect(made[0].model).toBe("gemini-3.1-flash-lite");
  });

  it("gives that attempt the per-attempt timeout, not the whole budget", async () => {
    script.push({ elapsed: 4_000, outcome: { confidence: "high" } });

    await identify();

    expect(made[0].timeout).toBe(12_000);
  });
});

describe("a first attempt that times out", () => {
  it("still tries the fallback, inside what is left of the budget", async () => {
    /*
     * Twelve seconds spent of twenty. The fallback is worth starting and gets
     * the eight that remain — under the old numbers it was handed a fresh
     * eight seconds the reader had already stopped waiting for.
     */
    script.push({ elapsed: 12_000, outcome: "timeout" });
    script.push({ elapsed: 5_000, outcome: { confidence: "high" } });

    await expect(identify()).resolves.toMatchObject({ term: "lamp" });

    expect(made.map((attempt) => attempt.timeout)).toEqual([12_000, 8_000]);
    expect(made[1].model).toBe("gemini-3.5-flash");
  });

  it("does not start a fallback there is no time to finish", async () => {
    // Seventeen of twenty spent. Three seconds buys a certain second failure.
    script.push({ elapsed: 17_000, outcome: "timeout" });

    await expect(identify()).rejects.toBeInstanceOf(
      ObjectIdentificationUnavailableError,
    );
    expect(made).toHaveLength(1);
  });
});

describe("a first answer the model is unsure of", () => {
  it("escalates while there is budget to escalate in", async () => {
    script.push({ elapsed: 5_000, outcome: { confidence: "low" } });
    script.push({ elapsed: 6_000, outcome: { confidence: "high" } });

    await expect(identify()).resolves.toMatchObject({ confidence: "high" });
    expect(made).toHaveLength(2);
  });

  it("keeps the unsure answer rather than spending a budget it has not got", async () => {
    /*
     * The case worth having. Eighteen seconds in there is a usable answer in
     * hand and two seconds left; the old code went to the stronger model
     * anyway and the reader saw a timeout instead of the word.
     */
    script.push({ elapsed: 18_000, outcome: { confidence: "low" } });

    await expect(identify()).resolves.toMatchObject({ confidence: "low" });
    expect(made).toHaveLength(1);
  });
});
