import { describe, expect, it } from "vitest";

import { articlesPerBatch } from "@/lib/dailyNews";
import { LANGUAGE_CODES } from "@/lib/languages";

/*
 * The cron runs on Vercel's Hobby plan, where sixty seconds is a hard
 * ceiling. Every extra language multiplies what one Gemini call has to
 * write, so the batch shrinks to keep the output per request where it was.
 */

describe("articlesPerBatch", () => {
  it("leaves the original pair on the batch size it was tuned for", () => {
    expect(articlesPerBatch(2)).toBe(6);
  });

  it("shrinks as the pool covers more languages", () => {
    expect(articlesPerBatch(3)).toBeLessThan(articlesPerBatch(2));
    expect(articlesPerBatch(5)).toBeLessThan(articlesPerBatch(3));
  });

  it("keeps the output per request roughly flat", () => {
    const budget = articlesPerBatch(2) * 2;

    for (let languages = 2; languages <= LANGUAGE_CODES.length; languages += 1) {
      const work = articlesPerBatch(languages) * languages;

      // Rounding means it cannot land exactly on the budget every time; what
      // matters is that it never drifts into a request several times the size
      // of the one that was measured against the timeout.
      expect(work).toBeLessThanOrEqual(budget * 1.5);
    }
  });

  it("never asks for a batch of one", () => {
    // A single-article batch loses the shared context that makes the model's
    // vocabulary picks differ from card to card.
    expect(articlesPerBatch(99)).toBeGreaterThanOrEqual(2);
  });
});
