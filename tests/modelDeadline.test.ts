import { beforeEach, describe, expect, it, vi } from "vitest";

/* =========================================================
   The deadline that leaves the process, and the one that does not

   `httpOptions.timeout` is not a local stopwatch. The SDK sends it on to
   Gemini as the request's deadline, and Gemini refuses one under ten
   seconds outright:

     400 {"error":{"code":400,"message":"Manually set deadline 7s is too
      short. Minimum allowed deadline is 10s.","status":"INVALID_ARGUMENT"}}

   Measured on production 2026-09-23, /api/classify-text, 124ms. A candidate
   list hands each attempt whatever is left of the total budget, so the
   second candidate is nearly always under ten seconds — which meant the
   fallback model in this app was never once asked a question it was allowed
   to answer, however healthy it was.

   The floor belongs on the number that leaves the process. The ceiling that
   binds the attempt stays local, on the abort.
   ========================================================= */

type SentConfig = {
  httpOptions: { timeout: number; retryOptions: { attempts: number } };
  abortSignal: AbortSignal;
};

const sent: Array<{ model: string; config: SentConfig }> = [];

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = {
      generateContent: async (params: { model: string; config: SentConfig }) => {
        sent.push(params);
        return { text: '{"ok":true}' };
      },
    };
  },
}));

const { GoogleGenAI } = await import("@google/genai");
const {
  generateJson,
  isTimeoutError,
  shouldCoolDown,
  cooldownMsFor,
  MIN_MODEL_DEADLINE_MS,
  MODEL_COOLDOWN_MS,
} = await import("@/lib/ai/modelRequest");

function ask(timeoutMs: number) {
  return generateJson(new GoogleGenAI({ apiKey: "test" }), {
    model: "gemini-3.6-flash",
    input: "anything",
    timeoutMs,
  });
}

beforeEach(() => {
  sent.length = 0;
});

describe("the deadline sent to Gemini", () => {
  it("never goes below the minimum this endpoint accepts", async () => {
    await ask(6_521);

    expect(sent[0].config.httpOptions.timeout).toBe(MIN_MODEL_DEADLINE_MS);
    expect(MIN_MODEL_DEADLINE_MS).toBe(10_000);
  });

  /*
   * Real timers, and a real second of waiting. `AbortSignal.timeout` is a
   * platform timer rather than a `setTimeout`, so vitest's fake clock does
   * not move it — and the thing worth asserting here is precisely that this
   * signal is not the deadline that was raised to the floor.
   */
  it("still aborts at the caller's own budget, floor or no floor", async () => {
    await ask(1_000);
    const { abortSignal, httpOptions } = sent[0].config;

    expect(httpOptions.timeout).toBe(MIN_MODEL_DEADLINE_MS);
    expect(abortSignal.aborted).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, 1_200));
    expect(abortSignal.aborted).toBe(true);
  });

  it("passes a budget above the floor through untouched", async () => {
    await ask(14_000);
    expect(sent[0].config.httpOptions.timeout).toBe(14_000);
  });
});

describe("a model that spent the budget and said nothing", () => {
  /*
   * The 504 arrives as an ordinary API error and the client never aborts, so
   * nothing in the old text match fired and the model was asked again on the
   * very next request — fourteen seconds each time, for an answer already
   * known.
   */
  const deadlineExceeded = Object.assign(
    new Error("Deadline expired before operation could complete."),
    { status: 504 },
  );

  it("counts Gemini's own deadline failure as a timeout", () => {
    expect(isTimeoutError(deadlineExceeded)).toBe(true);
  });

  it("puts that model into cooldown", () => {
    expect(shouldCoolDown(deadlineExceeded)).toBe(true);
  });

  it("recognises the status even when the wording changes", () => {
    expect(isTimeoutError(Object.assign(new Error("upstream"), { status: 504 })))
      .toBe(true);
    expect(isTimeoutError(new Error("DEADLINE_EXCEEDED"))).toBe(true);
  });

  it("leaves an ordinary rejection alone", () => {
    expect(
      isTimeoutError(Object.assign(new Error("bad request"), { status: 400 })),
    ).toBe(false);
  });
});

describe("how long to stop asking", () => {
  /*
   * A Gemini 429 says so itself, and until now nobody read it:
   *
   *   * Quota exceeded for metric:
   *     generativelanguage.googleapis.com/generate_content_free_tier_requests,
   *     limit: 20, model: gemini-3.6-flash
   *   Please retry in 18.829367833s.
   *
   * Measured on production 2026-09-23. Sixty-five seconds on a nineteen
   * second window is forty-six seconds of the slower model for nothing.
   */
  const quota = new Error(
    "You exceeded your current quota. * Quota exceeded for metric: " +
      "generativelanguage.googleapis.com/generate_content_free_tier_requests, " +
      "limit: 20, model: gemini-3.6-flash\nPlease retry in 18.829367833s.",
  );

  it("takes the window the refusal names, plus a second of slack", () => {
    expect(cooldownMsFor(quota)).toBe(19_830);
  });

  it("falls back to the flat default when nothing is named", () => {
    expect(cooldownMsFor(new Error("You exceeded your current quota."))).toBe(
      MODEL_COOLDOWN_MS,
    );
    expect(cooldownMsFor(undefined)).toBe(MODEL_COOLDOWN_MS);
  });

  it("can only shorten a cooldown, never extend one", () => {
    expect(cooldownMsFor(new Error("Please retry in 600s."))).toBe(
      MODEL_COOLDOWN_MS,
    );
    expect(cooldownMsFor(new Error("Please retry in 0s."))).toBe(
      MODEL_COOLDOWN_MS,
    );
  });
});
