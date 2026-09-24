import { afterEach, describe, expect, it } from "vitest";

/* =========================================================
   The candidate list is this app's retry policy

   Measured on production 2026-09-24 through
   /api/diagnostics/gemini?models=, four rounds:

     gemini-3.6-flash           4/4   746, 955, 1094, 1260 ms
     gemini-flash-lite-latest   4/4   619, 664, 2993, 5571 ms
     gemini-3.5-flash-lite      2/3   583, 583 ms — one 504 at 11101 ms
     gemini-3.7-flash           1/2   4422 ms    — one 503 at   762 ms
     gemini-3.8-flash           0/1              — 503 at   666 ms

   What those numbers decide is not which model is best. It is which
   failure is affordable: every refusal above comes back inside a second,
   and there is exactly one expensive failure in the set — the hang. So the
   list goes three deep and the model that hangs goes last.
   ========================================================= */

const KEYS = [
  "GEMINI_TEXT_MODEL",
  "GEMINI_VISION_MODEL",
  "GEMINI_MENU_MODEL",
  "GEMINI_MODEL",
  "GEMINI_FALLBACK_MODEL",
] as const;

const saved = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));

function clearOverrides() {
  for (const key of KEYS) delete process.env[key];
}

afterEach(() => {
  for (const key of KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

const {
  DEFAULT_ALIAS_LITE_MODEL,
  DEFAULT_FAST_MODEL,
  DEFAULT_STRONG_MODEL,
  getMenuModelCandidates,
  getTextModelCandidates,
  getVisionModelCandidates,
} = await import("@/lib/ai/modelConfig");

describe("who gets asked, and in what order", () => {
  it("leads with the model that answered every time", () => {
    clearOverrides();

    for (const candidates of [getTextModelCandidates(), getVisionModelCandidates()]) {
      expect(candidates[0]).toBe(DEFAULT_STRONG_MODEL);
    }
  });

  /*
   * The one that hangs goes last. It used to be second, which on a free
   * tier — where the first entry runs out of its twenty requests a minute
   * regularly — is the same as having no fallback at all.
   */
  it("puts the model that hangs behind the one that does not", () => {
    clearOverrides();

    for (const candidates of [
      getTextModelCandidates(),
      getVisionModelCandidates(),
      getMenuModelCandidates(),
    ]) {
      expect(candidates).toHaveLength(3);
      expect(candidates.indexOf(DEFAULT_ALIAS_LITE_MODEL)).toBeLessThan(
        candidates.indexOf(DEFAULT_FAST_MODEL),
      );
    }
  });

  /*
   * Four pinned names went stale or quiet between 18 and 23 September. An
   * alias cannot: Google repoints it. Every list keeps one.
   */
  it("keeps one entry in every list that cannot go stale", () => {
    clearOverrides();

    expect(DEFAULT_ALIAS_LITE_MODEL).toMatch(/-latest$/);
    for (const candidates of [
      getTextModelCandidates(),
      getVisionModelCandidates(),
      getMenuModelCandidates(),
    ]) {
      expect(candidates).toContain(DEFAULT_ALIAS_LITE_MODEL);
    }
  });

  it("lets the environment lead without losing the rest of the chain", () => {
    clearOverrides();
    process.env.GEMINI_TEXT_MODEL = "gemini-experimental";

    const candidates = getTextModelCandidates();
    expect(candidates[0]).toBe("gemini-experimental");
    expect(candidates).toContain(DEFAULT_STRONG_MODEL);
    expect(candidates).toContain(DEFAULT_ALIAS_LITE_MODEL);
  });

  /*
   * An empty variable is how the two that pinned a dead model were retired
   * on 2026-09-24 — Vercel has no delete in this tooling, so they were
   * cleared. An empty string must therefore mean "not set", not "".
   */
  it("treats a cleared variable as absent", () => {
    clearOverrides();
    process.env.GEMINI_TEXT_MODEL = "";
    process.env.GEMINI_MODEL = "   ";

    expect(getTextModelCandidates()[0]).toBe(DEFAULT_STRONG_MODEL);
    expect(getTextModelCandidates()).toHaveLength(3);
  });

  it("never asks the same model twice", () => {
    clearOverrides();
    process.env.GEMINI_TEXT_MODEL = DEFAULT_FAST_MODEL;

    const candidates = getTextModelCandidates();
    expect(new Set(candidates).size).toBe(candidates.length);
  });
});
