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
      //
      // Six and seven languages (Japanese and Korean, 2026-11-16) cannot keep
      // both promises: three articles a batch is the floor that keeps the
      // night under the free tier's request allowance (below), and three
      // articles in seven languages is 21 article-languages, not 18. The
      // allowance wins, because the free tier refuses outright while a slow
      // request is bounded by BATCH_DEADLINE_MS and retried by the next
      // half-hourly catch-up. The pool only covers languages someone uses,
      // so this is reached only once readers study all seven.
      const allowance = languages <= 5 ? 1.5 : 1.75;
      expect(work).toBeLessThanOrEqual(budget * allowance);
    }
  });

  it("keeps twelve articles under the free tier's request allowance", () => {
    /*
     * The regression this exists for. NEWS_SLOTS produces twelve articles a
     * day. At two languages that was two requests. At five the batch shrank
     * to two articles and it became six — and Gemini's free tier answered
     * with 429s naming a limit of five, losing three batches on 09-10 and
     * every batch on several days before it.
     *
     * Six is the number that must not come back, whatever the language count.
     */
    const ARTICLES_PER_DAY = 12;

    for (let languages = 2; languages <= LANGUAGE_CODES.length; languages += 1) {
      const requests = Math.ceil(ARTICLES_PER_DAY / articlesPerBatch(languages));
      expect(requests).toBeLessThanOrEqual(4);
    }
  });

  it("never asks for a batch of one", () => {
    // A single-article batch loses the shared context that makes the model's
    // vocabulary picks differ from card to card.
    expect(articlesPerBatch(99)).toBeGreaterThanOrEqual(2);
  });
});
