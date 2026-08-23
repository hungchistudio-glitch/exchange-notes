import { beforeEach, describe, expect, it, vi } from "vitest";

import { LANGUAGE_CODES, getLearningLanguages } from "@/lib/languages";

/*
 * Which languages a day's cards get written in.
 *
 * The pool is generated once and cannot be asked again on demand, so a
 * language that shows up the day *after* the reader switched to it is a
 * language that was missing on the only day it mattered.
 */

const profiles = vi.hoisted(() => ({
  rows: [] as Array<{ learning_language: string; native_language: string }>,
}));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: () => ({
      select: () => ({
        not: () => Promise.resolve({ data: profiles.rows, error: null }),
      }),
    }),
  }),
}));

const { getDailyNewsLanguages } = await import("@/lib/news/languagesInUse");

describe("getDailyNewsLanguages", () => {
  beforeEach(() => {
    profiles.rows = [];
  });

  it("puts the default pair first, whatever the accounts say", async () => {
    profiles.rows = [{ learning_language: "es", native_language: "es" }];

    const languages = await getDailyNewsLanguages();

    expect(languages.slice(0, 2)).toEqual(["en", "zh-TW"]);
  });

  it("covers a language somebody is actually learning", async () => {
    profiles.rows = [{ learning_language: "fr", native_language: "zh-TW" }];

    expect(await getDailyNewsLanguages()).toContain("fr");
  });

  it("speaks a language before anybody has switched to it", async () => {
    // The gap this closes: three languages in use left two of the five slots
    // empty, so a reader who moved to Italian today opened a feed that had
    // never been asked to write any.
    profiles.rows = [{ learning_language: "fr", native_language: "zh-TW" }];

    const languages = await getDailyNewsLanguages();

    for (const meta of getLearningLanguages()) {
      expect(languages, meta.code).toContain(meta.code);
    }
  });

  it("still ranks accounts above languages merely on offer", async () => {
    profiles.rows = [
      { learning_language: "it", native_language: "it" },
      { learning_language: "it", native_language: "it" },
    ];

    const languages = await getDailyNewsLanguages();

    // Italian is used twice over and English/Chinese are forced in, so it
    // takes the first free slot rather than queueing behind Spanish.
    expect(languages[2]).toBe("it");
  });

  it("never asks for more languages than there are", async () => {
    profiles.rows = LANGUAGE_CODES.map((code) => ({
      learning_language: code,
      native_language: code,
    }));

    const languages = await getDailyNewsLanguages();

    expect(languages.length).toBeLessThanOrEqual(LANGUAGE_CODES.length);
    expect(new Set(languages).size).toBe(languages.length);
  });

  it("falls back to the default pair when the accounts cannot be read", async () => {
    vi.resetModules();
    vi.doMock("@/lib/supabase/service", () => ({
      createServiceClient: () => {
        throw new Error("no database today");
      },
    }));

    const { getDailyNewsLanguages: withoutDatabase } = await import(
      "@/lib/news/languagesInUse"
    );

    expect(await withoutDatabase()).toEqual(["en", "zh-TW"]);

    vi.doUnmock("@/lib/supabase/service");
    vi.resetModules();
  });
});
