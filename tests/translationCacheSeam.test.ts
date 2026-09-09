import { beforeEach, describe, expect, it, vi } from "vitest";

/* =========================================================
   The seam the daily allowance is charged at

   /api/text-translate reaches Gemini only for phrases the cache cannot
   answer, and that distinction is the whole basis of counting it: this route
   is called by rendering rather than by anybody pressing anything, so a
   screen of already-seen cards must cost nothing. Charge per request and
   opening a conversation twice spends two of the reader's day.

   translateTexts() used to do both halves behind one call, which left the
   route no place to put the charge. These are the two halves.
   ========================================================= */

const cache = vi.hoisted(() => ({
  rows: [] as Array<{ source_text: string; text: string }>,
  written: [] as unknown[],
}));

const model = vi.hoisted(() => ({ calls: 0 }));

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            in: () => Promise.resolve({ data: cache.rows, error: null }),
          }),
        }),
      }),
      upsert: (rows: unknown) => {
        cache.written.push(rows);
        return Promise.resolve({ error: null });
      },
    }),
  }),
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    interactions = {
      create: async () => {
        model.calls += 1;

        return {
          output_text: JSON.stringify({
            items: [{ source: "海鮮燉飯", text: "seafood risotto" }],
          }),
        };
      },
    };
  },
}));

const { readCachedTranslations, translateMissing } = await import(
  "@/lib/translation/textSource"
);

beforeEach(() => {
  cache.rows = [];
  cache.written = [];
  model.calls = 0;
  process.env.GEMINI_API_KEY = "test-key";
});

describe("readCachedTranslations", () => {
  it("costs nothing but a query, whatever it finds", async () => {
    cache.rows = [{ source_text: "海鮮燉飯", text: "seafood risotto" }];

    const { found, missing } = await readCachedTranslations(
      ["海鮮燉飯"],
      "zh-TW",
      "en",
    );

    expect(found.get("海鮮燉飯")).toBe("seafood risotto");
    expect(missing).toEqual([]);

    // The point of the split: a screen the cache answers in full never
    // reaches the model, so there is nothing to charge the reader for.
    expect(model.calls).toBe(0);
  });

  it("names what the cache could not answer", async () => {
    cache.rows = [{ source_text: "海鮮燉飯", text: "seafood risotto" }];

    const { found, missing } = await readCachedTranslations(
      ["海鮮燉飯", "牛肉麵"],
      "zh-TW",
      "en",
    );

    expect([...found.keys()]).toEqual(["海鮮燉飯"]);
    expect(missing).toEqual(["牛肉麵"]);
    expect(model.calls).toBe(0);
  });

  it("asks for nothing when the two languages are the same", async () => {
    const { found, missing } = await readCachedTranslations(
      ["risotto"],
      "en",
      "en",
    );

    expect(found.size).toBe(0);
    expect(missing).toEqual([]);
  });

  it("trims and deduplicates before deciding what is missing", async () => {
    const { missing } = await readCachedTranslations(
      ["牛肉麵", " 牛肉麵 ", "", "   "],
      "zh-TW",
      "en",
    );

    expect(missing).toEqual(["牛肉麵"]);
  });
});

describe("translateMissing", () => {
  it("does not reach the model when there is nothing to ask", async () => {
    const fresh = await translateMissing([], "zh-TW", "en");

    expect(fresh.size).toBe(0);
    expect(model.calls).toBe(0);
  });

  it("asks once for what is left, and caches the answer", async () => {
    const fresh = await translateMissing(["海鮮燉飯"], "zh-TW", "en");

    expect(model.calls).toBe(1);
    expect(fresh.get("海鮮燉飯")).toBe("seafood risotto");
    expect(cache.written).toHaveLength(1);
  });

  it("leaves out a phrase the model did not answer", async () => {
    /*
     * Absent, not blank. "We could not ask" and "there is no translation" are
     * different answers, and the caller charges — and refunds — on that
     * difference.
     */
    const fresh = await translateMissing(["海鮮燉飯", "牛肉麵"], "zh-TW", "en");

    expect(fresh.has("海鮮燉飯")).toBe(true);
    expect(fresh.has("牛肉麵")).toBe(false);
  });
});
