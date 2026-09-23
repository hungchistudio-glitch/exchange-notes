import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getVisionModelCandidates } from "@/lib/ai/modelConfig";
import { MIN_MODEL_DEADLINE_MS } from "@/lib/ai/modelRequest";

/*
 * Asked of the configuration rather than written out.
 *
 * These lines used to name the two models, and the names are the one thing
 * here that is meant to change: the order they are tried in is a measurement
 * of which is answering this week, not a design decision. A test that pins
 * the names fails every time that measurement is acted on, which teaches the
 * next person to edit the test rather than read it. What is worth holding is
 * that the first candidate is tried first and the second is the fallback.
 */
const [FIRST_CANDIDATE, SECOND_CANDIDATE] = getVisionModelCandidates();

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
type SentPart = { text?: string; inlineData?: { data?: string; mimeType?: string } };
const made: Array<{
  model: string;
  timeout: number;
  parts: SentPart[];
}> = [];
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

/*
 * The standard endpoint, mocked at the shape the app now sends: contents
 * with parts, a config carrying the ceiling, and `text` on the response.
 */
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = {
      generateContent: async (params: {
        model: string;
        contents: Array<{ parts: SentPart[] }>;
        config: { httpOptions: { timeout: number } };
      }) => {
        made.push({
          model: params.model,
          timeout: params.config.httpOptions.timeout,
          parts: params.contents[0].parts,
        });

        const step = script.shift();
        if (!step) throw new Error("An unscripted attempt was made.");

        clock += step.elapsed;

        if (step.outcome === "timeout") {
          /*
           * A 504, which this app now treats exactly like a rate limit for
           * cooldown purposes — a model that spent the whole ceiling saying
           * nothing is the expensive failure, not the cheap one. That
           * cooldown outlives a single case, which is what the clock in
           * beforeEach is for.
           */
          throw Object.assign(new Error("Request timed out."), { status: 504 });
        }

        return { text: answer(step.outcome.confidence) };
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
  /*
   * Forward, never back. Cooldowns live in module state that outlives a
   * case, so a clock reset to zero left every later case looking at a
   * candidate list still cooling from the case before it. Ten minutes is
   * longer than any cooldown this app sets.
   */
  clock += 10 * 60_000;
  script.length = 0;
  made.length = 0;
  vi.stubEnv("GEMINI_API_KEY", "test-key");
  vi.spyOn(Date, "now").mockImplementation(() => clock);
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("the request that is actually sent", () => {
  /*
   * This is the test that was missing, and the bug it would have caught cost
   * a day: the image part went out with no `mime_type`. `mediaType` was
   * threaded the whole way down to the call as a parameter nothing read, so
   * every recognition got a 400 from the API — and nobody saw it, because
   * the model in front of it was burning the whole budget timing out before
   * the API could object. The part carries both together now, so it cannot
   * come apart again without failing to compile.
   *
   * Every other test in this file asserts on timing. None of them looked at
   * what was in the envelope.
   */
  it("declares the image's media type", async () => {
    script.push({ elapsed: 3_000, outcome: { confidence: "high" } });

    await expect(identify()).resolves.toMatchObject({ term: "lamp" });

    const image = made[0].parts.find((part) => part.inlineData);
    expect(image).toBeDefined();
    expect(image?.inlineData?.mimeType).toBe("image/webp");
    expect(image?.inlineData?.data).toBeTruthy();
  });
});

describe("a photograph the first model reads confidently", () => {
  it("costs one attempt and nothing more", async () => {
    script.push({ elapsed: 4_000, outcome: { confidence: "high" } });

    await expect(identify()).resolves.toMatchObject({ term: "lamp" });
    expect(made).toHaveLength(1);
    /* The fast model, whichever it currently is. Naming the string here is
       how the app ended up with a dead model in six places: the test passed
       because it asserted the same stale name the code had. */
    expect(made[0].model).toBe(FIRST_CANDIDATE);
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
     *
     * Eight is what binds the attempt; ten is what is written on it. The
     * number recorded here is `httpOptions.timeout`, which does not stay in
     * this process — Gemini reads it as the request's deadline and refuses
     * one under ten seconds, which is how the fallback model in this app
     * spent a week answering 400 in a tenth of a second and never once being
     * asked anything (see MIN_MODEL_DEADLINE_MS). The eight seconds are
     * still real and still enforced, by the abort rather than by this.
     */
    script.push({ elapsed: 12_000, outcome: "timeout" });
    script.push({ elapsed: 5_000, outcome: { confidence: "high" } });

    await expect(identify()).resolves.toMatchObject({ term: "lamp" });

    expect(made.map((attempt) => attempt.timeout)).toEqual([
      12_000,
      MIN_MODEL_DEADLINE_MS,
    ]);
    expect(made[1].model).toBe(SECOND_CANDIDATE);
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

describe("a model that timed out on the last photograph", () => {
  /*
   * The camera's half of the bug the text route found first. This loop put a
   * model away for a rate limit and not for a timeout, so the candidate that
   * had just spent twelve seconds saying nothing was first in the queue for
   * the very next photograph, and the one after that. Every shot paid the
   * full ceiling to learn something already known.
   */
  it("is not asked again on the next one", async () => {
    script.push({ elapsed: 12_000, outcome: "timeout" });
    script.push({ elapsed: 3_000, outcome: { confidence: "high" } });

    await expect(identify()).resolves.toMatchObject({ term: "lamp" });
    expect(made.map((attempt) => attempt.model)).toEqual([
      FIRST_CANDIDATE,
      SECOND_CANDIDATE,
    ]);

    made.length = 0;
    script.push({ elapsed: 3_000, outcome: { confidence: "high" } });

    await expect(identify()).resolves.toMatchObject({ term: "lamp" });
    expect(made.map((attempt) => attempt.model)).toEqual([SECOND_CANDIDATE]);
  });
});
